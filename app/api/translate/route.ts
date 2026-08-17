import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const baseUrl = process.env.NVIDIA_BASE_URL
  const apiKey = process.env.NVIDIA_API_KEY
  const fallbackApiKey = process.env.NVIDIA_API_KEY_FALLBACK
  
  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: 'NVIDIA LLM is not configured. Add NVIDIA_BASE_URL and NVIDIA_API_KEY.' }, { status: 503 })
  }

  const { text, targetLanguage = 'English' } = await request.json()
  
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
  }
  
  const model = process.env.NVIDIA_LLM_MODEL ?? 'meta/muse-glimmer-30b'
  const fallbackModel = process.env.NVIDIA_LLM_MODEL_FALLBACK ?? 'nvidia/nemotron-3-ultra-550b-a55b'
  
  const systemPrompt = targetLanguage === 'Arabic' 
    ? 'You are a professional translator. Translate the German text to Arabic. Return only the translation, no explanations.'
    : 'You are a professional translator. Translate the German text to English. Return only the translation, no explanations.'
  
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, { 
      method: 'POST', 
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        model: model, 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ], 
        temperature: 0.3,
        max_tokens: 500
      }) 
    })
    
    if (upstream.ok) {
      const result = await upstream.json()
      const translation = result.choices?.[0]?.message?.content || text
      return NextResponse.json({ translation, targetLanguage })
    }
    
    // Try fallback API
    if (fallbackApiKey) {
      const fallbackUpstream = await fetch(`${baseUrl}/chat/completions`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${fallbackApiKey}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          model: fallbackModel, 
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ], 
          temperature: 0.3,
          max_tokens: 500
        }) 
      })
      
      if (fallbackUpstream.ok) {
        const result = await fallbackUpstream.json()
        const translation = result.choices?.[0]?.message?.content || text
        return NextResponse.json({ translation, targetLanguage })
      }
    }
    
    return NextResponse.json({ error: 'Translation request failed.' }, { status: 502 })
  } catch (error) {
    return NextResponse.json({ error: 'Translation request failed.' }, { status: 502 })
  }
}
