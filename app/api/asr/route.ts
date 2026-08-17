import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const baseUrl = process.env.NVIDIA_BASE_URL
  const apiKey = process.env.NVIDIA_API_KEY
  if (!baseUrl || !apiKey) return NextResponse.json({ error: 'NVIDIA ASR is not configured. Add NVIDIA_BASE_URL and NVIDIA_API_KEY.' }, { status: 503 })
  const formData = await request.formData()
  const audio = formData.get('audio')
  if (!(audio instanceof File)) return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 })
  const upstream = await fetch(`${baseUrl}/audio/transcribe`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: audio })
  if (!upstream.ok) return NextResponse.json({ error: 'NVIDIA ASR request failed.' }, { status: 502 })
  const result = await upstream.json()
  return NextResponse.json({ segments: result.segments ?? result.transcript ?? [] })
}
