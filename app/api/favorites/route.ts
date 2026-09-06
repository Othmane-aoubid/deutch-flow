import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

function asString(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

export async function GET(request: Request) {
  try {
    if (!firebaseAdminConfigured || !adminDb) {
      return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
    }

    const user = await verifyFirebaseToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })
    }

    const snapshot = await adminDb.collection('favorites').where('userId', '==', user.uid).get()
    const favorites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any))
    favorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Error loading favorites:', error)
    return NextResponse.json({ error: 'Failed to load favorites' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyFirebaseToken(request)
    if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
    if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

    const body = await request.json()
    const type = body.type === 'analysis' ? 'analysis' : 'vocabulary'
    const german = asString(body.german)

    // Avoid duplicates: one favorite per (user, type, german text).
    if (german) {
      const existing = await adminDb.collection('favorites')
        .where('userId', '==', user.uid)
        .where('type', '==', type)
        .where('german', '==', german)
        .limit(1)
        .get()
      if (!existing.empty) {
        const doc = existing.docs[0]
        return NextResponse.json({ favorite: { id: doc.id, ...doc.data() }, duplicate: true }, { status: 200 })
      }
    }

    const favorite = {
      type,
      german,
      english: asString(body.english),
      translation: asString(body.translation),
      context: asString(body.context),
      description: asString(body.description),
      learningLevel: asString(body.learningLevel, 8) || null,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    }
    const ref = await adminDb.collection('favorites').add(favorite)
    return NextResponse.json({ favorite: { id: ref.id, ...favorite } }, { status: 201 })
  } catch (error) {
    console.error('Error saving favorite:', error)
    return NextResponse.json({ error: 'Failed to save favorite' }, { status: 500 })
  }
}
