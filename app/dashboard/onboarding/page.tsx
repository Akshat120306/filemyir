'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/lib/AuthContext'
import { createLead, getLeadByEmail } from '@/lib/leads'
import { useToast } from '@/components/ui/Toast'
import { FileText, User, Phone, CreditCard, ChevronRight, CheckCircle } from 'lucide-react'
import { IncomeType } from '@/types'

const incomeOptions: { value: IncomeType; label: string; desc: string }[] = [
  { value: 'salary',        label: 'Salary / Job',           desc: 'Income from employment' },
  { value: 'business',      label: 'Business',               desc: 'Business income or turnover' },
  { value: 'freelance',     label: 'Freelance / Consulting', desc: 'Professional fees, contracts' },
  { value: 'rental',        label: 'Rental Income',          desc: 'From property you own' },
  { value: 'capital_gains', label: 'Capital Gains',          desc: 'Stocks, mutual funds, property sale' },
  { value: 'other',         label: 'Other Income',           desc: 'Interest, dividends, gifts, etc.' },
]

function itrFromIncome(types: IncomeType[]): { itr: string; label: string; complexity: 'simple' | 'moderate' | 'complex'; docs: string[] } {
  if (types.includes('business') || types.includes('freelance'))
    return { itr: 'ITR-3', label: 'ITR-3 · Complex',  complexity: 'complex',  docs: ['PAN', 'Aadhaar', 'Form 26AS / AIS', 'P&L Statement', 'Balance Sheet', 'Bank Statements'] }
  if (types.includes('capital_gains') || types.includes('rental') || types.length > 1)
    return { itr: 'ITR-2', label: 'ITR-2 · Moderate', complexity: 'moderate', docs: ['PAN', 'Aadhaar', 'Form 16', 'Capital Gains Statement', 'Bank Statements'] }
  return   { itr: 'ITR-1', label: 'ITR-1 · Simple',   complexity: 'simple',   docs: ['PAN', 'Aadhaar', 'Form 16', 'AIS / Form 26AS'] }
}

type StoredAssessment = { incomeTypes: IncomeType[]; itr: string; complexity: 'simple' | 'moderate' | 'complex'; docs: string[] }

function OnboardingContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Data from public assessment (if user came via /assess flow)
  const [stored, setStored] = useState<StoredAssessment | null>(null)

  // Personal detail fields
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [pan, setPan]     = useState('')

  // Income fields (only used when no sessionStorage)
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([])

  // step: 'income' only shown when no sessionStorage; 'details' always shown
  const [step, setStep] = useState<'income' | 'details'>('income')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user?.displayName) setName(user.displayName)
    try {
      const raw = sessionStorage.getItem('taxos_assessment')
      if (raw) {
        const parsed: StoredAssessment = JSON.parse(raw)
        setStored(parsed)
        setStep('details') // skip income step
      }
    } catch { /* sessionStorage unavailable */ }
  }, [user])

  function toggleIncome(v: IncomeType) {
    setIncomeTypes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const liveRec = itrFromIncome(incomeTypes)

  async function submit() {
    if (!user?.email) return
    if (!name.trim() || !phone.trim()) { toast('Name and phone are required', 'error'); return }
    setBusy(true)
    try {
      const existing = await getLeadByEmail(user.email)
      if (existing) {
        // Lead already created (e.g. via /assess flow) — nothing to do
        sessionStorage.removeItem('taxos_assessment')
        router.push('/dashboard/pending'); return
      }

      const assessment = stored ?? {
        incomeTypes,
        itr: liveRec.itr,
        complexity: liveRec.complexity,
        docs: liveRec.docs,
      }

      const leadData: Parameters<typeof createLead>[0] = {
        name: name.trim(),
        phone: phone.trim(),
        email: user.email,
        incomeTypes: assessment.incomeTypes,
        recommendedItr: assessment.itr,
        requiredDocs: assessment.docs,
        complexity: assessment.complexity,
        status: 'new',
        source: stored ? 'assessment' : 'direct',
      }
      if (pan.trim()) leadData.pan = pan.trim().toUpperCase()

      await createLead(leadData)
      sessionStorage.removeItem('taxos_assessment')
      router.push('/dashboard/pending')
    } catch (e: unknown) {
      console.error('Onboarding error:', e)
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error')
    } finally { setBusy(false) }
  }

  const totalSteps = stored ? 1 : 2
  const currentStep = stored ? 1 : step === 'income' ? 1 : 2

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
              <FileText size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl">TaxOS</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Almost there</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>Tell us a little more so your consultant can get started</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i < currentStep ? '#3B82F6' : '#1F2C42' }} />
          ))}
        </div>

        <div className="p-6 rounded-2xl space-y-5" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>

          {/* ── INCOME STEP (only when no sessionStorage) ── */}
          {step === 'income' && !stored && (
            <>
              <div>
                <h2 className="font-semibold text-lg">Income Sources</h2>
                <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Select all that apply for FY 2024-25</p>
              </div>
              <div className="space-y-2">
                {incomeOptions.map(opt => {
                  const selected = incomeTypes.includes(opt.value)
                  return (
                    <button key={opt.value} onClick={() => toggleIncome(opt.value)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{ background: selected ? 'rgba(59,130,246,0.12)' : '#141E33', border: `1px solid ${selected ? '#3B82F6' : '#2A3A55'}` }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: selected ? '#3B82F6' : 'transparent', border: selected ? 'none' : '1.5px solid #2A3A55' }}>
                        {selected && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{opt.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {incomeTypes.length > 0 && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Recommended form</p>
                  <p className="font-semibold text-sm mt-0.5" style={{ color: '#7CB0FB' }}>{liveRec.label}</p>
                </div>
              )}
              <button onClick={() => setStep('details')}
                className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2"
                style={{ background: '#3B82F6' }}>
                Next <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* ── DETAILS STEP ── */}
          {step === 'details' && (
            <>
              <div>
                <h2 className="font-semibold text-lg">Your Details</h2>
                <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>So your consultant knows who you are</p>
              </div>

              {/* Assessment summary banner (when coming from /assess) */}
              {stored && (
                <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <CheckCircle size={16} style={{ color: '#3B82F6', flexShrink: 0 }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#94A3B8' }}>Based on your assessment</p>
                    <p className="text-sm font-semibold" style={{ color: '#7CB0FB' }}>
                      {stored.itr} · {stored.complexity.charAt(0).toUpperCase() + stored.complexity.slice(1)} Filing
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>
                  <User size={12} /> Full Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="As on PAN card"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>
                  <Phone size={12} /> Phone Number <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>
                  <CreditCard size={12} /> PAN Number
                  <span className="font-normal" style={{ color: '#64748B' }}>(optional)</span>
                </label>
                <input value={pan} onChange={e => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono tracking-widest"
                  style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
              </div>

              <div>
                <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Your email</p>
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#141E33', border: '1px solid #1F2C42', color: '#64748B' }}>
                  {user?.email}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                {!stored && (
                  <button onClick={() => setStep('income')} className="flex-1 py-3 rounded-xl text-sm"
                    style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>
                    Back
                  </button>
                )}
                <button onClick={submit} disabled={busy}
                  className="flex-1 py-3 rounded-xl font-medium text-white"
                  style={{ background: busy ? '#2A3A55' : '#3B82F6' }}>
                  {busy ? 'Submitting...' : 'Submit Details'}
                </button>
              </div>
              <p className="text-center text-xs" style={{ color: '#64748B' }}>
                Your consultant will review and reach out to set up your account
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  )
}
