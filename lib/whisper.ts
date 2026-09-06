'use client'

/**
 * In-browser Whisper transcription via transformers.js (WebAssembly).
 * Runs entirely on the user's device — no API keys, no server, works in any
 * modern browser including embedded panels where hosted speech services and
 * popups are unavailable. The model (~40 MB quantized) is fetched from the
 * Hugging Face hub on first use and cached by the browser afterwards.
 */

let pipelinePromise: Promise<any> | null = null

const MODEL_ID = 'Xenova/whisper-small'
// Loaded at runtime from a CDN rather than bundled: the library's environment
// detection crashes under dev bundlers (Turbopack), while the browser ESM
// build works everywhere. Version pinned for cache stability.
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'

function loadTransformers(): Promise<any> {
  // Indirect eval-style dynamic import so bundlers don't try to resolve the URL.
  const runtimeImport = new Function('url', 'return import(url)') as (url: string) => Promise<any>
  return runtimeImport(TRANSFORMERS_CDN)
}

async function getTranscriber(onProgress?: (message: string) => void) {
  if (!pipelinePromise) {
    const { pipeline, env } = await loadTransformers()
    // Always fetch from the HF hub; the browser caches the downloaded files.
    env.allowLocalModels = false
    pipelinePromise = pipeline('automatic-speech-recognition', MODEL_ID, {
      quantized: true,
      progress_callback: (p: any) => {
        if (p?.status === 'progress' && typeof p?.file === 'string' && p.file.endsWith('.onnx')) {
          const pct = typeof p.progress === 'number' ? Math.round(p.progress) : 0
          onProgress?.(`Loading in-browser speech model… ${pct}%`)
        }
      },
    })
  }
  return pipelinePromise
}

/**
 * Decode the recorded webm/opus blob to 16 kHz mono Float32 PCM using the
 * Web Audio API — Whisper expects raw samples, not a compressed container.
 */
async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer)
    // Mix down to mono.
    const channelData = decoded.numberOfChannels > 1
      ? (() => {
          const out = new Float32Array(decoded.length)
          for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
            const data = decoded.getChannelData(ch)
            for (let i = 0; i < decoded.length; i++) out[i] += data[i] / decoded.numberOfChannels
          }
          return out
        })()
      : Float32Array.from(decoded.getChannelData(0))
    // Resample to 16 kHz with an OfflineAudioContext.
    const targetRate = 16000
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetRate), targetRate)
    const buffer = offline.createBuffer(1, channelData.length, decoded.sampleRate)
    buffer.copyToChannel(channelData, 0)
    const source = offline.createBufferSource()
    source.buffer = buffer
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return Float32Array.from(rendered.getChannelData(0))
  } finally {
    void ctx.close()
  }
}

/** Filter Whisper hallucinations on silence ("[Pause]", "[Musik]" runs…). */
function isHallucination(text: string): boolean {
  const stripped = text.replace(/[\[(][^\])]{0,30}[\])]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!stripped) return true
  const t = stripped.toLowerCase().replace(/[.!,?]+$/, '')
  return ['thank you', 'thanks for watching', 'thank you very much', 'you', 'please subscribe'].includes(t)
}

export function isWhisperSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).AudioContext !== 'undefined' &&
    typeof (window as any).OfflineAudioContext !== 'undefined'
  )
}

export async function transcribeInBrowser(
  audioBlob: Blob,
  onProgress?: (message: string) => void,
): Promise<WhisperResult | null> {
  if (typeof window === 'undefined' || !isWhisperSupported()) return null
  try {
    const transcriber = await getTranscriber(onProgress)
    onProgress?.('Transcribing in your browser…')
    const pcm = await decodeTo16kMono(audioBlob)
    const output: any = await transcriber(pcm, { language: 'de', task: 'transcribe' })
    const text = (Array.isArray(output) ? output[0]?.text : output?.text) ?? ''
    const cleaned = String(text).trim()
    if (isHallucination(cleaned)) return { text: '' }
    return { text: cleaned }
  } catch (error) {
    console.error('In-browser transcription failed:', error)
    return null
  }
}

export type WhisperResult = { text: string }
