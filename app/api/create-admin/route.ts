import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🚀 Single admin creation API called')
  
  try {
    // Check environment variables first
    console.log('🔍 Checking environment variables...')
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('❌ Missing Firebase Admin SDK environment variables')
      return NextResponse.json(
        { 
          error: 'Server configuration error: Missing Firebase Admin SDK credentials',
          details: 'Please check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables'
        },
        { status: 500 }
      )
    }

    // Import Firebase Admin SDK dynamically to catch initialization errors
    console.log('📦 Importing Firebase Admin SDK...')
    let adminAuth, adminDb
    try {
      const firebaseAdmin = await import('@/lib/firebase-admin')
      adminAuth = firebaseAdmin.adminAuth
      adminDb = firebaseAdmin.adminDb
      console.log('✅ Firebase Admin SDK imported successfully')
    } catch (importError: any) {
      console.error('❌ Error importing Firebase Admin SDK:', importError)
      return NextResponse.json(
        { 
          error: 'Firebase Admin SDK initialization failed',
          details: importError.message
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { adminData, superAdminToken } = body
    console.log('📝 Request data:', { 
      adminFirstName: adminData?.firstName,
      adminLastName: adminData?.lastName,
      adminId: adminData?.adminId,
      adminEmail: adminData?.email,
      hasToken: !!superAdminToken 
    })

    // Verify the super admin token
    if (!superAdminToken) {
      console.log('❌ No super admin token provided')
      return NextResponse.json(
        { error: 'Super admin token required' },
        { status: 401 }
      )
    }

    // Verify the token with Firebase Admin
    console.log('🔐 Verifying super admin token...')
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(superAdminToken)
      console.log('✅ Token verified for user:', decodedToken.uid)
    } catch (tokenError: any) {
      console.error('❌ Token verification failed:', tokenError)
      return NextResponse.json(
        { error: 'Invalid super admin token', details: tokenError.message },
        { status: 401 }
      )
    }
    
    // Check if the user is a super admin
    console.log('👤 Checking super admin role...')
    const superAdminDoc = await adminDb
      .collection('super-admins')
      .doc(decodedToken.uid)
      .get()

    if (!superAdminDoc.exists || superAdminDoc.data()?.role !== 'super-admin') {
      console.log('❌ User is not a super admin')
      return NextResponse.json(
        { error: 'Unauthorized: Only super admins can create admin accounts' },
        { status: 403 }
      )
    }

    console.log('✅ Super admin authorization confirmed')

    // Create admin account using Firebase Admin SDK
    console.log('🔨 Creating Firebase Auth account...')
    const displayName = adminData.middleName 
      ? `${adminData.firstName} ${adminData.middleName} ${adminData.lastName}`
      : `${adminData.firstName} ${adminData.lastName}`
    
    const userRecord = await adminAuth.createUser({
      email: adminData.email,
      password: adminData.password,
      displayName,
      emailVerified: true,
    })
    console.log('✅ Auth account created:', userRecord.uid)

    // Save admin data to Firestore using Admin SDK
    console.log('💾 Saving admin data to Firestore...')
    const adminDocData = {
      uid: userRecord.uid,
      email: userRecord.email,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      middleName: adminData.middleName || undefined,
      adminId: adminData.adminId,
      role: 'admin',
      createdBy: decodedToken.uid,
      createdAt: new Date().toISOString(),
      isActive: true,
    }

    await adminDb
      .collection('admins')
      .doc(userRecord.uid)
      .set(adminDocData)
    console.log('✅ Admin data saved to Firestore')

    console.log('🎉 Single admin creation completed successfully')
    const fullName = adminData.middleName 
      ? `${adminData.firstName} ${adminData.middleName} ${adminData.lastName}`
      : `${adminData.firstName} ${adminData.lastName}`
    
    return NextResponse.json({
      success: true,
      admin: adminDocData,
      message: `Admin ${fullName} (${adminData.adminId}) created successfully`
    })

  } catch (error: any) {
    console.error('❌ Critical error in single admin creation API:', error)
    console.error('🔍 Error stack:', error.stack)
    
    return NextResponse.json(
      { 
        error: 'Failed to create admin account',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}