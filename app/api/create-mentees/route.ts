import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

interface MenteeData {
  firstName: string
  lastName: string
  middleName?: string
  email: string
  password: string
  enrollmentNo: string
  registrationNo: string
  parentsName: string
  parentsContact: string
  classId: string
  className: string
  admissionBatch: string
  classRollNo: string
  dob: string
  section: string
  stream: string
  assignedMentorId?: string
  assignedMentorName?: string
}

interface CreateMenteesRequest {
  mentees: MenteeData[]
  adminUid: string
  adminPassword: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMenteesRequest = await request.json()
    const { mentees, adminUid, adminPassword } = body

    if (!mentees || !Array.isArray(mentees) || mentees.length === 0) {
      return NextResponse.json(
        { error: "No mentees provided" },
        { status: 400 }
      )
    }

    if (!adminUid || !adminPassword) {
      return NextResponse.json(
        { error: "Admin credentials required" },
        { status: 400 }
      )
    }

    // Verify admin exists and get admin data
    let adminUser
    try {
      adminUser = await adminAuth.getUser(adminUid)
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid admin user" },
        { status: 401 }
      )
    }

    // Verify admin role from Firestore
    const adminDoc = await adminDb.collection('admins').doc(adminUid).get()
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: "Admin not found in database" },
        { status: 401 }
      )
    }

    const adminData = adminDoc.data()
    if (adminData?.role !== 'admin') {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // Verify admin password by attempting to sign in
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { auth } = await import('@/lib/firebase')
      await signInWithEmailAndPassword(auth, adminUser.email!, adminPassword)
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      )
    }

    const results = []
    const errors = []

    // Process each mentee
    for (let i = 0; i < mentees.length; i++) {
      const menteeData = mentees[i]
      
      try {
        // Validate required fields
        if (!menteeData.firstName || !menteeData.lastName || !menteeData.email || 
            !menteeData.password || !menteeData.enrollmentNo || !menteeData.registrationNo ||
            !menteeData.parentsName || !menteeData.parentsContact || !menteeData.classId ||
            !menteeData.admissionBatch || !menteeData.classRollNo || !menteeData.dob) {
          throw new Error(`Missing required fields for mentee ${i + 1}`)
        }

        // Check if email already exists
        try {
          await adminAuth.getUserByEmail(menteeData.email)
          throw new Error(`Email ${menteeData.email} already exists in Firebase Auth`)
        } catch (error: any) {
          if (error.code !== 'auth/user-not-found') {
            throw error
          }
          // User doesn't exist, which is what we want
        }

        // Also check in Firestore mentees collection
        const existingMenteeQuery = await adminDb.collection('mentees')
          .where('email', '==', menteeData.email)
          .limit(1)
          .get()
        
        if (!existingMenteeQuery.empty) {
          throw new Error(`Email ${menteeData.email} already exists in mentees database`)
        }

        // Create user in Firebase Auth
        const userRecord = await adminAuth.createUser({
          email: menteeData.email,
          password: menteeData.password,
          displayName: `${menteeData.firstName} ${menteeData.lastName}`,
          emailVerified: false,
          disabled: false
        })

        // Prepare full name
        const fullName = menteeData.middleName 
          ? `${menteeData.firstName} ${menteeData.middleName} ${menteeData.lastName}`
          : `${menteeData.firstName} ${menteeData.lastName}`

        // Create mentee document in Firestore
        const menteeDocData = {
          uid: userRecord.uid,
          firstName: menteeData.firstName,
          lastName: menteeData.lastName,
          middleName: menteeData.middleName || "",
          name: fullName,
          email: menteeData.email,
          password: menteeData.password, // Store for admin reference
          role: "mentee",
          enrollmentNo: menteeData.enrollmentNo,
          registrationNo: menteeData.registrationNo,
          parentsName: menteeData.parentsName,
          parentsContact: menteeData.parentsContact,
          classId: menteeData.classId,
          className: menteeData.className,
          admissionBatch: menteeData.admissionBatch,
          classRollNo: menteeData.classRollNo,
          dob: menteeData.dob,
          section: menteeData.section,
          stream: menteeData.stream,
          assignedMentorId: menteeData.assignedMentorId || "",
          assignedMentorName: menteeData.assignedMentorName || "",
          createdBy: adminUid,
          createdAt: new Date().toISOString(),
          isActive: true
        }

        // Save to Firestore
        await adminDb.collection('mentees').doc(userRecord.uid).set(menteeDocData)

        results.push({
          success: true,
          uid: userRecord.uid,
          email: menteeData.email,
          name: fullName,
          enrollmentNo: menteeData.enrollmentNo
        })

      } catch (error: any) {
        console.error(`Error creating mentee ${i + 1}:`, error)
        errors.push({
          index: i + 1,
          email: menteeData.email,
          error: error.message || "Unknown error occurred"
        })
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Created ${results.length} mentee(s) successfully`,
      results,
      errors,
      summary: {
        total: mentees.length,
        successful: results.length,
        failed: errors.length
      }
    })

  } catch (error: any) {
    console.error("Error in create-mentees API:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message 
      },
      { status: 500 }
    )
  }
}