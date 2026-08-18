import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (raw) {
    console.log('Using FIREBASE_SERVICE_ACCOUNT_JSON')
    return JSON.parse(raw)
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
    console.log('Using individual Firebase Admin credentials')
    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID)
    console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL)
    console.log('Private Key length:', process.env.FIREBASE_PRIVATE_KEY?.length)
    
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  }

  console.error('No Firebase Admin credentials found')
  return null
}

const serviceAccount = getServiceAccount()
export const firebaseAdminConfigured = Boolean(serviceAccount)

console.log('Firebase Admin configured:', firebaseAdminConfigured)

const adminApp = serviceAccount
  ? (getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) }))
  : null

export const adminAuth = adminApp ? getAuth(adminApp) : null
export const adminDb = adminApp ? getFirestore(adminApp) : null

export async function verifyFirebaseToken(request: Request) {
  if (!adminAuth) {
    console.error('adminAuth is null')
    return null
  }
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) {
    console.error('Invalid authorization header')
    return null
  }
  try {
    const token = header.slice(7)
    console.log('Verifying token...')
    return await adminAuth.verifyIdToken(token)
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}
