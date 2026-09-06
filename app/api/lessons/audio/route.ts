import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb, adminStorage, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

const CONTENT_TYPE = 'audio/webm'
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

export async function POST(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb || !adminStorage) {
    return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  }
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 })
    }

    const buffer = Buffer.from(await audio.arrayBuffer())
    if (buffer.byteLength > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio too large (max 25 MB).' }, { status: 413 })
    }

    const lessonId = formData.get('lessonId')
    const path = `lessons/${user.uid}/${Date.now()}.webm`
    await adminStorage.bucket(BUCKET).file(path).save(buffer, { contentType: CONTENT_TYPE, resumable: false })

    if (typeof lessonId === 'string' && lessonId) {
      const ref = adminDb.collection('lessons').doc(lessonId)
      const doc = await ref.get()
      if (doc.exists && doc.data()?.userId === user.uid) {
        await ref.update({ audioPath: path, audio: FieldValue.delete() })
      }
    }

    return NextResponse.json({ audioPath: path }, { status: 201 })
  } catch (error) {
    console.error('Lesson audio upload failed:', error)
    return NextResponse.json({ error: 'Failed to upload audio.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminStorage) {
    return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  }
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  // Paths are `lessons/<uid>/<file>.webm`; users may only stream their own audio.
  const path = new URL(request.url).searchParams.get('path') ?? ''
  const parts = path.split('/')
  if (parts.length !== 3 || parts[0] !== 'lessons' || parts[1] !== user.uid || !parts[2]) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
  }

  try {
    const file = adminStorage.bucket(BUCKET).file(path)
    const [exists] = await file.exists()
    if (!exists) return NextResponse.json({ error: 'Audio not found.' }, { status: 404 })
    const [buffer] = await file.download()
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': CONTENT_TYPE,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (error) {
    console.error('Lesson audio playback failed:', error)
    return NextResponse.json({ error: 'Failed to load audio.' }, { status: 500 })
  }
}
