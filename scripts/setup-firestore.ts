import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

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

async function setupFirestore() {
  const serviceAccount = getServiceAccount()
  
  if (!serviceAccount) {
    console.error('Firebase service account not configured. Please set FIREBASE_SERVICE_ACCOUNT_JSON or individual Firebase environment variables.')
    process.exit(1)
  }

  const adminApp = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore(adminApp)

  console.log('Setting up Firestore database structure...')

  try {
    // Create sample lesson data structure
    const sampleLesson = {
      title: 'Sample Lesson: At the Bakery',
      transcript: 'Ich möchte ein Brötchen haben, bitte. Wie viel kostet das?',
      analysis: {
        corrections: [
          {
            original: 'Ich möchte ein Brötchen haben',
            corrected: 'Ich möchte ein Brötchen',
            explanation: 'The verb "haben" is not needed here'
          }
        ],
        vocabulary: [
          { word: 'Brötchen', translation: 'bread roll', level: 'A1' },
          { word: 'kosten', translation: 'to cost', level: 'A1' }
        ],
        grammarPatterns: [
          { pattern: 'Ich möchte + accusative', explanation: 'Expressing desires politely' }
        ],
        nextSteps: [
          'Practice ordering food vocabulary',
          'Review accusative case articles'
        ]
      },
      userId: 'sample-user-id',
      level: 'A2',
      createdAt: new Date().toISOString(),
      duration: '02:30',
      score: 85
    }

    // Add sample lesson to Firestore
    const lessonRef = await db.collection('lessons').add(sampleLesson)
    console.log(`Created sample lesson with ID: ${lessonRef.id}`)

    // Create users collection index structure
    console.log('Creating Firestore indexes...')
    console.log('Note: You may need to create composite indexes manually in Firebase Console for complex queries')
    console.log('Required index: lessons collection with userId (ascending) and createdAt (descending)')

    console.log('Firestore database setup completed successfully!')
    console.log('\nDatabase structure:')
    console.log('- lessons collection (with sample data)')
    console.log('- Required indexes for optimal queries')

  } catch (error) {
    console.error('Error setting up Firestore:', error)
    process.exit(1)
  }
}

setupFirestore()