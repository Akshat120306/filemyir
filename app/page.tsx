'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { ArrowRight, CheckCircle, Zap, Shield, Phone, Award } from 'lucide-react'
import Logo from '@/components/ui/Logo'

export default function HomePage() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace(isAdmin ? '/admin' : '/dashboard')
  }, [user, loading, isAdmin, router])

  const steps = [
    { step: '01', title: '2-min Assessment', desc: 'Answer 6 questions about your income. Get your ITR type instantly.' },
    { step: '02', title: 'See What You Need', desc: 'Get a precise document checklist tailored to your income profile.' },
    { step: '03', title: 'We Contact You', desc: 'Share your details. Our consultant calls within 24 hours.' },
    { step: '04', title: 'Track in Real Time', desc: 'Upload docs, track status, get your filed ITR — all in one place.' },
  ]

  const trustPoints = [
    { icon: Award,  text: '10+ Years Experience' },
    { icon: CheckCircle, text: '100% Secure & Confidential' },
  ]

  return (
    <div style={{ background: '#0F172A', minHeight: '100vh', color: '#F1F5F9' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-5 md:px-8 py-5 max-w-6xl mx-auto">
        <Logo size={36} />
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/login" className="text-sm px-4 py-2 rounded-lg font-medium" style={{ color: '#94A3B8' }}>Login</Link>
          <Link href="/assess" className="text-sm px-4 py-2 rounded-lg font-medium text-white" style={{ background: '#3B82F6' }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 md:px-6 pt-16 md:pt-20 pb-20 md:pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 md:mb-8"
          style={{ background: 'rgba(59,130,246,0.14)', color: '#7CB0FB', border: '1px solid rgba(59,130,246,0.2)' }}>
          <Zap size={12} /> Trusted by clients across India
        </div>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-5 md:mb-6" style={{ letterSpacing: '-0.5px' }}>
          File your ITR without the chaos
        </h1>
        <p className="text-base md:text-xl mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: '#94A3B8' }}>
          A modern client portal for income tax filing. Know exactly what documents you need, track your return in real time, and never miss a deadline.
        </p>
        <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
          <Link href="/assess" className="inline-flex items-center gap-2 px-5 md:px-6 py-3 md:py-3.5 rounded-xl font-semibold text-white text-sm md:text-base"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
            Check which ITR you need <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 px-5 md:px-6 py-3 md:py-3.5 rounded-xl font-medium text-sm md:text-base"
            style={{ background: '#1E293B', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
            Client Login
          </Link>
        </div>
        <p className="mt-4 text-sm" style={{ color: '#64748B' }}>Free assessment · No signup required</p>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-5 md:px-6 pb-20 md:pb-24">
        <h2 className="text-center text-xl md:text-2xl font-bold mb-3">How it works</h2>
        <p className="text-center mb-10 md:mb-14 text-sm md:text-base" style={{ color: '#94A3B8' }}>From confusion to filed ITR in 4 simple steps</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {steps.map(({ step, title, desc }) => (
            <div key={step} className="p-4 md:p-6 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div className="text-xs font-bold mb-3 md:mb-4" style={{ color: '#3B82F6' }}>{step}</div>
              <h3 className="font-semibold mb-1.5 md:mb-2 text-sm md:text-base">{title}</h3>
              <p className="text-xs md:text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust / Consultant section */}
      <section className="max-w-4xl mx-auto px-5 md:px-6 pb-20 md:pb-24">
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-10">

            {/* Consultant info */}
            <div className="flex-shrink-0 text-center md:text-left">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto md:mx-0 mb-4"
                style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', color: '#FCD34D' }}>
                ED
              </div>
              <h3 className="text-lg font-bold" style={{ color: '#F1F5F9' }}>Ekta Dhall</h3>
              <p className="text-sm font-medium mt-0.5" style={{ color: '#7CB0FB' }}>Advocate</p>
              <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Ekta Tax Consultants</p>
              <a href="tel:8585988581" className="inline-flex items-center gap-2 mt-3 text-sm font-medium px-4 py-2 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.1)', color: '#7CB0FB', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Phone size={13} /> 85859 88581
              </a>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px self-stretch" style={{ background: '#1F2C42' }} />
            <div className="md:hidden w-full h-px" style={{ background: '#1F2C42' }} />

            {/* Trust points */}
            <div className="flex-1 w-full">
              <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-center md:text-left" style={{ color: '#64748B' }}>Why clients trust us</p>
              <div className="space-y-3">
                {trustPoints.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <Icon size={15} style={{ color: '#7CB0FB' }} />
                    </div>
                    <span className="text-sm" style={{ color: '#94A3B8' }}>{text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid #1F2C42' }}>
                <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
                  Ekta Tax Consultants has been helping individuals and businesses with income tax filing, compliance, and advisory services. Every return is personally reviewed and filed by a qualified advocate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-5 md:px-6 pb-20 md:pb-24 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to file stress-free?</h2>
        <p className="mb-8 text-sm md:text-base" style={{ color: '#94A3B8' }}>Take the 2-minute assessment. Find out exactly what you need.</p>
        <Link href="/assess" className="inline-flex items-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-xl font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
          Start Free Assessment <ArrowRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1F2C42' }}>
        <div className="max-w-5xl mx-auto px-5 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={28} />
          <div className="text-center md:text-right">
            <p className="text-sm" style={{ color: '#64748B' }}>Ekta Tax Consultants · Ekta Dhall, Advocate</p>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>© 2025 FilemyITR · All rights reserved</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
