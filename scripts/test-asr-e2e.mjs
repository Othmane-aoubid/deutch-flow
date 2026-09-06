// One-off e2e proof of the live-transcription path: mint a Firebase ID token
// (custom JWT signed with the service account key, exchanged via REST — no
// firebase-admin import, which breaks standalone under CJS/jose), then POST a
// real WAV chunk to /api/asr exactly as the browser's live tap does.
import 'dotenv/config'
import crypto from 'crypto'
import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'child_process'

const b64u = (buf) => Buffer.from(buf).toString('base64url')

function createCustomToken(uid, svcEmail, privateKey) {
  const iat = Math.floor(Date.now() / 1000)
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64u(JSON.stringify({
    iss: svcEmail,
    sub: svcEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat,
    exp: iat + 3600,
    uid,
  }))
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  return `${header}.${claims}.${b64u(signer.sign(privateKey))}`
}

const svcEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\n/g, '\n')
const customToken = createCustomToken('e2e-test-user', svcEmail, privateKey)

// 1) Exchange the custom token for a real ID token.
const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const xRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: customToken, returnSecureToken: true }),
})
const xData = await xRes.json()
if (!xData.idToken) {
  console.log('TOKEN EXCHANGE FAILED:', JSON.stringify(xData).slice(0, 300))
  process.exit(1)
}
console.log('1) ID token minted OK')

// 2) Real speech sample, decoded to a 16 kHz mono WAV (like a live chunk).
const res = await fetch('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav')
const wavIn = Buffer.from(await res.arrayBuffer())
const wav = await new Promise((resolve, reject) => {
  const ff = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-f', 'wav', 'pipe:1'])
  const chunks = []
  let stderr = ''
  ff.stdout.on('data', (c) => chunks.push(c))
  ff.stderr.on('data', (c) => { stderr += c.toString() })
  ff.on('error', reject)
  ff.on('close', (code) => {
    if (code !== 0) return reject(new Error('ffmpeg failed: ' + stderr.slice(0, 160)))
    resolve(Buffer.concat(chunks))
  })
  ff.stdin.on('error', () => { /* early close on short outputs is fine */ })
  ff.stdin.end(wavIn)
})
console.log('2) 6 s WAV chunk ready:', wav.length, 'bytes')

// 3) POST it to the running dev server exactly like the live tap does.
const base = process.argv[2] || 'http://localhost:51872'
const form = new FormData()
form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'chunk.wav')
const t0 = Date.now()
const asrRes = await fetch(`${base}/api/asr`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${xData.idToken}` },
  body: form,
})
const asrData = await asrRes.json()
console.log(`3) POST /api/asr -> ${asrRes.status} in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
console.log('   provider:', asrData.provider)
console.log('   segments:', JSON.stringify(asrData.segments))
if (asrRes.ok && asrData.segments?.length) {
  console.log('LIVE ASR E2E: WORKING')
} else {
  console.log('LIVE ASR E2E: FAILED', JSON.stringify(asrData.attempts || asrData).slice(0, 300))
  process.exit(1)
}
