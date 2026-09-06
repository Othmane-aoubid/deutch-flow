import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Gemini generation used in the provider chains (ASR + last-link text).
 * Returns null when the key is missing/rejected or the call fails so callers
 * move to the next provider without throwing.
 *
 * A key Google rejects as invalid is cached as unhealthy for 10 minutes so
 * the chains skip it instead of paying a doomed network call (and showing its
 * error) on every request. The skip expires automatically, so replacing the
 * key takes effect without a redeploy.
 */

const UNHEALTHY_MS = 10 * 60 * 1000
let unhealthyUntil = 0

// Valid Google AI Studio keys start with "AIza" and are ~39 chars. Anything
// else can't work (e.g. a key from a different service) — gate it out so the
// chains skip it instantly instead of paying a doomed 400 call.
const VALID_KEY_RE = /^AIza[0-9A-Za-z_-]{30,}$/

function markUnhealthy() {
  unhealthyUntil = Date.now() + UNHEALTHY_MS
}

export function isGeminiSkipped(): boolean {
  return Date.now() < unhealthyUntil
}

export function isGeminiKeyUsable(): boolean {
  const key = process.env.GEMINI_API_KEY
  return Boolean(key && VALID_KEY_RE.test(key))
}

export async function geminiGenerate(prompt: string, system?: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || !VALID_KEY_RE.test(apiKey) || isGeminiSkipped()) return null
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(
      system ? [{ text: system }, { text: prompt }] : prompt,
    )
    const text = result.response.text().trim()
    return text || null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Gemini generation failed:', message.slice(0, 140))
    if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
      markUnhealthy()
    }
    return null
  }
}
