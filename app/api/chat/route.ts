import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { message, generateAudio } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('Chat request:', message, 'generateAudio:', generateAudio)

    let audioBase64: string | null = null

    // Try Gemini first
    let responseText: string | null = null
    try {
      const genAI = require('@google/generative-ai')
      const apiKey = process.env.GEMINI_API_KEY
      if (apiKey) {
        const model = new genAI.GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-1.5-pro' })
        
        const prompt = `You are a German language tutor. Help the user with German learning. Provide translations, examples, grammar explanations, or vocabulary suggestions. Keep responses concise and helpful. User message: ${message}`

        console.log('Sending to Gemini...')
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        
        console.log('Gemini response:', text)
        responseText = text
      }
    } catch (geminiError) {
      console.error('Gemini API error, trying NVIDIA fallback:', geminiError)
    }

    // Fallback to NVIDIA if Gemini failed
    if (!responseText) {
      const baseUrl = process.env.NVIDIA_BASE_URL
      const apiKey = process.env.NVIDIA_API_KEY
      
      if (!baseUrl || !apiKey) {
        return NextResponse.json({ error: 'Both Gemini and NVIDIA APIs are not configured' }, { status: 503 })
      }

      const model = process.env.NVIDIA_LLM_MODEL ?? 'meta/muse-glimmer-30b'
      
      try {
        const upstream = await fetch(`${baseUrl}/chat/completions`, { 
          method: 'POST', 
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            model: model, 
            messages: [{ role: 'system', content: 'You are a German language tutor. Provide German vocabulary and learning suggestions. Keep responses concise and helpful.' }, { role: 'user', content: message }], 
            temperature: 0.2 
          }) 
        })
        
        if (upstream.ok) {
          const result = await upstream.json()
          const content = result.choices?.[0]?.message?.content
          console.log('NVIDIA response:', content)
          responseText = content
        }
      } catch (nvidiaError) {
        console.error('NVIDIA API error:', nvidiaError)
      }
    }

    if (!responseText) {
      return NextResponse.json({ error: 'All AI services unavailable' }, { status: 503 })
    }

    // Generate audio if requested
    if (generateAudio) {
      try {
        const baseUrl = process.env.NVIDIA_BASE_URL
        const apiKey = process.env.NVIDIA_API_KEY
        const ttsModel = process.env.NVIDIA_TTS_MODEL ?? 'canada/tts-1'
        
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
          console.log('Audio generated successfully')
        }
      } catch (audioError) {
        console.error('Audio generation error:', audioError)
      }
    }

    return NextResponse.json({ response: responseText, audio: audioBase64 })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
