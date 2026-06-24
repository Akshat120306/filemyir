import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ found: false })

  try {
    const db = getAdmin()
    const [leadSnap, clientSnap] = await Promise.all([
      db.collection('leads').where('email', '==', email).limit(1).get(),
      db.collection('clients').where('email', '==', email).limit(1).get(),
    ])
    return NextResponse.json({ found: !leadSnap.empty || !clientSnap.empty })
  } catch (err) {
    console.error('check-lead error:', err)
    return NextResponse.json({ found: false, error: true })
  }
}
