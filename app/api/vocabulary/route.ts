import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  try {
    if (!firebaseAdminConfigured || !adminDb) {
      return NextResponse.json({ 
        error: 'Firebase Admin is not configured', 
        details: 'Check environment variables: FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID',
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

    const snapshot = await adminDb.collection('vocabulary').where('userId', '==', user.uid).orderBy('createdAt', 'desc').get()
    return NextResponse.json({ vocabulary: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) })
  } catch (error) {
    console.error('Error loading vocabulary:', error)
    return NextResponse.json({ 
      error: 'Failed to load vocabulary', 
      details: error instanceof Error ? error.message : String(error),
      vocabulary: [] 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyFirebaseToken(request)
    if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
    if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

    const body = await request.json()
    const vocab = {
      german: typeof body.german === 'string' ? body.german : '',
      english: typeof body.english === 'string' ? body.english : '',
      type: typeof body.type === 'string' ? body.type : null,
      context: typeof body.context === 'string' ? body.context : null,
      source: typeof body.source === 'string' ? body.source : 'image',
      learned: false,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    }
    const ref = await adminDb.collection('vocabulary').add(vocab)
    return NextResponse.json({ vocabulary: { id: ref.id, ...vocab } }, { status: 201 })
  } catch (error) {
    console.error('Error saving vocabulary:', error)
    return NextResponse.json({ error: 'Failed to save vocabulary' }, { status: 500 })
  }
}
