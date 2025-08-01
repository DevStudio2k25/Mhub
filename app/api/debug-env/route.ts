import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const host = request.headers.get('host')
        const origin = request.headers.get('origin')
        
        return NextResponse.json({
            environment: {
                host,
                origin,
                isLocalhost: host?.includes('localhost') || host?.includes('127.0.0.1'),
                nodeEnv: process.env.NODE_ENV
            },
            firebase: {
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
                clientEmailDomain: process.env.FIREBASE_CLIENT_EMAIL?.split('@')[1]
            },
            timestamp: new Date().toISOString()
        })
    } catch (error: any) {
        return NextResponse.json({
            error: 'Debug endpoint failed',
            details: error.message
        }, { status: 500 })
    }
}