import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email } = body

        console.log(`🔍 API: Checking email: ${email}`)
        console.log(`🌐 API: Request headers:`, {
            host: request.headers.get('host'),
            origin: request.headers.get('origin'),
            userAgent: request.headers.get('user-agent')?.substring(0, 50)
        })

        if (!email || !email.trim()) {
            console.log('❌ API: No email provided')
            return NextResponse.json({ exists: false })
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase()

        // Import Firebase Admin SDK dynamically
        const firebaseAdmin = await import('@/lib/firebase-admin')
        const { adminAuth, adminDb } = firebaseAdmin

        try {
            // Try to get user by email from Firebase Auth
            const userRecord = await adminAuth.getUserByEmail(normalizedEmail)
            console.log(`✅ API: User found in Firebase Auth: ${userRecord.uid}`)
            console.log(`📋 API: User details:`, {
                email: userRecord.email,
                emailVerified: userRecord.emailVerified,
                disabled: userRecord.disabled,
                creationTime: userRecord.metadata.creationTime
            })

            // Also check if user exists in Firestore collections
            const [adminDoc, superAdminDoc] = await Promise.all([
                adminDb.collection('admins').doc(userRecord.uid).get(),
                adminDb.collection('super-admins').doc(userRecord.uid).get()
            ])

            console.log(`📊 API: Firestore check results:`, {
                existsInAdmins: adminDoc.exists,
                existsInSuperAdmins: superAdminDoc.exists,
                adminData: adminDoc.exists ? adminDoc.data() : null,
                superAdminData: superAdminDoc.exists ? superAdminDoc.data() : null
            })

            // If no error, user exists
            return NextResponse.json({ 
                exists: true, 
                uid: userRecord.uid,
                details: {
                    inFirebaseAuth: true,
                    inAdminsCollection: adminDoc.exists,
                    inSuperAdminsCollection: superAdminDoc.exists,
                    email: userRecord.email,
                    emailVerified: userRecord.emailVerified
                }
            })
        } catch (error: any) {
            console.log(`🔍 API: Firebase Auth error for ${normalizedEmail}:`, error.code)

            // If user not found, that's what we want
            if (error.code === 'auth/user-not-found') {
                console.log(`✅ API: Email ${normalizedEmail} is available`)
                return NextResponse.json({ exists: false })
            }

            // Handle other specific Firebase Auth errors
            if (error.code === 'auth/invalid-email') {
                console.log(`❌ API: Invalid email format: ${normalizedEmail}`)
                return NextResponse.json({ exists: false, error: 'Invalid email format' })
            }

            // Other errors should be handled
            console.error(`❌ API: Unexpected error for ${normalizedEmail}:`, error)
            throw error
        }

    } catch (error: any) {
        console.error('❌ API: Critical error checking email:', error)
        console.error('🔍 API: Error stack:', error.stack)
        console.error('🔍 API: Environment check:', {
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
            hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        })
        
        // On critical error, return exists: true to be safe and prevent duplicate creation
        return NextResponse.json({
            exists: true,
            error: 'Unable to verify email availability. Please try again.',
            details: error.message
        })
    }
}