import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { currentUserId, targetRole } = await request.json()

    console.log('Switch account request:', { currentUserId, targetRole })

    if (!currentUserId || !targetRole) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if user has linked account for the target role
    const linkedAccountsRef = adminDb.collection('linkedAccounts')
    
    // Query for linked account where current user is either adminUID or mentorUID
    const linkedAccountQuery = await linkedAccountsRef
      .where('targetRole', '==', targetRole)
      .get()

    console.log('Found linked accounts:', linkedAccountQuery.docs.length)

    // Find the linked account where current user is involved
    let linkedAccount = null
    let targetUID = null

    for (const doc of linkedAccountQuery.docs) {
      const data = doc.data()
      console.log('Checking linked account:', { 
        adminUID: data.adminUID, 
        mentorUID: data.mentorUID, 
        currentUserId,
        targetRole 
      })
      
      // If switching to mentor role, current user should be adminUID
      if (targetRole === 'mentor' && data.adminUID === currentUserId) {
        linkedAccount = data
        targetUID = data.mentorUID
        console.log('Found mentor switch link:', { linkedAccount, targetUID })
        break
      }
      
      // If switching to admin role, current user should be mentorUID
      if (targetRole === 'admin' && data.mentorUID === currentUserId) {
        linkedAccount = data
        targetUID = data.adminUID
        console.log('Found admin switch link:', { linkedAccount, targetUID })
        break
      }
    }

    if (!linkedAccount || !targetUID) {
      console.log('No linked account found for user:', currentUserId, 'target role:', targetRole)
      return NextResponse.json(
        { error: 'No linked account found for this role' },
        { status: 404 }
      )
    }

    // Verify the target account exists
    const targetUserRecord = await adminAuth.getUser(targetUID)
    if (!targetUserRecord) {
      return NextResponse.json(
        { error: 'Target account not found' },
        { status: 404 }
      )
    }

    // Create custom token for the target account
    const customToken = await adminAuth.createCustomToken(targetUID, {
      role: targetRole,
      linkedFrom: currentUserId,
      linkedOn: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      customToken,
      targetUID,
      targetRole
    })

  } catch (error) {
    console.error('Error in switch-account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}