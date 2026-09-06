import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  // Sort in code rather than orderBy('createdAt') — that combination requires a
  // composite index that doesn't exist yet (it 500s without it). Same pattern as
  // the vocabulary/favorites routes.
  const snapshot = await adminDb.collection('lessons').where('userId', '==', user.uid).limit(50).get()
  const lessons = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
  lessons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return NextResponse.json({ lessons, configured: true })
}

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const body = await request.json()
  const lesson = {
    title: typeof body.title === 'string' ? body.title.slice(0, 160) : 'Untitled lesson',
    transcript: typeof body.transcript === 'string' ? body.transcript.slice(0, 50000) : '',
    analysis: body.analysis ?? null,
    level: typeof body.level === 'string' ? body.level : 'A2',
    duration: typeof body.duration === 'string' ? body.duration : '00:00',
    score: typeof body.score === 'number' ? body.score : 0,
    images: Array.isArray(body.images) ? body.images.slice(0, 10) : [],
    // New flow stores audio in Firebase Storage (see /api/lessons/audio); the legacy
    // base64 `audio` field is kept only so older saved lessons still play back.
    audioPath: typeof body.audioPath === 'string' && body.audioPath.startsWith(`lessons/${user.uid}/`) ? body.audioPath : null,
    audio: typeof body.audio === 'string' ? body.audio.slice(0, 700000) : null,
    userId: user.uid,
    createdAt: new Date().toISOString(),
  }
  const ref = await adminDb.collection('lessons').add(lesson)
  return NextResponse.json({ lesson: { id: ref.id, ...lesson } }, { status: 201 })
}
