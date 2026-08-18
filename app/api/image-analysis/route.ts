import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const snapshot = await adminDb.collection('imageAnalysis').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(50).get()
  return NextResponse.json({ analyses: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) })
}

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  const body = await request.json()
  const analysis = {
    germanText: typeof body.germanText === 'string' ? body.germanText : '',
    translation: typeof body.translation === 'string' ? body.translation : '',
    description: typeof body.description === 'string' ? body.description : '',
    vocabulary: Array.isArray(body.vocabulary) ? body.vocabulary : [],
    learningLevel: typeof body.learningLevel === 'string' ? body.learningLevel : null,
    fallback: typeof body.fallback === 'boolean' ? body.fallback : false,
    userId: user.uid,
    createdAt: new Date().toISOString(),
  }
  const ref = await adminDb.collection('imageAnalysis').add(analysis)
  return NextResponse.json({ analysis: { id: ref.id, ...analysis } }, { status: 201 })
}
