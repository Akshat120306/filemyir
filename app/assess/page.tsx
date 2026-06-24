'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Check, ChevronRight, User, Phone, Mail, AlertTriangle, FileText, Shield } from 'lucide-react'
import { createLead } from '@/lib/leads'
import { notifyAdmin } from '@/lib/notifications'
import { saveAssessment, computeRecommendation, answersToIncomeTypes, AssessmentAnswers, AssessmentResult } from '@/lib/assessments'

// ── Questions config ────────────────────────────────────────────────────────

const FILING_TYPES = [
  { id: 'individual', label: 'Individual',    icon: '👤', desc: 'Salaried, freelancer, investor, pensioner' },
  { id: 'huf',        label: 'HUF',           icon: '🏠', desc: 'Hindu Undivided Family' },
  { id: 'firm',       label: 'Firm',          icon: '🏢', desc: 'Partnership firm' },
  { id: 'llp',        label: 'LLP',           icon: '⚖️',  desc: 'Limited Liability Partnership' },
  { id: 'company',    label: 'Company',       icon: '🏭', desc: 'Private or Public Limited Company' },
]

const INCOME_SOURCES = [
  { id: 'interest',     label: 'Bank Interest',            desc: 'Savings account interest' },
  { id: 'fd',           label: 'Fixed Deposits',           desc: 'FD interest income' },
  { id: 'rental',       label: 'Rental Income',            desc: 'Rent from property' },
  { id: 'freelance',    label: 'Freelancing',              desc: 'Freelance projects and contracts' },
  { id: 'professional', label: 'Professional Services',    desc: 'Doctor, lawyer, CA, architect' },
  { id: 'business',     label: 'Business Income',          desc: 'Shop, firm, trading business' },
  { id: 'stocks',       label: 'Stock Trading',            desc: 'Equity shares, intraday trading' },
  { id: 'mutual_funds', label: 'Mutual Funds',             desc: 'SIPs, lump sum investments' },
  { id: 'crypto',       label: 'Cryptocurrency',           desc: 'Bitcoin, Ethereum, VDAs' },
  { id: 'foreign',      label: 'Foreign Income',           desc: 'Income from abroad, NRI income' },
  { id: 'agricultural', label: 'Agricultural Income',      desc: 'Farming and related income' },
  { id: 'none',         label: 'None of the above',        desc: '' },
]

const SOLD_ASSETS = [
  { id: 'stocks',       label: 'Stocks / Shares',          desc: 'Listed or unlisted equity' },
  { id: 'mutual_funds', label: 'Mutual Funds',             desc: 'Redeemed MF units' },
  { id: 'property',     label: 'Property / Land',          desc: 'House, flat, commercial, plot' },
  { id: 'gold',         label: 'Gold / Silver',            desc: 'Physical gold, gold bonds' },
  { id: 'none',         label: 'None',                     desc: "I didn't sell anything" },
]

type Step = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'result' | 'contact' | 'done'

const STEP_ORDER: Step[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'result', 'contact', 'done']

// ── Color helpers ───────────────────────────────────────────────────────────

