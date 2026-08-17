import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const baseUrl = process.env.NVIDIA_BASE_URL
  const apiKey = process.env.NVIDIA_API_KEY
  const fallbackApiKey = process.env.NVIDIA_API_KEY_FALLBACK
  if (!baseUrl || !apiKey) return NextResponse.json({ error: 'NVIDIA LLM is not configured. Add NVIDIA_BASE_URL and NVIDIA_API_KEY.' }, { status: 503 })
  const { transcript, level = 'A2' } = await request.json()
  if (!transcript || typeof transcript !== 'string') return NextResponse.json({ error: 'Transcript is required.' }, { status: 400 })
  
  const model = process.env.NVIDIA_LLM_MODEL ?? 'meta/muse-glimmer-30b'
  const fallbackModel = process.env.NVIDIA_LLM_MODEL_FALLBACK ?? 'nvidia/nemotron-3-ultra-550b-a55b'
  
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, { 
      method: 'POST', 
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        model: model, 
        messages: [{ role: 'system', content: `You are a supportive German tutor. Return JSON with corrections, vocabulary, grammarPatterns, and nextSteps for CEFR ${level}.` }, { role: 'user', content: transcript }], 
        temperature: 0.2 
      }) 
    })
    
    if (upstream.ok) {
      const result = await upstream.json()
      return NextResponse.json(result)
    }
    
    // Try fallback API
    if (fallbackApiKey) {
      const fallbackUpstream = await fetch(`${baseUrl}/chat/completions`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${fallbackApiKey}`, 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          model: fallbackModel, 
          messages: [{ role: 'system', content: `You are a supportive German tutor. Return JSON with corrections, vocabulary, grammarPatterns, and nextSteps for CEFR ${level}.` }, { role: 'user', content: transcript }], 
          temperature: 0.2,
          extra_body: {"chat_template_kwargs":{"enable_thinking":true},"reasoning_budget":16384}
        }) 
      })
      
      if (fallbackUpstream.ok) {
        const result = await fallbackUpstream.json()
        return NextResponse.json(result)
      }
    }
    
    return NextResponse.json({ error: 'NVIDIA analysis request failed.' }, { status: 502 })
  } catch (error) {
    return NextResponse.json({ error: 'NVIDIA analysis request failed.' }, { status: 502 })
  }
}
