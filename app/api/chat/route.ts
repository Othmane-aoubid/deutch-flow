import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('Chat request:', message)

    const genAI = require('@google/generative-ai')
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('Gemini API key not configured')
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const model = new genAI.GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const prompt = `You are a German language tutor. Help the user with German learning. Provide translations, examples, grammar explanations, or vocabulary suggestions. Keep responses concise and helpful. User message: ${message}`

    console.log('Sending to Gemini...')
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    console.log('Gemini response:', text)
    
    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
