import 'dotenv/config'
import { initializeApp, cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

const svc = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
}
const app = initializeApp({ credential: cert(svc) })
const candidates = [
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  process.env.FIREBASE_PROJECT_ID + '.appspot.com',
  process.env.FIREBASE_PROJECT_ID + '.firebasestorage.app',
].filter(Boolean)

const run = async () => {
  for (const b of [...new Set(candidates)]) {
    try {
      const [exists] = await getStorage(app).bucket(b).exists()
      console.log((exists ? 'EXISTS  ' : 'missing ') + b)
    } catch (e) {
      console.log('error   ' + b + ' (' + String(e.message).slice(0, 60) + ')')
    }
  }
  process.exit(0)
}
run()
