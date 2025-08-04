import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get all linked accounts
    const linkedAccountsRef = adminDb.collection('linkedAccounts')
    const linkedAccountsSnapshot = await linkedAccountsRef.get()
    
    const linkedAccounts = []
    linkedAccountsSnapshot.forEach((doc) => {
      linkedAccounts.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return NextResponse.json({
      success: true,
      linkedAccounts,
      count: linkedAccounts.length
    })
  } catch (error) {
    console.error('Error fetching linked accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch linked accounts' },
      { status: 500 }
    )
  }
} 