import { NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { nvidiaChatCompletion, type NvidiaAttempt } from '@/lib/nvidia'
import { geminiGenerate } from '@/lib/gemini'

type ChatMessage = { role: 'system' | 'user'; content: string }

const SYSTEM_PROMPT = `You are a supportive German tutor. Analyze the conversation transcript and return ONLY valid JSON (no markdown fences) with this structure:
{
  "corrections": [{ "original": "incorrect phrase", "corrected": "corrected phrase", "explanation": "brief explanation of the correction" }],
  "vocabulary": [{ "word": "german word", "translation": "english translation", "level": "CEFR level" }],
  "grammarPatterns": [{ "pattern": "grammar pattern", "explanation": "how it works" }],
  "nextSteps": ["specific learning recommendation"]
}`

function extractAnalysis(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // fall through: strip markdown fences and retry
  }
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // not JSON — return null
    }
  }
  return null
}

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const baseUrl = process.env.NVIDIA_BASE_URL
  if (!baseUrl) return NextResponse.json({ error: 'NVIDIA LLM is not configured. Add NVIDIA_BASE_URL and NVIDIA_API_KEY.' }, { status: 503 })

  const { transcript, level = 'A2' } = await request.json()
  if (!transcript || typeof transcript !== 'string') return NextResponse.json({ error: 'Transcript is required.' }, { status: 400 })

  const messages: ChatMessage[] = [
    { role: 'system', content: `${SYSTEM_PROMPT} Target CEFR level: ${level}.` },
    { role: 'user', content: transcript },
  ]

  // Chain: NVIDIA (multi-key, primary + fallback models + kimi-k3) -> Gemini.
  const nvidia = await nvidiaChatCompletion({ messages, temperature: 0.2, maxTokens: 4000 })

  let content = nvidia.content
  let attempts: Array<NvidiaAttempt | { provider: string; ok: boolean; detail?: string }> = nvidia.attempts

  if (!content) {
    const geminiText = await geminiGenerate(
      `Analyze this German conversation transcript for a ${level} level learner. Return ONLY valid JSON with fields: corrections (original/corrected/explanation), vocabulary (word/translation/level), grammarPatterns (pattern/explanation), nextSteps (array of strings).\n\nTranscript:\n${transcript}`,
      SYSTEM_PROMPT
    )
    if (geminiText) {
      content = geminiText
      attempts = [...attempts, { provider: 'gemini', ok: true }]
    } else {
      attempts = [...attempts, { provider: 'gemini', ok: false, detail: 'failed or not configured' }]
    }
  }

  if (!content) {
    return NextResponse.json({ error: 'All analysis providers failed.', attempts }, { status: 502 })
  }

  const analysis = extractAnalysis(content)
  if (!analysis) {
    // LLM did not produce parseable JSON — surface the raw text so nothing is lost.
    return NextResponse.json({ analysis: { rawResponse: content }, raw: content, attempts })
  }
  return NextResponse.json({ analysis, raw: content, attempts })
}
