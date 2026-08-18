import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const image = formData.get('image')
    const action = formData.get('action') as string

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
    }

    const buffer = Buffer.from(await image.arrayBuffer())

    // Process image based on action
    switch (action) {
      case 'analyze':
        const base64Image = `data:${image.type};base64,${buffer.toString('base64')}`
        
        const genAI = require('@google/generative-ai')
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
          return NextResponse.json({ error: 'Gemini API is not configured.' }, { status: 503 })
        }

        const model = new genAI.GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-1.5-flash' })
        
        const prompt = `Analyze this image for German language learning. If there's German text, extract it and provide translations. Describe the scene in German and suggest vocabulary words that could be learned from this image. Return the response in JSON format with these fields:
{
  "germanText": "any German text found in the image",
  "translation": "English translation of the text",
  "description": "German description of the scene",
  "vocabulary": [
    {"word": "german word", "translation": "english", "context": "how it relates to the image"}
  ],
  "learningLevel": "CEFR level this content is suitable for"
}`

        const result = await model.generateContent([prompt, base64Image])
        const response = await result.response
        const text = response.text()
        
        try {
          const analysis = JSON.parse(text)
          return NextResponse.json({ success: true, analysis })
        } catch {
          return NextResponse.json({ success: true, rawAnalysis: text })
        }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: analyze' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Image processing failed.' }, { status: 500 })
  }
}