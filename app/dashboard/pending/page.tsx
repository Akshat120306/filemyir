'use client'
import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/lib/AuthContext'
import { getLeadByEmail } from '@/lib/leads'
import { Lead } from '@/types'
import { Clock, CheckCircle, FileText, Phone, Shield, ChevronDown, ChevronUp, LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'

const itrColor: Record<string, { color: string; bg: string }> = {
  'ITR-1': { color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  'ITR-2': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  'ITR-3': { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  'ITR-4': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
}

const complexityLabel = { simple: 'Simple Filing', moderate: 'Moderate Filing', complex: 'Complex Filing' }
const complexityColor = { simple: '#22C55E', moderate: '#F59E0B', complex: '#EF4444' }

const incomeLabel: Record<string, string> = {
  salary: 'Salary / Pension', business: 'Business Income', freelance: 'Freelancing / Professional',
  rental: 'Rental Income', capital_gains: 'Capital Gains', fno: 'F&O / Intraday Trading',
  foreign: 'Foreign Income / NRI', other: 'Other Income',
}

function PendingContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDocs, setShowDocs] = useState(false)

  useEffect(() => {
    if (!user?.email) return
    getLeadByEmail(user.email).then(l => { setLead(l); setLoading(false) })
  }, [user])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const itr    = lead?.recommendedItr ?? 'ITR-2'
  const itrC   = itrColor[itr] ?? itrColor['ITR-2']
  const cxKey  = (lead?.complexity ?? 'moderate') as keyof typeof complexityColor
  const docs   = lead?.requiredDocs ?? []
  const income = lead?.incomeTypes ?? []

  return (
    <div className="min-h-screen p-4 py-12" style={{ background: '#0F172A', color: '#F1F5F9' }}>
      <div className="max-w-lg mx-auto">

        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>T</div>
          <span className="font-bold text-xl">TaxOS</span>
        </div>

        {/* Status */}
        <div className="p-6 rounded-2xl text-center mb-4" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <Clock size={26} style={{ color: '#F59E0B' }} />
          </div>
          <h1 className="text-xl font-bold mb-2">Details received!</h1>
          <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>
            Your consultant is reviewing your information. Your portal will open once they set up your case.
          </p>
        </div>

        {/* ITR recommendation — from assessment */}
        {lead && (
          <div className="p-5 rounded-2xl mb-4" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <p className="text-xs font-semibold uppercase mb-4" style={{ color: '#64748B', letterSpacing: '0.06em' }}>Your Assessment Summary</p>

            {/* ITR badge */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs mb-1" style={{ color: '#64748B' }}>Recommended ITR Form</p>
                <p className="text-3xl font-black" style={{ color: itrC.color }}>{itr}</p>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: itrC.bg, color: itrC.color }}>
                {complexityLabel[cxKey] ?? 'Filing'}
              </span>
            </div>

            {/* Income sources */}
            {income.length > 0 && (
              <div className="mb-4 pt-4" style={{ borderTop: '1px solid #1F2C42' }}>
                <p className="text-xs font-medium mb-2" style={{ color: '#64748B' }}>Income Sources Detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {income.map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#141E33', color: '#94A3B8', border: '1px solid #2A3A55' }}>
                      {incomeLabel[t] ?? t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Documents checklist — collapsible */}
            {docs.length > 0 && (
              <div className="pt-4" style={{ borderTop: '1px solid #1F2C42' }}>
                <button onClick={() => setShowDocs(!showDocs)}
                  className="w-full flex items-center justify-between text-sm font-medium mb-3">
                  <span>Documents You Will Need <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#7CB0FB' }}>{docs.length}</span></span>
                  {showDocs ? <ChevronUp size={15} style={{ color: '#64748B' }} /> : <ChevronDown size={15} style={{ color: '#64748B' }} />}
                </button>
                {showDocs && (
                  <div className="space-y-2">
                    {docs.map(d => (
                      <div key={d} className="flex items-center gap-2.5">
                        <FileText size={12} style={{ color: '#3B82F6', flexShrink: 0 }} />
                        <span className="text-sm" style={{ color: '#CBD5E1' }}>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #1F2C42' }}>
              <Shield size={12} style={{ color: '#64748B', flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: '#475569' }}>Preliminary recommendation. Final ITR form confirmed by your consultant before filing.</p>
            </div>
          </div>
        )}

        {/* What happens next */}
        <div className="p-5 rounded-2xl mb-4" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
          <p className="text-xs font-semibold uppercase mb-4" style={{ color: '#64748B', letterSpacing: '0.06em' }}>What happens next</p>
          <div className="space-y-4">
            {[
              { icon: Phone,        color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  n: '1', title: 'Consultant contacts you',   desc: 'Your consultant will call or WhatsApp you within 1–2 business days' },
              { icon: FileText,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', n: '2', title: 'Confirm document checklist', desc: 'Consultant reviews and personalises your document list above' },
              { icon: CheckCircle,  color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  n: '3', title: 'Portal activated',           desc: 'Your full client portal opens so you can upload documents and track filing' },
            ].map(({ icon: Icon, color, bg, n, title, desc }) => (
              <div key={n} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact info */}
        {lead && (
          <div className="p-5 rounded-2xl mb-4" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <p className="text-xs font-semibold uppercase mb-3" style={{ color: '#64748B', letterSpacing: '0.06em' }}>Submitted Details</p>
            {[['Name', lead.name], ['Phone', lead.phone], ['Email', lead.email]].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2.5 text-sm" style={{ borderBottom: '1px solid #1F2C42' }}>
                <span style={{ color: '#64748B' }}>{l}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => signOut().then(() => router.push('/login'))}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
          style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#64748B' }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  )
}

export default function PendingPage() {
  return (
    <AuthGuard>
      <PendingContent />
    </AuthGuard>
  )
}
