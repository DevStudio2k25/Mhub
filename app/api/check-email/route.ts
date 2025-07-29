import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email } = body

        console.log(`🔍 API: Checking email: ${email}`)

        if (!email || !email.trim()) {
            console.log('❌ API: No email provided')
            return NextResponse.json({ exists: false })
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase()

        // Import Firebase Admin SDK dynamically
        const firebaseAdmin = await import('@/lib/firebase-admin')
        const { adminAuth } = firebaseAdmin

        try {
            // Try to get user by email
            const userRecord = await adminAuth.getUserByEmail(normalizedEmail)
            console.log(`✅ API: User found in Firebase Auth: ${userRecord.uid}`)
            // If no error, user exists
            return NextResponse.json({ exists: true, uid: userRecord.uid })
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
        // On critical error, return exists: true to be safe and prevent duplicate creation
        return NextResponse.json({
            exists: true,
            error: 'Unable to verify email availability. Please try again.'
        })
    }
}