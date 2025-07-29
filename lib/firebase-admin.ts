import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin SDK configuration
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // Validate required environment variables
    if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
      throw new Error('Missing Firebase Admin SDK environment variables')
    }

    initializeApp({
      credential: cert(firebaseAdminConfig),
      projectId: firebaseAdminConfig.projectId,
    })
  }
}

// Initialize the admin app
initializeFirebaseAdmin()

// Export admin services
export const adminAuth = getAuth()
export const adminDb = getFirestore()