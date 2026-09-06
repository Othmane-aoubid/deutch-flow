import { NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { nvidiaChatCompletion, type NvidiaAttempt } from '@/lib/nvidia'
import { geminiGenerate } from '@/lib/gemini'

type ChatMessage = { role: 'system' | 'user'; content: string }

const SYSTEM_PROMPT = `You are a supportive German tutor. Analyze the conversation transcript and return ONLY valid JSON (no markdown fences) with this structure:
{
  "translation": "full English translation of the transcript",
  "corrections": [{ "original": "incorrect phrase", "corrected": "corrected phrase", "explanation": "brief explanation of the correction IN ENGLISH" }],
  "vocabulary": [{ "word": "german word", "translation": "english translation", "level": "CEFR level" }],
  "grammarPatterns": [{ "pattern": "grammar pattern", "explanation": "how it works, IN ENGLISH" }],
  "nextSteps": ["specific learning recommendation"]
}
IMPORTANT: Every explanation, nextStep, and the translation field MUST be written in English. Keep German only for the quoted German phrases themselves.`

const DELTA_PROMPT = `You are a supportive German tutor. Analyze ONLY the NEW sentences below (spoken mid-conversation) and return ONLY valid JSON (no markdown fences) with this structure:
{
  "translation": "English translation of the NEW sentences only",
  "corrections": [{ "original": "incorrect phrase", "corrected": "corrected phrase", "explanation": "brief explanation of the correction IN ENGLISH" }],
  "vocabulary": [{ "word": "german word", "translation": "english translation", "level": "CEFR level" }],
  "grammarPatterns": [{ "pattern": "grammar pattern", "explanation": "how it works, IN ENGLISH" }],
  "nextSteps": []
}
Rules: analyze only the NEW text (prior context is for reference only — never report items already covered there). Every explanation and the translation MUST be in English; German only for quoted German phrases. Keep nextSteps EMPTY (the final full analysis provides steps). If the new text has no mistakes and no notable vocabulary, return empty arrays.`

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

  const { transcript, level = 'A2', mode = 'full', context } = await request.json()
  if (!transcript || typeof transcript !== 'string') return NextResponse.json({ error: 'Transcript is required.' }, { status: 400 })

  const isDelta = mode === 'delta'
  const messages: ChatMessage[] = isDelta
    ? [
        { role: 'system', content: `${DELTA_PROMPT} Target CEFR level: ${level}.` },
        { role: 'user', content: context ? `PRIOR CONTEXT (do not re-analyze):\n${context}\n\nNEW SENTENCES (analyze only these):\n${transcript}` : `NEW SENTENCES:\n${transcript}` },
      ]
    : [
        { role: 'system', content: `${SYSTEM_PROMPT} Target CEFR level: ${level}.` },
        { role: 'user', content: transcript },
      ]

  // Chain: NVIDIA (multi-key, primary + fallback models + kimi-k3) -> Gemini.
  // Delta mode keeps the token budget small (~800) for ~1s live latency.
  const nvidia = await nvidiaChatCompletion({ messages, temperature: 0.2, maxTokens: isDelta ? 800 : 4000 })

  let content = nvidia.content
  let attempts: Array<NvidiaAttempt | { provider: string; ok: boolean; detail?: string }> = nvidia.attempts

  if (!content) {
    const geminiText = await geminiGenerate(
      isDelta
        ? `Analyze ONLY the new German sentences for a ${level} level learner (prior context for reference — do not repeat items from it). Return ONLY valid JSON with fields: translation (English translation of the new sentences), corrections (original/corrected/explanation — explanation in English), vocabulary (word/translation/level), grammarPatterns (pattern/explanation in English), nextSteps (always empty array).\n\nPrior context:\n${context ?? '(none)'}\n\nNew sentences:\n${transcript}`
        : `Analyze this German conversation transcript for a ${level} level learner. Return ONLY valid JSON with fields: translation (full English translation of the transcript), corrections (original/corrected/explanation — explanation in English), vocabulary (word/translation/level), grammarPatterns (pattern/explanation in English), nextSteps (array of strings, in English).\n\nTranscript:\n${transcript}`,
      isDelta ? DELTA_PROMPT : SYSTEM_PROMPT
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
