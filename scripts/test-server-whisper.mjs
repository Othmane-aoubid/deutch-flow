// One-off runtime proof of the server Whisper path (same mechanism as lib/server-whisper.ts):
// transformers.js pipeline in Node + ffmpeg-static decode + Xenova/whisper-small.
import { pipeline, env } from '@xenova/transformers'
import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'child_process'

env.allowLocalModels = false
env.cacheDir = './.next/cache/whisper'

console.log('1) Loading whisper-small (downloads ~40MB on first run)…')
const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', { quantized: true })
console.log('   model loaded')

console.log('2) Fetching a real speech sample…')
const res = await fetch('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav')
const wav = Buffer.from(await res.arrayBuffer())
console.log('   sample bytes:', wav.length)

console.log('3) Decoding to 16 kHz mono PCM via ffmpeg-static…')
const pcm = await new Promise((resolve, reject) => {
  const ff = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1'])
  const chunks = []
  let stderr = ''
  ff.stdout.on('data', (c) => chunks.push(c))
  ff.stderr.on('data', (c) => { stderr += c.toString() })
  ff.on('error', reject)
  ff.on('close', (code) => {
    if (code !== 0) return reject(new Error('ffmpeg failed: ' + stderr.slice(0, 200)))
    const raw = Buffer.concat(chunks)
    const samples = new Float32Array(raw.length / 4)
    for (let i = 0; i < samples.length; i++) samples[i] = raw.readFloatLE(i * 4)
    resolve(samples)
  })
  ff.stdin.end(wav)
})
console.log('   samples:', pcm.length, '=', (pcm.length / 16000).toFixed(1) + 's')

console.log('4) Transcribing…')
const t0 = Date.now()
const out = await asr(pcm, { language: 'en', task: 'transcribe' })
const text = Array.isArray(out) ? out[0]?.text : out?.text
console.log('   RESULT (' + ((Date.now() - t0) / 1000).toFixed(1) + 's):', JSON.stringify(text))
if (text && String(text).trim().length > 10) {
  console.log('SERVER WHISPER: WORKING')
} else {
  console.log('SERVER WHISPER: EMPTY RESULT')
  process.exit(1)
}