const complexityColor = {
  simple:   { text: '#22C55E', bg: 'rgba(34,197,94,0.12)',  label: 'Simple Filing' },
  moderate: { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Moderate Filing' },
  complex:  { text: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Complex Filing' },
}

const itrColor: Record<string, { color: string; bg: string }> = {
  'ITR-1': { color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  'ITR-2': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  'ITR-3': { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  'ITR-4': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  'CONSULTANT REVIEW': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
}

// Group docs by category for display
function groupDocs(docs: ReturnType<typeof computeRecommendation>['requiredDocs']) {
  const map = new Map<string, typeof docs>()
  for (const d of docs) {
    if (!map.has(d.category)) map.set(d.category, [])
    map.get(d.category)!.push(d)
  }
  return map
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AssessPage() {
  const router = useRouter()

  const [step, setStep]         = useState<Step>('q1')
  const [visible, setVisible]   = useState(true)
  const [answers, setAnswers]   = useState<Partial<AssessmentAnswers>>({})
  const [result, setResult]     = useState<AssessmentResult | null>(null)
  // assessmentId is written only after contact form is submitted — no early save needed

  // Contact form
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  // Multi-select states
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [selectedAssets,  setSelectedAssets]  = useState<Set<string>>(new Set())

  // Animated transition
  function transition(nextStep: Step) {
    setVisible(false)
    setTimeout(() => { setStep(nextStep); setVisible(true) }, 220)
  }

  function goNext(nextStep: Step) { transition(nextStep) }

  // Keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && step === 'result') goNext('contact')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  // Progress
  const questionSteps: Step[] = ['q1','q2','q3','q4','q5','q6','q7']
  const progressSteps: Step[] = ['q1','q2','q3','q4','q5','q6','q7','result','contact']
  const currentIdx  = progressSteps.indexOf(step)
  const progressPct = step === 'done' ? 100 : Math.round(((currentIdx) / (progressSteps.length - 1)) * 100)

  // ── Single-select handler ─────────────────────────────────────────────────
  function handleSingle(key: keyof AssessmentAnswers, value: unknown, next: Step) {
    const updated = { ...answers, [key]: value }
    setAnswers(updated)

    // If Q1 and not individual → skip to result immediately
    if (key === 'filingType' && value !== 'individual') {
      const finalAnswers = { ...updated, hasSalary: false, incomeSources: [], soldAssets: [], multipleHouse: false, foreignAssets: false, selfEmployed: false } as AssessmentAnswers
      const rec = computeRecommendation(finalAnswers)
      setResult(rec)
      transition('result')
      return
    }
    setTimeout(() => goNext(next), 160)
  }

  // ── Multi-select: income sources ─────────────────────────────────────────
  function toggleSource(id: string) {
    setSelectedSources(prev => {
      const n = new Set(prev)
      if (id === 'none') { n.clear(); n.add('none'); return n }
      n.delete('none')
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleAsset(id: string) {
    setSelectedAssets(prev => {
      const n = new Set(prev)
      if (id === 'none') { n.clear(); n.add('none'); return n }
      n.delete('none')
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function confirmSources() {
    const arr = Array.from(selectedSources).filter(s => s !== 'none')
    const updated = { ...answers, incomeSources: arr }
    setAnswers(updated)
    goNext('q4')
  }

  function confirmAssets() {
    const arr = Array.from(selectedAssets).filter(s => s !== 'none')
    const updated = { ...answers, soldAssets: arr }
    setAnswers(updated)
    goNext('q5')
  }

  // ── Compute & show result ─────────────────────────────────────────────────
  function computeAndShow(finalAnswers: AssessmentAnswers) {
    const rec = computeRecommendation(finalAnswers)
    setResult(rec)
    sessionStorage.setItem('taxos_assessment', JSON.stringify({
      incomeTypes: answersToIncomeTypes(finalAnswers),
      itr: rec.itr,
      complexity: rec.complexity,
      docs: rec.requiredDocs.filter(d => d.required).map(d => d.name),
    }))
    transition('result')
  }

  function handleQ7(selfEmployed: boolean) {
    const finalAnswers: AssessmentAnswers = {
      filingType: answers.filingType ?? 'individual',
      hasSalary: answers.hasSalary ?? false,
      incomeSources: answers.incomeSources ?? [],
      soldAssets: answers.soldAssets ?? [],
      multipleHouse: answers.multipleHouse ?? false,
      foreignAssets: answers.foreignAssets ?? false,
      selfEmployed,
    }
    setAnswers(finalAnswers)
    computeAndShow(finalAnswers)
  }

  // ── Contact form submit ───────────────────────────────────────────────────
  async function handleContact() {
    if (!name.trim() || !phone.trim() || !email.trim()) { setError('All fields are required'); return }
    if (name.trim().length < 2) { setError('Enter your full name'); return }
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) { setError('Enter a valid 10-digit Indian mobile number'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address'); return }
    setBusy(true); setError('')
    try {
      const finalAnswers = answers as AssessmentAnswers
      const incomeTypes  = answersToIncomeTypes(finalAnswers)
      const docs         = result!.requiredDocs.filter(d => d.required).map(d => d.name)
      const contactInfo  = { name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase() }

      // Create lead first
      const leadId = await createLead({
        ...contactInfo,
        incomeTypes, recommendedItr: result!.itr,
        requiredDocs: docs, complexity: result!.complexity,
        status: 'new', source: 'assessment',
      })

      // Save assessment with leadId included in the same write (no update needed → no auth required)
      await saveAssessment({ answers: finalAnswers, result: result!, leadInfo: contactInfo, leadId })

      // Notify admin of new lead (fire-and-forget, don't block UI)
      notifyAdmin(
        '🧾 New lead from assessment',
        `${contactInfo.name} · ${contactInfo.phone} · ${result!.itr}`,
        'new_lead'
      ).catch(() => {})

      // Update sessionStorage for post-login onboarding pre-fill
      const stored = JSON.parse(sessionStorage.getItem('taxos_assessment') ?? '{}')
      sessionStorage.setItem('taxos_assessment', JSON.stringify({ ...stored, ...contactInfo }))

      transition('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const itrC = result ? (itrColor[result.itr] ?? itrColor['ITR-2']) : itrColor['ITR-2']

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0F1E', color: '#F1F5F9' }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>T</div>
          <span className="font-semibold text-sm">TaxOS</span>
        </Link>
        {step !== 'done' && (
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#64748B' }}>{progressPct}% complete</span>
            <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: '#1E293B' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: progressPct + '%', background: 'linear-gradient(90deg,#3B82F6,#8B5CF6)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 0.25s ease, transform 0.25s ease' }}>

          {/* ── Q1: Filing type ── */}
          {step === 'q1' && (
            <Question step="1" total="7" label="Let's get started">
              <h2 className="text-2xl font-bold mb-2">Who are you filing taxes as?</h2>
              <p className="text-sm mb-7" style={{ color: '#64748B' }}>Select the option that applies to you for FY 2024-25</p>
              <div className="space-y-2.5">
                {FILING_TYPES.map(opt => (
                  <button key={opt.id} onClick={() => handleSingle('filingType', opt.id, 'q2')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.01]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{opt.desc}</p>
                    </div>
                    <ChevronRight size={16} style={{ color: '#334155' }} />
                  </button>
                ))}
              </div>
            </Question>
          )}

          {/* ── Q2: Salary ── */}
          {step === 'q2' && (
            <Question step="2" total="7" onBack={() => goNext('q1')} label="Income">
              <h2 className="text-2xl font-bold mb-2">Did you earn <span style={{ color: '#7CB0FB' }}>salary income</span> this financial year?</h2>
              <p className="text-sm mb-8" style={{ color: '#64748B' }}>This includes income from employment, pension, or company payroll</p>
              <div className="grid grid-cols-2 gap-3">
                {[['Yes', true, '💼', 'I received a salary or pension'], ['No', false, '🙅', "I didn't have a salary"]].map(([label, val, emoji, sub]) => (
                  <button key={String(val)} onClick={() => handleSingle('hasSalary', val, 'q3')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-3xl">{emoji as string}</span>
                    <p className="font-bold text-lg">{label as string}</p>
                    <p className="text-xs text-center" style={{ color: '#64748B' }}>{sub as string}</p>
                  </button>
                ))}
              </div>
            </Question>
          )}

          {/* ── Q3: Income sources (multi) ── */}
          {step === 'q3' && (
            <Question step="3" total="7" onBack={() => goNext('q2')} label="Income Sources">
              <h2 className="text-2xl font-bold mb-2">Did you receive income from any of these?</h2>
              <p className="text-sm mb-6" style={{ color: '#64748B' }}>Select all that apply — apart from salary</p>
              <div className="space-y-2 mb-6 max-h-80 overflow-y-auto pr-1">
                {INCOME_SOURCES.map(opt => {
                  const selected = selectedSources.has(opt.id)
                  return (
                    <button key={opt.id} onClick={() => toggleSource(opt.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{ background: selected ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selected ? '#3B82F6' : 'rgba(255,255,255,0.07)'}` }}>
                      <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: selected ? '#3B82F6' : 'transparent', border: selected ? 'none' : '1.5px solid #334155' }}>
                        {selected && <Check size={11} className="text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: selected ? '#F1F5F9' : '#94A3B8' }}>{opt.label}</p>
                        {opt.desc && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{opt.desc}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
              <button onClick={confirmSources}
                disabled={selectedSources.size === 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all"
                style={{ background: selectedSources.size === 0 ? '#1E293B' : 'linear-gradient(135deg,#3B82F6,#6366F1)', color: selectedSources.size === 0 ? '#475569' : '#fff' }}>
                Continue <ArrowRight size={16} />
              </button>
            </Question>
          )}

          {/* ── Q4: Sold assets ── */}
          {step === 'q4' && (
            <Question step="4" total="7" onBack={() => goNext('q3')} label="Capital Gains">
              <h2 className="text-2xl font-bold mb-2">Did you <span style={{ color: '#F59E0B' }}>sell</span> any of the following this year?</h2>
              <p className="text-sm mb-6" style={{ color: '#64748B' }}>This helps us identify whether you have capital gains to report</p>
              <div className="space-y-2.5 mb-6">
                {SOLD_ASSETS.map(opt => {
                  const selected = selectedAssets.has(opt.id)
                  return (
                    <button key={opt.id} onClick={() => toggleAsset(opt.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                      style={{ background: selected ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selected ? '#F59E0B' : 'rgba(255,255,255,0.07)'}` }}>
                      <div className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: selected ? '#F59E0B' : 'transparent', border: selected ? 'none' : '1.5px solid #334155' }}>
                        {selected && <Check size={11} style={{ color: '#0F172A' }} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: selected ? '#F1F5F9' : '#94A3B8' }}>{opt.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{opt.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <button onClick={confirmAssets}
                disabled={selectedAssets.size === 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all"
                style={{ background: selectedAssets.size === 0 ? '#1E293B' : 'linear-gradient(135deg,#3B82F6,#6366F1)', color: selectedAssets.size === 0 ? '#475569' : '#fff' }}>
                Continue <ArrowRight size={16} />
              </button>
            </Question>
          )}

          {/* ── Q5: Multiple house ── */}
          {step === 'q5' && (
            <Question step="5" total="7" onBack={() => goNext('q4')} label="Property">
              <h2 className="text-2xl font-bold mb-2">Do you own <span style={{ color: '#B6A0FA' }}>more than one</span> house property?</h2>
              <p className="text-sm mb-8" style={{ color: '#64748B' }}>This includes self-occupied, let-out, or deemed let-out properties</p>
              <YesNoButtons
                onYes={() => handleSingle('multipleHouse', true, 'q6')}
                onNo={() => handleSingle('multipleHouse', false, 'q6')} />
            </Question>
          )}

          {/* ── Q6: Foreign assets ── */}
          {step === 'q6' && (
            <Question step="6" total="7" onBack={() => goNext('q5')} label="Foreign Assets">
              <h2 className="text-2xl font-bold mb-2">Do you have any <span style={{ color: '#F59E0B' }}>foreign assets, investments, or income</span>?</h2>
              <p className="text-sm mb-8" style={{ color: '#64748B' }}>Includes foreign bank accounts, ESOP from foreign companies, or income from overseas employment</p>
              <YesNoButtons
                onYes={() => handleSingle('foreignAssets', true, 'q7')}
                onNo={() => handleSingle('foreignAssets', false, 'q7')} />
            </Question>
          )}

          {/* ── Q7: Self-employed ── */}
          {step === 'q7' && (
            <Question step="7" total="7" onBack={() => goNext('q6')} label="Self-Employment">
              <h2 className="text-2xl font-bold mb-2">Are you <span style={{ color: '#5BE090' }}>self-employed</span>, a freelancer, consultant, or business owner?</h2>
              <p className="text-sm mb-8" style={{ color: '#64748B' }}>Even part-time or side income from business or professional services counts</p>
              <YesNoButtons
                onYes={() => handleQ7(true)}
                onNo={() => handleQ7(false)} />
            </Question>
          )}

          {/* ── RESULT ── */}
          {step === 'result' && result && (
            <div>
              {/* Header */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                  <Check size={13} style={{ color: '#22C55E' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: '#22C55E' }}>Assessment complete</p>
              </div>

              <h2 className="text-xl font-bold mb-1">Your Tax Filing Recommendation</h2>
              <p className="text-sm mb-7" style={{ color: '#64748B' }}>Based on your responses. Final review will be performed by a tax professional.</p>

              {/* Main result card */}
              <div className="p-6 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>

                {/* ITR type + confidence */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#475569', letterSpacing: '0.08em' }}>RECOMMENDED RETURN</p>
                    <p className="text-4xl font-black" style={{ color: itrC.color, letterSpacing: '-1px' }}>{result.itr}</p>
                    {result.itrNote && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <AlertTriangle size={12} style={{ color: '#F59E0B' }} />
                        <p className="text-xs" style={{ color: '#F59E0B' }}>{result.itrNote}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs mb-1" style={{ color: '#475569' }}>CONFIDENCE</p>
                    <p className="text-3xl font-black" style={{ color: '#F1F5F9' }}>{result.confidence}%</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: complexityColor[result.complexity].bg, color: complexityColor[result.complexity].text }}>
                      {complexityColor[result.complexity].label}
                    </span>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: '#1E293B' }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: result.confidence + '%', background: `linear-gradient(90deg, ${itrC.color}, ${itrC.color}99)` }} />
                </div>

                {/* Reasons */}
                <div className="space-y-2">
                  {result.reasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
                        <Check size={10} style={{ color: '#22C55E' }} />
                      </div>
                      <span style={{ color: '#CBD5E1' }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <Shield size={14} style={{ color: '#7CB0FB', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                  <span className="font-medium" style={{ color: '#7CB0FB' }}>Not a legal determination.</span> This is a preliminary recommendation only. Final ITR form selection will be confirmed by your tax consultant before filing.
                </p>
              </div>

              {/* Doc checklist preview */}
              <div className="p-5 rounded-2xl mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold mb-4" style={{ color: '#475569', letterSpacing: '0.08em' }}>DOCUMENTS YOU WILL LIKELY NEED</p>
                {Array.from(groupDocs(result.requiredDocs)).map(([category, items]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>{category}</p>
                    <div className="space-y-1.5">
                      {items.map(d => (
                        <div key={d.name} className="flex items-start gap-2.5">
                          <FileText size={12} style={{ color: d.required ? '#3B82F6' : '#475569', flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <span className="text-xs" style={{ color: d.required ? '#CBD5E1' : '#64748B' }}>{d.name}</span>
                            {!d.required && <span className="text-xs ml-1" style={{ color: '#475569' }}>(optional)</span>}
                            {d.note && <p className="text-xs" style={{ color: '#475569' }}>{d.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => goNext('contact')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', fontSize: '15px' }}>
                Get Started with a Consultant <ArrowRight size={17} />
              </button>
              <p className="text-center text-xs mt-3" style={{ color: '#475569' }}>
                Already have an account? <Link href="/login" style={{ color: '#7CB0FB' }}>Log in</Link>
              </p>
            </div>
          )}

          {/* ── CONTACT FORM ── */}
          {step === 'contact' && (
            <div>
              <button onClick={() => goNext('result')} className="flex items-center gap-1.5 text-sm mb-8" style={{ color: '#64748B' }}>
                <ArrowLeft size={14} /> Back to result
              </button>

              <h2 className="text-2xl font-bold mb-2">One last step</h2>
              <p className="text-sm mb-7" style={{ color: '#64748B' }}>
                Share your details — your consultant will reach out to get your filing started.
              </p>

              {/* Mini result badge */}
              {result && (
                <div className="flex items-center gap-3 p-4 rounded-xl mb-6" style={{ background: itrC.bg, border: `1px solid ${itrC.color}33` }}>
                  <p className="text-2xl font-black" style={{ color: itrC.color }}>{result.itr}</p>
                  <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: itrC.color }}>{result.confidence}% confidence</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{complexityColor[result.complexity].label}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-5">
                {([
                  { icon: User,  label: 'Full Name',      val: name,  set: setName,  ph: 'As on PAN card',       type: 'text' },
                  { icon: Phone, label: 'Phone Number',   val: phone, set: setPhone, ph: '+91 98765 43210',      type: 'tel' },
                  { icon: Mail,  label: 'Email Address',  val: email, set: setEmail, ph: 'you@example.com',      type: 'email' },
                ] as const).map(({ icon: Icon, label, val, set, ph, type }) => (
                  <div key={label}>
                    <label className="flex items-center gap-1.5 text-xs font-medium mb-2" style={{ color: '#64748B' }}>
                      <Icon size={11} /> {label} <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input value={val} onChange={e => (set as (v: string) => void)(e.target.value)} placeholder={ph} type={type}
                      onKeyDown={e => e.key === 'Enter' && handleContact()}
                      className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F1F5F9' }} />
                  </div>
                ))}
              </div>

              {error && <p className="text-xs mb-4 px-1" style={{ color: '#FF8A8A' }}>{error}</p>}

              <button onClick={handleContact} disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white mb-4"
                style={{ background: busy ? '#334155' : 'linear-gradient(135deg,#3B82F6,#8B5CF6)', fontSize: '15px' }}>
                {busy ? 'Saving...' : 'Submit & Get My Filing Started'} {!busy && <ArrowRight size={17} />}
              </button>

              <p className="text-center text-xs" style={{ color: '#475569' }}>
                By submitting, you agree to be contacted by the consultant for tax filing assistance. No spam ever.
              </p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && result && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)' }}>
                <Check size={36} style={{ color: '#22C55E' }} />
              </div>
              <h2 className="text-2xl font-bold mb-3">You're all set!</h2>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: '#64748B' }}>
                Your assessment is saved and our consultant will reach out to you within 24 hours to begin your <span className="font-semibold" style={{ color: itrC.color }}>{result.itr}</span> filing.
              </p>

              <div className="p-5 rounded-2xl mb-8 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-semibold mb-4" style={{ color: '#475569', letterSpacing: '0.08em' }}>WHAT HAPPENS NEXT</p>
                {[
                  ['Consultant review', 'Our CA will review your assessment and confirm the ITR type'],
                  ['Document collection', 'You\'ll receive a personalised document checklist'],
                  ['Filing preparation', 'We prepare your return and share a draft for your review'],
                  ['E-filing', 'You sign and we file on your behalf on the income tax portal'],
                ].map(([title, desc], i) => (
                  <div key={i} className="flex gap-4 mb-4 last:mb-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(59,130,246,0.15)', color: '#7CB0FB' }}>{i+1}</div>
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/login" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
                Log In / Create Account <ArrowRight size={15} />
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Shared sub-components ───────────────────────────────────────────────────

function Question({ children, step, total, label, onBack }: {
  children: React.ReactNode
  step: string
  total: string
  label: string
  onBack?: () => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {onBack && (
          <button onClick={onBack} className="w-7 h-7 rounded-lg flex items-center justify-center mr-1" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748B' }}>
            <ArrowLeft size={13} />
          </button>
        )}
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#7CB0FB' }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: '#334155' }}>Question {step} of {total}</span>
      </div>
      {children}
    </div>
  )
}

function YesNoButtons({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button onClick={onYes}
        className="flex flex-col items-center gap-3 p-7 rounded-2xl font-bold text-lg transition-all hover:scale-[1.03]"
        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
        <span className="text-3xl">✓</span>
        Yes
      </button>
      <button onClick={onNo}
        className="flex flex-col items-center gap-3 p-7 rounded-2xl font-bold text-lg transition-all hover:scale-[1.03]"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#FF8A8A' }}>
        <span className="text-3xl">✗</span>
        No
      </button>
    </div>
  )
}
