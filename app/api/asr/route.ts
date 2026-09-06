import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { isGeminiSkipped, isGeminiKeyUsable } from '@/lib/gemini'
import { isServerWhisperConfigured, transcribeServerWhisper } from '@/lib/server-whisper'

export const maxDuration = 60

type Attempt = { provider: string; ok: boolean; detail?: string }

const TRANSCRIBE_PROMPT =
  'Transcribe this audio verbatim in its original spoken language (expected: German). Return ONLY the raw transcript text — no labels, no commentary, no quotation marks. If no speech is present, return exactly: NO_SPEECH'

async function transcribeWithGemini(audio: File, apiKey: string): Promise<string> {
  const buffer = Buffer.from(await audio.arrayBuffer())
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent([
    { text: TRANSCRIBE_PROMPT },
    { inlineData: { mimeType: audio.type || 'audio/webm', data: buffer.toString('base64') } },
  ])
  const text = result.response.text().trim()
  if (!text || text === 'NO_SPEECH') return ''
  return text
}

// NVIDIA ASR runs on a self-hosted NIM container exposing an OpenAI-style
// transcription endpoint (there is no hosted NVIDIA transcription API).
// Enabled whenever NVIDIA_ASR_URL points at such a deployment.
async function transcribeWithNvidia(audio: File, baseUrl: string, apiKey: string): Promise<string> {
  const form = new FormData()
  form.append('file', audio, 'audio.webm')
  form.append('language', 'de')
  const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    throw new Error(`HTTP ${upstream.status}${detail ? `: ${detail.slice(0, 140)}` : ''}`)
  }
  const result = await upstream.json()
  const text = typeof result.text === 'string' ? result.text.trim() : ''
  return text === 'NO_SPEECH' ? '' : text
}

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const formData = await request.formData()
  const audio = formData.get('audio')
  if (!(audio instanceof File)) return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 })

  // Provider chain: first success wins, every failure is recorded.
  const geminiKey = process.env.GEMINI_API_KEY
  const geminiUsable = isGeminiKeyUsable()
  const geminiSkipped = isGeminiSkipped()
  const nvidiaAsrUrl = process.env.NVIDIA_ASR_URL
  const nvidiaKey = process.env.NVIDIA_API_KEY

  const providers: Array<{ name: string; enabled: boolean; run: () => Promise<string> }> = [
    {
      name: 'gemini',
      // Skip while the key is known-bad or malformed to avoid a doomed call each recording.
      enabled: Boolean(geminiKey) && geminiUsable && !geminiSkipped,
      run: () => transcribeWithGemini(audio, geminiKey!),
    },
    {
      name: 'nvidia-nim',
      enabled: Boolean(nvidiaAsrUrl && nvidiaKey),
      run: () => transcribeWithNvidia(audio, nvidiaAsrUrl!, nvidiaKey!),
    },
    {
      name: 'server-whisper',
      // Self-hosted on this machine — no keys, always available.
      enabled: isServerWhisperConfigured(),
      run: async () => {
        const buffer = Buffer.from(await audio.arrayBuffer())
        return transcribeServerWhisper(buffer, 'de')
      },
    },
  ]

  const attempts: Attempt[] = []
  for (const provider of providers) {
    if (!provider.enabled) {
      attempts.push({
        provider: provider.name,
        ok: false,
        detail:
          provider.name === 'gemini' && geminiKey && !geminiUsable
            ? 'skipped (GEMINI_API_KEY is not a valid Google key — get one at aistudio.google.com)'
            : geminiSkipped && provider.name === 'gemini'
              ? 'skipped (key known invalid — fix GEMINI_API_KEY)'
              : 'not configured',
      })
      continue
    }
    try {
      const text = await provider.run()
      attempts.push({ provider: provider.name, ok: true })
      return NextResponse.json({ segments: text ? [{ text }] : [], provider: provider.name, attempts })
    } catch (error) {
      attempts.push({ provider: provider.name, ok: false, detail: error instanceof Error ? error.message.slice(0, 200) : 'failed' })
    }
  }

  // All server providers unavailable — this is the expected path when no
  // hosted ASR is configured. The client falls back to browser live captions
  // and in-browser Whisper, so return 200 (not an error) with the attempts.
  return NextResponse.json({ segments: [], attempts, serverAsrAvailable: false })
}
