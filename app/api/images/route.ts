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
        // Try Gemini first for image analysis
        try {
          const base64Image = `data:${image.type};base64,${buffer.toString('base64')}`
          
          const genAI = require('@google/generative-ai')
          const apiKey = process.env.GEMINI_API_KEY
          if (!apiKey) {
            throw new Error('Gemini API key not configured')
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
          
          console.log('Gemini response text:', text)
          
          try {
            const analysis = JSON.parse(text)
            console.log('Parsed analysis:', analysis)
            
            // Check if analysis has meaningful content
            if (!analysis.germanText && !analysis.description && (!analysis.vocabulary || analysis.vocabulary.length === 0)) {
              console.log('Gemini returned empty results, using NVIDIA fallback')
              throw new Error('Empty results from Gemini')
            }
            
            return NextResponse.json({ success: true, analysis })
          } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON or empty results:', parseError)
            throw new Error('Gemini parsing failed or returned empty results')
          }
        } catch (geminiError) {
          console.error('Gemini API error or empty results, using NVIDIA fallback:', geminiError)
          // Fallback to NVIDIA LLM (note: NVIDIA doesn't support image vision, so this will provide generic German learning content)
          const baseUrl = process.env.NVIDIA_BASE_URL
          const apiKey = process.env.NVIDIA_API_KEY
          const fallbackApiKey = process.env.NVIDIA_API_KEY_FALLBACK
          
          if (!baseUrl || !apiKey) {
            return NextResponse.json({ error: 'Both Gemini and NVIDIA APIs are not configured.' }, { status: 503 })
          }

          const model = process.env.NVIDIA_LLM_MODEL ?? 'meta/muse-glimmer-30b'
          const fallbackModel = process.env.NVIDIA_LLM_MODEL_FALLBACK ?? 'nvidia/nemotron-3-ultra-550b-a55b'
          
          try {
            const upstream = await fetch(`${baseUrl}/chat/completions`, { 
              method: 'POST', 
              headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ 
                model: model, 
                messages: [{ role: 'system', content: 'You are a German language tutor. Provide German vocabulary and learning suggestions. Return JSON with germanText, translation, description, vocabulary array, and learningLevel.' }, { role: 'user', content: 'Provide German learning content for a general lesson.' }], 
                temperature: 0.2 
              }) 
            })
            
            if (upstream.ok) {
              const result = await upstream.json()
              const content = result.choices?.[0]?.message?.content
              console.log('NVIDIA response content:', content)
              
              try {
                const parsedAnalysis = JSON.parse(content)
                console.log('Parsed NVIDIA analysis:', parsedAnalysis)
                return NextResponse.json({ success: true, analysis: parsedAnalysis, fallback: true })
              } catch (parseError) {
                console.error('Failed to parse NVIDIA response as JSON:', parseError)
                // Return raw content as fallback
                return NextResponse.json({ success: true, analysis: { germanText: content, translation: '', description: '', vocabulary: [], learningLevel: null, fallback: true }, fallback: true })
              }
            }
            
            // Try fallback API
            if (fallbackApiKey) {
              const fallbackUpstream = await fetch(`${baseUrl}/chat/completions`, { 
                method: 'POST', 
                headers: { Authorization: `Bearer ${fallbackApiKey}`, 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                  model: fallbackModel, 
                  messages: [{ role: 'system', content: 'You are a German language tutor. Provide German vocabulary and learning suggestions. Return JSON with germanText, translation, description, vocabulary array, and learningLevel.' }, { role: 'user', content: 'Provide German learning content for a general lesson.' }], 
                  temperature: 0.2 
                }) 
              })
              
              if (fallbackUpstream.ok) {
                const result = await fallbackUpstream.json()
                const content = result.choices?.[0]?.message?.content
                console.log('NVIDIA fallback response content:', content)
                
                try {
                  const parsedAnalysis = JSON.parse(content)
                  console.log('Parsed NVIDIA fallback analysis:', parsedAnalysis)
                  return NextResponse.json({ success: true, analysis: parsedAnalysis, fallback: true })
                } catch (parseError) {
                  console.error('Failed to parse NVIDIA fallback response as JSON:', parseError)
                  return NextResponse.json({ success: true, analysis: { germanText: content, translation: '', description: '', vocabulary: [], learningLevel: null, fallback: true }, fallback: true })
                }
              }
            }
          } catch (nvidiaError) {
            console.error('NVIDIA API error:', nvidiaError)
            // Final fallback - provide sample German vocabulary
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
            console.log('Using sample fallback data')
            return NextResponse.json({ success: true, analysis: sampleAnalysis, fallback: true })
          }
        }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: analyze' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Image processing failed.' }, { status: 500 })
  }
}