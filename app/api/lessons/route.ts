import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const snapshot = await adminDb.collection('lessons').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(50).get()
  return NextResponse.json({ lessons: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })), configured: true })
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
    userId: user.uid,
    createdAt: new Date().toISOString(),
  }
  const ref = await adminDb.collection('lessons').add(lesson)
  return NextResponse.json({ lesson: { id: ref.id, ...lesson } }, { status: 201 })
}
