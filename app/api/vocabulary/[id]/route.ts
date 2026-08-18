import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const docRef = adminDb.collection('vocabulary').doc(id)
    const doc = await docRef.get()
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Vocabulary not found.' }, { status: 404 })
    }
    
    const data = doc.data()
    if (data?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }
    
    await docRef.update({
      learned: typeof body.learned === 'boolean' ? body.learned : false,
      updatedAt: new Date().toISOString()
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update vocabulary.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyFirebaseToken(request)
  if (!firebaseAdminConfigured || !adminDb) return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })

  try {
    const { id } = await params
    const docRef = adminDb.collection('vocabulary').doc(id)
    const doc = await docRef.get()
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Vocabulary not found.' }, { status: 404 })
    }
    
    const data = doc.data()
    if (data?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    }
    
    await docRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete vocabulary.' }, { status: 500 })
  }
}
