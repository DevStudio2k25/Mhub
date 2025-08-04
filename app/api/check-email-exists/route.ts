import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
    try {
        const { emails } = await request.json()

        if (!emails || !Array.isArray(emails)) {
            return NextResponse.json(
                { error: "Emails array required" },
                { status: 400 }
            )
        }

        const existingEmails = []

        for (const email of emails) {
            try {
                // Check in Firebase Auth
                await adminAuth.getUserByEmail(email)
                existingEmails.push({ email, source: 'Firebase Auth' })
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    // Check in Firestore mentees collection
                    const menteeQuery = await adminDb.collection('mentees')
                        .where('email', '==', email)
                        .limit(1)
                        .get()

                    if (!menteeQuery.empty) {
                        existingEmails.push({ email, source: 'Mentees Database' })
                    }
                }
            }
        }

        return NextResponse.json({
            existingEmails,
            duplicateCount: existingEmails.length
        })

    } catch (error: any) {
        console.error("Error checking emails:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}