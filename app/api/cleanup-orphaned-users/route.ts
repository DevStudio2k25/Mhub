import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, superAdminToken, confirmCleanup } = body

        if (!superAdminToken) {
            return NextResponse.json({ error: 'Super admin token required' }, { status: 401 })
        }

        if (!confirmCleanup) {
            return NextResponse.json({ error: 'Cleanup confirmation required' }, { status: 400 })
        }

        // Import Firebase Admin SDK
        const firebaseAdmin = await import('@/lib/firebase-admin')
        const { adminAuth, adminDb } = firebaseAdmin

        // Verify super admin token
        const decodedToken = await adminAuth.verifyIdToken(superAdminToken)
        const superAdminDoc = await adminDb.collection('super-admins').doc(decodedToken.uid).get()

        if (!superAdminDoc.exists || superAdminDoc.data()?.role !== 'super-admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Find the user by email
        const userRecord = await adminAuth.getUserByEmail(email.trim().toLowerCase())

        // Check if user exists in Firestore collections
        const [adminDoc, superAdminDoc2] = await Promise.all([
            adminDb.collection('admins').doc(userRecord.uid).get(),
            adminDb.collection('super-admins').doc(userRecord.uid).get()
        ])

        const existsInFirestore = adminDoc.exists || superAdminDoc2.exists

        if (existsInFirestore) {
            return NextResponse.json({
                error: 'User exists in Firestore collections. Cannot cleanup.',
                details: {
                    inAdmins: adminDoc.exists,
                    inSuperAdmins: superAdminDoc2.exists
                }
            }, { status: 400 })
        }

        // Delete the orphaned user from Firebase Auth
        await adminAuth.deleteUser(userRecord.uid)

        return NextResponse.json({
            success: true,
            message: `Orphaned user ${email} has been cleaned up from Firebase Auth`,
            deletedUser: {
                uid: userRecord.uid,
                email: userRecord.email,
                creationTime: userRecord.metadata.creationTime
            }
        })

    } catch (error: any) {
        console.error('Cleanup error:', error)

        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({
                success: true,
                message: 'User not found in Firebase Auth - already clean'
            })
        }

        return NextResponse.json({
            error: 'Cleanup failed',
            details: error.message
        }, { status: 500 })
    }
}