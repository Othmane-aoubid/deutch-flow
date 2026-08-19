import { NextResponse } from 'next/server'
import { adminDb, firebaseAdminConfigured, verifyFirebaseToken } from '@/lib/firebase-admin'

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!firebaseAdminConfigured || !adminDb) {
      return NextResponse.json({ error: 'Firebase Admin is not configured.' }, { status: 503 })
    }
    
    const user = await verifyFirebaseToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign-in required.' }, { status: 401 })
    }

    await adminDb.collection('favorites').doc(params.id).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting favorite:', error)
    return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 })
  }
}
