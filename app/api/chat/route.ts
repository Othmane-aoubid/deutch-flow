import { NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { nvidiaChatCompletion, type NvidiaAttempt } from '@/lib/nvidia'
import { geminiGenerate } from '@/lib/gemini'

export async function POST(request: Request) {
  try {
    const user = await verifyFirebaseToken(request)
    if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

    const { message, generateAudio } = await request.json()
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    let audioBase64: string | null = null

    // Chain: NVIDIA (multi-key) -> Gemini.
    const nvidia = await nvidiaChatCompletion({
      messages: [
        { role: 'system', content: 'You are a German language tutor. Provide German vocabulary and learning suggestions. Keep responses concise and helpful.' },
        { role: 'user', content: message },
      ],
      temperature: 0.2,
      maxTokens: 2000,
    })
    let responseText: string | null = nvidia.content
    const attempts: Array<NvidiaAttempt | { provider: string; ok: boolean; detail?: string }> = nvidia.attempts

    if (!responseText) {
      responseText = await geminiGenerate(
        message,
        'You are a German language tutor. Provide German vocabulary and learning suggestions. Keep responses concise and helpful.'
      )
      attempts.push({ provider: 'gemini', ok: Boolean(responseText), detail: responseText ? undefined : 'failed or not configured' })
    }

    if (!responseText) {
      return NextResponse.json({ error: 'All AI services unavailable', attempts }, { status: 503 })
    }

    // Generate audio if requested
    if (generateAudio) {
      try {
        const baseUrl = process.env.NVIDIA_BASE_URL
        const apiKey = process.env.NVIDIA_API_KEY

        if (!baseUrl || !apiKey) {
          console.error('NVIDIA credentials not configured for audio generation')
        } else {
          const ttsModel = process.env.NVIDIA_TTS_MODEL ?? 'canada/tts-1'

          // NVIDIA_BASE_URL already ends in /v1 — appending another /v1 produced /v1/v1/... and 404s.
          const ttsResponse = await fetch(`${baseUrl}/audio/speech`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ttsModel,
              input: responseText,
              voice: 'alloy'
            })
          })

          if (ttsResponse.ok) {
            const audioBuffer = await ttsResponse.arrayBuffer()
            const audioBase = Buffer.from(audioBuffer).toString('base64')
            audioBase64 = `data:audio/mp3;base64,${audioBase}`
          } else {
            const errorText = await ttsResponse.text()
            console.error('TTS API error:', ttsResponse.status, errorText.slice(0, 200))
          }
        }
      } catch (audioError) {
        console.error('Audio generation error:', audioError)
      }
    }

    return NextResponse.json({ response: responseText, audio: audioBase64, attempts })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
