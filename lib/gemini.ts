import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export async function analyzeWithGemini(transcript: string, level: string = 'A2') {
  if (!genAI) {
    throw new Error('Gemini API is not configured')
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `You are a supportive German tutor. Analyze the following German conversation transcript for a ${level} level learner and return a JSON response with the following structure:
{
  "corrections": [
    {
      "original": "incorrect phrase",
      "corrected": "corrected phrase", 
      "explanation": "brief explanation of the correction"
    }
  ],
  "vocabulary": [
    {
      "word": "german word",
      "translation": "english translation",
      "level": "CEFR level"
    }
  ],
  "grammarPatterns": [
    {
      "pattern": "grammar pattern",
      "explanation": "how it works"
    }
  ],
  "nextSteps": [
    "specific learning recommendation 1",
    "specific learning recommendation 2"
  ]
}

Transcript to analyze:
${transcript}`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Try to parse the JSON response
    try {
      return JSON.parse(text)
    } catch {
      // If the response isn't valid JSON, return it as is
      return { rawResponse: text }
    }
  } catch (error) {
    throw new Error(`Gemini analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}