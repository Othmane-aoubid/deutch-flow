import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  try {
    if (!firebaseAdminConfigured || !adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin is not configured', 
        details: 'Check environment variables',
        configured: firebaseAdminConfigured,
        hasDb: !!adminDb
      }, { status: 503 })
    }
    
    const user = await verifyFirebaseToken(request)
    if (!user) {
      return NextResponse.json({ 
        error: 'Sign-in required',
        details: 'Authentication failed'
      }, { status: 401 })
    }

    const snapshot = await adminDb.collection('favorites').where('userId', '==', user.uid).get()
    const favorites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any))
    favorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Error loading favorites:', error)
    return NextResponse.json({ 
      error: 'Failed to load favorites', 
      details: error instanceof Error ? error.message : String(error),
      favorites: [] 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyFirebaseToken(request)
    if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
    if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

    const body = await request.json()
    const favorite = {
      type: body.type || 'vocabulary',
      german: body.german || '',
      english: body.english || body.translation || '',
      translation: body.translation || '',
      context: body.context || '',
      description: body.description || '',
      learningLevel: body.learningLevel || null,
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
