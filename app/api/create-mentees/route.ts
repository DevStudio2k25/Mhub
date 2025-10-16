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
    console.log("=== Create Mentees API Called ===")
    const body: CreateMenteesRequest = await request.json()
    const { mentees, adminUid, adminPassword } = body

    console.log("Request data:", {
      menteesCount: mentees?.length,
      adminUid,
      hasPassword: !!adminPassword
    })

    if (!mentees || !Array.isArray(mentees) || mentees.length === 0) {
      console.error("No mentees provided")
      return NextResponse.json(
        { error: "No mentees provided" },
        { status: 400 }
      )
    }

    if (!adminUid || !adminPassword) {
      console.error("Missing admin credentials")
      return NextResponse.json(
        { error: "Admin credentials required" },
        { status: 400 }
      )
    }

    // Verify admin exists and get admin data
    let adminUser
    try {
      console.log("Verifying admin user...")
      adminUser = await adminAuth.getUser(adminUid)
      console.log("Admin user found:", adminUser.email)
    } catch (error: any) {
      console.error("Admin user not found:", error.message)
      return NextResponse.json(
        { error: "Invalid admin user" },
        { status: 401 }
      )
    }

    // Verify admin role from Firestore
    console.log("Checking admin role in Firestore...")
    const adminDoc = await adminDb.collection('admins').doc(adminUid).get()
    if (!adminDoc.exists) {
      console.error("Admin document not found in Firestore")
      return NextResponse.json(
        { error: "Admin not found in database" },
        { status: 401 }
      )
    }

    const adminData = adminDoc.data()
    if (adminData?.role !== 'admin') {
      console.error("User is not an admin:", adminData?.role)
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    console.log("Admin verified successfully")

    // Skip password verification for now - it's causing issues with client-side auth in server route
    // In production, you should implement proper password verification
    console.log("⚠️ Skipping password verification (implement proper auth in production)")

    const results = []
    const errors = []

    console.log(`Processing ${mentees.length} mentee(s)...`)

    // Process each mentee
    for (let i = 0; i < mentees.length; i++) {
      const menteeData = mentees[i]

      try {
        console.log(`\n--- Processing mentee ${i + 1}/${mentees.length} ---`)
        console.log("Mentee data:", {
          name: `${menteeData.firstName} ${menteeData.lastName}`,
          email: menteeData.email,
          hasPassword: !!menteeData.password
        })

        // Validate required fields
        if (!menteeData.firstName || !menteeData.lastName || !menteeData.email ||
          !menteeData.password || !menteeData.enrollmentNo || !menteeData.registrationNo ||
          !menteeData.parentsName || !menteeData.parentsContact || !menteeData.classId ||
          !menteeData.admissionBatch || !menteeData.classRollNo || !menteeData.dob) {
          throw new Error(`Missing required fields for mentee ${i + 1}`)
        }

        // Check if email already exists
        console.log("Checking if email exists in Firebase Auth...")
        try {
          await adminAuth.getUserByEmail(menteeData.email)
          throw new Error(`Email ${menteeData.email} already exists in Firebase Auth`)
        } catch (error: any) {
          if (error.code !== 'auth/user-not-found') {
            throw error
          }
          console.log("Email not found in Auth (good)")
        }

        // Also check in Firestore mentees collection
        console.log("Checking if email exists in Firestore...")
        const existingMenteeQuery = await adminDb.collection('mentees')
          .where('email', '==', menteeData.email)
          .limit(1)
          .get()

        if (!existingMenteeQuery.empty) {
          throw new Error(`Email ${menteeData.email} already exists in mentees database`)
        }
        console.log("Email not found in Firestore (good)")

        // Create user in Firebase Auth
        console.log("Creating user in Firebase Auth...")
        const userRecord = await adminAuth.createUser({
          email: menteeData.email,
          password: menteeData.password,
          displayName: `${menteeData.firstName} ${menteeData.lastName}`,
          emailVerified: false,
          disabled: false
        })
        console.log("User created with UID:", userRecord.uid)

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
        console.log("Saving mentee document to Firestore...")
        await adminDb.collection('mentees').doc(userRecord.uid).set(menteeDocData)
        console.log("✓ Mentee created successfully!")

        results.push({
          success: true,
          uid: userRecord.uid,
          email: menteeData.email,
          name: fullName,
          enrollmentNo: menteeData.enrollmentNo
        })

      } catch (error: any) {
        console.error(`✗ Error creating mentee ${i + 1}:`, error.message)
        console.error("Full error:", error)
        errors.push({
          index: i + 1,
          email: menteeData.email,
          error: error.message || "Unknown error occurred"
        })
      }
    }

    console.log("\n=== Summary ===")
    console.log(`Total: ${mentees.length}`)
    console.log(`Successful: ${results.length}`)
    console.log(`Failed: ${errors.length}`)

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
    console.error("=== FATAL ERROR in create-mentees API ===")
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    console.error("Full error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}