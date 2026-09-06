import { NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { nvidiaVisionCompletion, nvidiaChatCompletion } from '@/lib/nvidia'
import { GoogleGenerativeAI } from '@google/generative-ai'

const VISION_PROMPT = `Analyze this image for German language learning. If there's German text, extract it and provide translations. Describe the scene in German and suggest vocabulary words that could be learned from this image. Return the response in JSON format with these fields:
{
  "germanText": "any German text found in the image",
  "translation": "English translation of the text",
  "description": "German description of the scene",
  "vocabulary": [
    {"word": "german word", "translation": "english", "context": "how it relates to the image"}
  ],
  "learningLevel": "CEFR level this content is suitable for"
}`

function parseVisionResponse(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // fall through: extract the first JSON object
  }
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // not JSON
    }
  }
  return null
}

function hasMeaningContent(analysis: any): boolean {
  return Boolean(analysis?.germanText || analysis?.description || (Array.isArray(analysis?.vocabulary) && analysis.vocabulary.length > 0))
}

async function analyzeWithGemini(imageDataUrl: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent([
      { text: VISION_PROMPT },
      { inlineData: { mimeType: imageDataUrl.slice(5, imageDataUrl.indexOf(';')), data: imageDataUrl.slice(imageDataUrl.indexOf(',') + 1) } },
    ])
    const analysis = parseVisionResponse(result.response.text())
    return analysis && hasMeaningContent(analysis) ? analysis : null
  } catch (error) {
    console.error('Gemini image analysis failed:', error instanceof Error ? error.message.slice(0, 140) : error)
    return null
  }
}

async function analyzeWithNvidiaVision(imageDataUrl: string): Promise<Record<string, unknown> | null> {
  const { content } = await nvidiaVisionCompletion(VISION_PROMPT, imageDataUrl)
  if (!content) return null
  const analysis = parseVisionResponse(content)
  return analysis && hasMeaningContent(analysis) ? analysis : null
}

// Last resort: text-only model produces generic lesson content (it cannot see the image).
async function analyzeWithNvidiaText(): Promise<Record<string, unknown> | null> {
  const { content } = await nvidiaChatCompletion({
    messages: [
      { role: 'system', content: 'You are a German language tutor. Provide German vocabulary and learning suggestions. Return JSON with germanText, translation, description, vocabulary array, and learningLevel.' },
      { role: 'user', content: 'Provide German learning content for a general lesson.' },
    ],
    temperature: 0.2,
    maxTokens: 2000,
  })
  if (!content) return null
  const analysis = parseVisionResponse(content)
  if (analysis) return analysis
  return { germanText: content, translation: '', description: '', vocabulary: [], learningLevel: null, fallback: true }
}

export async function POST(request: Request) {
  try {
    const user = await verifyFirebaseToken(request)
    if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

    const formData = await request.formData()
    const image = formData.get('image')
    const action = formData.get('action') as string

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
    }

    if (action !== 'analyze') {
      return NextResponse.json({ error: 'Invalid action. Use: analyze' }, { status: 400 })
    }

    const buffer = Buffer.from(await image.arrayBuffer())
    const imageDataUrl = `data:${image.type || 'image/png'};base64,${buffer.toString('base64')}`

    // Chain: Gemini vision -> NVIDIA vision (kimi-k3) -> NVIDIA text-only -> sample.
    const analysis =
      (await analyzeWithGemini(imageDataUrl))
      ?? (await analyzeWithNvidiaVision(imageDataUrl))
      ?? (await analyzeWithNvidiaText())

    if (analysis) {
      const usedVision = !('fallback' in analysis && analysis.fallback)
      return NextResponse.json({ success: true, analysis, fallback: !usedVision })
    }

    const sampleAnalysis = {
      germanText: 'Willkommen! Das ist eine Beispielszene.',
      translation: 'Welcome! This is a sample scene.',
      description: 'Eine allgemeine Szene zum Deutschlernen.',
      vocabulary: [
        { word: 'Willkommen', translation: 'Welcome', context: 'Greeting', type: 'noun' },
        { word: 'Szene', translation: 'Scene', context: 'Visual description', type: 'noun' },
        { word: 'lernen', translation: 'to learn', context: 'Education', type: 'verb' },
        { word: 'Beispiel', translation: 'Example', context: 'Sample', type: 'noun' }
      ],
      learningLevel: 'A1',
      fallback: true,
      sample: true
    }
    return NextResponse.json({ success: true, analysis: sampleAnalysis, fallback: true })
  } catch (error) {
    console.error('Image processing failed:', error)
    return NextResponse.json({ error: 'Image processing failed.' }, { status: 500 })
  }
}
