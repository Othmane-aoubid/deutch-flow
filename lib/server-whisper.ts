/**
 * Server-side Whisper transcription — runs natively in the Next.js Node
 * runtime via transformers.js. No API keys, no external services: the model
 * (~40 MB quantized) downloads once into .next/cache on first use and is
 * reused afterwards. This is the reliable keyless link in the ASR chain.
 *
 * Node-only. Never import from client components.
 */

const MODEL_ID = 'Xenova/whisper-small'

let transcriberPromise: Promise<TranscriberFn> | null = null

type TranscriberFn = (
  audio: Float32Array,
  options: Record<string, unknown>,
) => Promise<Array<{ text?: string }> | { text?: string }>

async function getTranscriber(): Promise<TranscriberFn> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      // Keep the model cache on disk between restarts.
      env.cacheDir = './.next/cache/whisper'
      env.allowLocalModels = false
      const asr = await pipeline('automatic-speech-recognition', MODEL_ID, {
        quantized: true,
      })
      return asr as unknown as TranscriberFn
    })().catch((error) => {
      transcriberPromise = null // allow a retry on the next request
      throw error
    })
  }
  return transcriberPromise
}

/**
 * Decode any recorded audio container (webm/opus from MediaRecorder, mp3,
 * wav, m4a…) into 16 kHz mono Float32 PCM using ffmpeg-static.
 */
async function decodeTo16kMono(buffer: Buffer): Promise<Float32Array> {
  const ffmpegPath = (await import('ffmpeg-static')).default as unknown as string
  const { spawn } = await import('child_process')
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',
      '-ar', '16000', '-ac', '1',
      '-f', 'f32le', '-acodec', 'pcm_f32le',
      'pipe:1',
    ])
    const chunks: Buffer[] = []
    let stderr = ''
    ffmpeg.stdout.on('data', (c: Buffer) => chunks.push(c))
    ffmpeg.stderr.on('data', (c: Buffer) => { stderr += c.toString() })
    ffmpeg.on('error', reject)
    ffmpeg.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed: ${stderr.slice(0, 160)}`))
      const raw = Buffer.concat(chunks)
      const samples = new Float32Array(raw.length / 4)
      for (let i = 0; i < samples.length; i++) samples[i] = raw.readFloatLE(i * 4)
      resolve(samples)
    })
    ffmpeg.stdin.on('error', () => { /* closed early on failure */ })
    ffmpeg.stdin.end(buffer)
  })
}

/**
 * Whisper hallucination filter: on near-silence the model invents filler like
 * "[Pause]", "Thank you.", "Thanks for watching!". Known artifacts (bracketed
 * stage directions and a small blacklist) are dropped; everything else passes.
 */
const HALLUCINATION_BLACKLIST = new Set([
  'thank you.',
  'thanks for watching!',
  'thank you very much.',
  'you',
  'please subscribe',
])

function isHallucination(text: string): boolean {
  // Strip ALL bracketed stage-direction tokens anywhere in the string
  // ("[Pause]", "[Ton]", "[Musik] [Musik]", "(inaudible)" …) — Whisper emits
  // them in runs on silence/noise. Whatever remains decides.
  const stripped = text.replace(/[\[(][^\])]{0,30}[\])]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!stripped) return true
  const t = stripped.toLowerCase()
  return HALLUCINATION_BLACKLIST.has(t.replace(/[.!,?]+$/, ''))
    || HALLUCINATION_BLACKLIST.has(t)
}

export function isServerWhisperConfigured(): boolean {
  return true // self-contained: no keys or external URLs needed
}

/** True while the model files are still downloading/compiling. */
export function isServerWhisperWarming(): boolean {
  return transcriberPromise !== null && (transcriberPromise as any).isFulfilled !== true
}

export async function transcribeServerWhisper(
  audioBuffer: Buffer,
  language: string = 'de',
): Promise<string> {
  const transcriber = await getTranscriber()
  const pcm = await decodeTo16kMono(audioBuffer)
  if (pcm.length < 16000 * 0.2) return '' // shorter than 0.2 s — nothing to say
  let output: Array<{ text?: string }> | { text?: string }
  try {
    output = await transcriber(pcm, { language, task: 'transcribe' })
  } catch {
    // Some builds reject explicit language kwargs; retry with defaults.
    output = await transcriber(pcm, {})
  }
  const text = Array.isArray(output) ? (output[0]?.text ?? '') : (output?.text ?? '')
  const cleaned = String(text).trim()
  if (isHallucination(cleaned)) return ''
  return cleaned
}
