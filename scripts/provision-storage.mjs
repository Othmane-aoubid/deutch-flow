import 'dotenv/config'
import { GoogleAuth } from 'google-auth-library'

// One-off provisioning: create the Firebase default Storage bucket via the
// GCS JSON API so lesson audio upload works. Idempotent — skips if it exists.

const projectId = process.env.FIREBASE_PROJECT_ID
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`

const svc = {
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
}

const auth = new GoogleAuth({ credentials: svc, scopes: ['https://www.googleapis.com/auth/devstorage.full_control'] })
const client = await auth.getClient()
const { token } = await client.getAccessToken()

const url = `https://storage.googleapis.com/storage/v1/b?project=${projectId}`
const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: bucketName, storageClass: 'STANDARD', location: 'US' }),
})

const body = await res.json()
if (res.status === 409) {
  console.log(`Bucket ${bucketName} already exists — nothing to do.`)
  process.exit(0)
}
if (!res.ok) {
  console.error(`Failed (${res.status}):`, JSON.stringify(body).slice(0, 400))
  process.exit(1)
}
console.log(`Created bucket: ${bucketName} (location: ${body.location}, storageClass: ${body.storageClass})`)
