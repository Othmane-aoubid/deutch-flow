import { NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

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

async function requestChat(
  baseUrl: string,
  apiKey: string,
  model: string,
  transcript: string,
  level: string,
  extraBody?: Record<string, unknown>,
): Promise<string | null> {
  const messages: ChatMessage[] = [
    { role: 'system', content: `${SYSTEM_PROMPT} Target CEFR level: ${level}.` },
    { role: 'user', content: transcript },
  ]
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.2, ...extraBody }),
  })
  if (!upstream.ok) return null
  const result = await upstream.json()
  return result.choices?.[0]?.message?.content ?? null
}

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const baseUrl = process.env.NVIDIA_BASE_URL
  const apiKey = process.env.NVIDIA_API_KEY
  const fallbackApiKey = process.env.NVIDIA_API_KEY_FALLBACK
  if (!baseUrl || !apiKey) return NextResponse.json({ error: 'NVIDIA LLM is not configured. Add NVIDIA_BASE_URL and NVIDIA_API_KEY.' }, { status: 503 })

  const { transcript, level = 'A2' } = await request.json()
  if (!transcript || typeof transcript !== 'string') return NextResponse.json({ error: 'Transcript is required.' }, { status: 400 })

  const model = process.env.NVIDIA_LLM_MODEL ?? 'meta/muse-glimmer-30b'
  const fallbackModel = process.env.NVIDIA_LLM_MODEL_FALLBACK ?? 'nvidia/nemotron-3-ultra-550b-a55b'

  try {
    let content = await requestChat(baseUrl, apiKey, model, transcript, level)
    if (!content && fallbackApiKey) {
      content = await requestChat(baseUrl, fallbackApiKey, fallbackModel, transcript, level, {
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: 16384,
      })
    }

    if (!content) return NextResponse.json({ error: 'NVIDIA analysis request failed.' }, { status: 502 })

    const analysis = extractAnalysis(content)
    if (!analysis) {
      // LLM did not produce parseable JSON — surface the raw text so nothing is lost.
      return NextResponse.json({ analysis: { rawResponse: content }, raw: content })
    }
    return NextResponse.json({ analysis, raw: content })
  } catch (error) {
    console.error('Analysis request failed:', error)
    return NextResponse.json({ error: 'NVIDIA analysis request failed.' }, { status: 502 })
  }
}
