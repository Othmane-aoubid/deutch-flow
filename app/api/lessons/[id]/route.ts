import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  }
  if (!user) {
    return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })
  }

  try {
    const { id } = await params
    const lessonRef = adminDb.collection('lessons').doc(id)
    const lesson = await lessonRef.get()
    
    if (!lesson.exists) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 })
    }
    
    const lessonData = lesson.data()
    if (lessonData?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }
    
    await lessonRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete lesson.' }, { status: 500 })
  }
}
