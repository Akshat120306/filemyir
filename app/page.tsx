'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { ArrowRight, CheckCircle, FileText, Shield, Zap, TrendingUp, Users, Clock } from 'lucide-react'

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

  return (
    <div style={{ background: '#0F172A', minHeight: '100vh', color: '#F1F5F9' }}>
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>T</div>
          <span className="font-semibold">TaxOS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm px-4 py-2 rounded-lg font-medium" style={{ color: '#94A3B8' }}>Login</Link>
          <Link href="/assess" className="text-sm px-4 py-2 rounded-lg font-medium text-white" style={{ background: '#3B82F6' }}>Get Started</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8" style={{ background: 'rgba(59,130,246,0.14)', color: '#7CB0FB', border: '1px solid rgba(59,130,246,0.2)' }}>
          <Zap size={12} /> Trusted by clients across India
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6" style={{ letterSpacing: '-0.5px' }}>
          File your ITR without the chaos
        </h1>
        <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: '#94A3B8' }}>
          A modern client portal for income tax filing. Know exactly what documents you need, track your return in real time, and never miss a deadline.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/assess" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
            Check which ITR you need <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium" style={{ background: '#1E293B', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
            Client Login
          </Link>
        </div>
        <p className="mt-4 text-sm" style={{ color: '#64748B' }}>Free assessment · No signup required</p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-center text-2xl font-bold mb-3">How it works</h2>
        <p className="text-center mb-14" style={{ color: '#94A3B8' }}>From confusion to filed ITR in 4 simple steps</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map(({ step, title, desc }) => (
            <div key={step} className="p-6 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div className="text-xs font-bold mb-4" style={{ color: '#3B82F6' }}>{step}</div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to file stress-free?</h2>
        <p className="mb-8" style={{ color: '#94A3B8' }}>Take the 2-minute assessment. Find out exactly what you need.</p>
        <Link href="/assess" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
          Start Free Assessment <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="text-center py-8 text-sm" style={{ color: '#64748B', borderTop: '1px solid #1F2C42' }}>
        2025 TaxOS
      </footer>
    </div>
  )
}
