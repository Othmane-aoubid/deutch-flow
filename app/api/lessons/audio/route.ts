import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb, adminStorage, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

const CONTENT_TYPE = 'audio/webm'
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
// Chunks stay well under Firestore's 1 MiB document limit.
const CHUNK_SIZE = 700_000

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
    if (typeof lessonId !== 'string' || !lessonId) {
      return NextResponse.json({ error: 'lessonId is required.' }, { status: 400 })
    }
    const lessonRef = adminDb.collection('lessons').doc(lessonId)
    const lessonDoc = await lessonRef.get()
    if (!lessonDoc.exists || lessonDoc.data()?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    // 1) Preferred: Firebase Storage. 2) Fallback: chunked in Firestore (works
    // on the free Spark plan when no Storage bucket has been provisioned).
    let audioPath: string
    let mode: 'storage' | 'firestore-chunks'
    try {
      const path = `lessons/${user.uid}/${Date.now()}.webm`
      await adminStorage.bucket(BUCKET).file(path).save(buffer, { contentType: CONTENT_TYPE, resumable: false })
      audioPath = path
      mode = 'storage'
    } catch (storageError) {
      const message = storageError instanceof Error ? storageError.message : String(storageError)
      if (!/bucket does not exist|not been provisioned|404/i.test(message)) throw storageError

      const base64 = buffer.toString('base64')
      const chunks = base64.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? []
      const chunksCol = lessonRef.collection('audioChunks')
      const existing = await chunksCol.get()
      // Replace any previous chunks (idempotent re-uploads).
      await Promise.all(existing.docs.map((d) => d.ref.delete()))
      for (let i = 0; i < chunks.length; i++) {
        await chunksCol.add({ index: i, data: chunks[i] })
      }
      audioPath = `firestore://lessons/${lessonId}`
      mode = 'firestore-chunks'
    }

    await lessonRef.update({ audioPath, audio: FieldValue.delete() })
    return NextResponse.json({ audioPath, mode }, { status: 201 })
  } catch (error) {
    console.error('Lesson audio upload failed:', error)
    return NextResponse.json({ error: 'Failed to upload audio.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb || !adminStorage) {
    return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  }
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  // Paths are either `lessons/<uid>/<file>.webm` (Storage) or
  // `firestore://lessons/<lessonId>` (chunked Firestore). Both are
  // ownership-checked before any bytes are served.
  const path = new URL(request.url).searchParams.get('path') ?? ''
  const parts = path.split('/')

  try {
    if (parts.length === 3 && parts[0] === 'firestore:' && parts[1] === 'lessons') {
      const lessonId = parts[2]
      const lessonRef = adminDb.collection('lessons').doc(lessonId)
      const lessonDoc = await lessonRef.get()
      if (!lessonDoc.exists || lessonDoc.data()?.userId !== user.uid) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
      }
      const chunks = await lessonRef.collection('audioChunks').get()
      if (chunks.empty) return NextResponse.json({ error: 'Audio not found.' }, { status: 404 })
      const base64 = chunks.docs
        .sort((a, b) => (a.data().index ?? 0) - (b.data().index ?? 0))
        .map((d) => d.data().data as string)
        .join('')
      const buffer = Buffer.from(base64, 'base64')
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: { 'Content-Type': CONTENT_TYPE, 'Content-Length': String(buffer.byteLength) },
      })
    }

    if (parts.length === 3 && parts[0] === 'lessons' && parts[1] === user.uid && parts[2]) {
      const file = adminStorage.bucket(BUCKET).file(path)
      const [exists] = await file.exists()
      if (!exists) return NextResponse.json({ error: 'Audio not found.' }, { status: 404 })
      const [buffer] = await file.download()
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: { 'Content-Type': CONTENT_TYPE, 'Content-Length': String(buffer.byteLength) },
      })
    }

    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
  } catch (error) {
    console.error('Lesson audio playback failed:', error)
    return NextResponse.json({ error: 'Failed to load audio.' }, { status: 500 })
  }
}
