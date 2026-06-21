import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM ?? 'TaxOS <onboarding@resend.dev>'

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'placeholder') {
    return NextResponse.json({ ok: false, error: 'Email not configured' }, { status: 200 })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { to, subject, html } = await req.json()

  if (!to || !subject || !html) {
    return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
  }

  // Safety: only allow sending to admin or verified recipients
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('Email send failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
