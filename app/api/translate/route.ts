import { NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { nvidiaChatCompletion, type NvidiaAttempt } from '@/lib/nvidia'
import { geminiGenerate } from '@/lib/gemini'

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  if (!process.env.NVIDIA_API_KEY && !process.env.NVIDIA_API_KEY_FALLBACK && !process.env.NVIDIA_API_KEY_2 && !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'No translation provider configured.' }, { status: 503 })
  }

  const { text, targetLanguage = 'English' } = await request.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
  }

  const systemPrompt =
    'You are a professional translator. Translate the German text to ' + targetLanguage + '. Return only the translation, no explanations.'

  // Chain: NVIDIA (multi-key) -> Gemini.
  const nvidia = await nvidiaChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    maxTokens: 2000,
  })

  if (nvidia.content) {
    return NextResponse.json({ translation: nvidia.content, targetLanguage, provider: 'nvidia', attempts: nvidia.attempts })
  }

  const geminiText = await geminiGenerate(
    `Translate the following German text to ${targetLanguage}. Return only the translation, no explanations.\n\n${text}`,
    'You are a professional translator.'
  )
  if (geminiText) {
    return NextResponse.json({ translation: geminiText, targetLanguage, provider: 'gemini', attempts: nvidia.attempts as NvidiaAttempt[] })
  }

  return NextResponse.json({ error: 'All translation providers failed.', attempts: nvidia.attempts }, { status: 502 })
}
