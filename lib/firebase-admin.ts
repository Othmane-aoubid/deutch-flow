import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (raw) {
    return JSON.parse(raw)
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  }

  return null
}

const serviceAccount = getServiceAccount()
export const firebaseAdminConfigured = Boolean(serviceAccount)

const adminApp = serviceAccount
  ? (getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) }))
  : null

export const adminAuth = adminApp ? getAuth(adminApp) : null
export const adminDb = adminApp ? getFirestore(adminApp) : null

export async function verifyFirebaseToken(request: Request) {
  if (!adminAuth) return null
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  try {
    return await adminAuth.verifyIdToken(header.slice(7))
  } catch {
    return null
  }
}
