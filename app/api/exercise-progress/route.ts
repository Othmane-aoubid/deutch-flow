import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const snapshot = await adminDb.collection('exerciseProgress').where('userId', '==', user.uid).limit(1).get()
  if (snapshot.empty) {
    return NextResponse.json({ score: 0, total: 0, correct: 0 })
  }
  const progress = snapshot.docs[0].data()
  return NextResponse.json({ id: snapshot.docs[0].id, ...progress })
}

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const body = await request.json()
  
  // Check if user already has progress
  const existing = await adminDb.collection('exerciseProgress').where('userId', '==', user.uid).limit(1).get()
  
  let ref
  if (existing.empty) {
    const progress = {
      score: typeof body.score === 'number' ? body.score : 0,
      total: typeof body.total === 'number' ? body.total : 0,
      correct: typeof body.correct === 'number' ? body.correct : 0,
      userId: user.uid,
      updatedAt: new Date().toISOString(),
    }
    ref = await adminDb.collection('exerciseProgress').add(progress)
    return NextResponse.json({ progress: { id: ref.id, ...progress } }, { status: 201 })
  } else {
    const docRef = existing.docs[0].ref
    const currentData = existing.docs[0].data()
    const updatedProgress = {
      score: typeof body.score === 'number' ? body.score : currentData.score,
      total: typeof body.total === 'number' ? body.total : currentData.total,
      correct: typeof body.correct === 'number' ? body.correct : currentData.correct,
      updatedAt: new Date().toISOString(),
    }
    await docRef.update(updatedProgress)
    return NextResponse.json({ progress: { id: docRef.id, ...updatedProgress } })
  }
}
