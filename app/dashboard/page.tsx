'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import ClientShell from '@/components/client/ClientShell'
import { useAuth } from '@/lib/AuthContext'
import { getClientByEmail } from '@/lib/clients'
import { getLeadByEmail } from '@/lib/leads'
import { getDocuments } from '@/lib/documents'
import { getPayments } from '@/lib/payments'
import { Client, ClientDocument, Payment, PIPELINE_STAGES } from '@/types'
import { CheckCircle, Clock, Upload, CreditCard, FileText, Phone, MessageCircle } from 'lucide-react'

function StatusTimeline({ status }: { status: Client['status'] }) {
  const currentIdx = PIPELINE_STAGES.findIndex(s => s.status === status)
  return (
    <div className="p-6 rounded-2xl mb-6" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold text-base">Filing Status</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Your return progress</p>
        </div>
      </div>
      <div className="flex items-start overflow-x-auto pb-2 gap-0">
        {PIPELINE_STAGES.map((stage, idx) => {
          const done = idx < currentIdx
          const current = idx === currentIdx
          return (
            <div key={stage.status} className="flex flex-col items-center flex-1 min-w-[80px] relative">
              {idx > 0 && (
                <div className="absolute top-4 right-1/2 w-full h-0.5 -z-0" style={{ background: done ? '#22C55E' : '#2A3A55' }} />
              )}
              <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all" style={{
                background: current ? '#3B82F6' : done ? '#22C55E' : '#1F2C42',
                border: current ? '2px solid #3B82F6' : done ? 'none' : '2px solid #2A3A55',
                boxShadow: current ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
                color: (done || current) ? '#fff' : '#64748B',
                fontSize: 13,
              }}>
                {done ? <CheckCircle size={14} /> : idx + 1}
              </div>
              <p className="text-center mt-2 leading-tight" style={{ fontSize: 10, color: current ? '#F1F5F9' : done ? '#94A3B8' : '#64748B', maxWidth: 72, fontWeight: current ? 600 : 400 }}>
                {stage.label}
              </p>
            </div>
          )
        })}
      </div>
      {currentIdx >= 0 && (
        <div className="mt-5 p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <Clock size={16} style={{ color: '#7CB0FB', flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>{PIPELINE_STAGES[currentIdx].label}</p>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{PIPELINE_STAGES[currentIdx].description}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [docs, setDocs] = useState<ClientDocument[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!user?.email) return
    async function load() {
      try {
        const c = await getClientByEmail(user!.email!)
        if (!c) {
          const lead = await getLeadByEmail(user!.email!)
          router.replace(lead ? '/dashboard/pending' : '/dashboard/onboarding')
          return
        }
        setClient(c)
        const [d, p] = await Promise.all([getDocuments(c.id), getPayments(c.id)])
        setDocs(d)
        setPayments(p)
      } finally { setLoadingData(false) }
    }
    load()
  }, [user, router])

  const name = user?.displayName ?? user?.email?.split('@')[0] ?? 'there'
  const pendingDocs = docs.filter(d => d.reviewStatus === 'pending' || d.reviewStatus === 'resubmission_needed')
  const totalFee = payments.reduce((s, p) => s + p.amount, 0)
  const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)

  if (loadingData) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8 max-w-4xl">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.3px' }}>Good morning, {name} 👋</h1>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Here is your filing overview</p>
        </div>
      </div>

      {!client ? null : (
        <>
          <StatusTimeline status={client.status} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Documents', value: docs.length, icon: FileText, color: '#3B82F6' },
              { label: 'Pending Review', value: pendingDocs.length, icon: Clock, color: '#F59E0B' },
              { label: 'Total Fee', value: `₹${totalFee.toLocaleString('en-IN')}`, icon: CreditCard, color: '#8B5CF6' },
              { label: 'Amount Paid', value: `₹${paid.toLocaleString('en-IN')}`, icon: CheckCircle, color: '#22C55E' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="p-4 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
                <Icon size={18} style={{ color, marginBottom: 10 }} />
                <p className="text-xl font-semibold" style={{ letterSpacing: '-0.3px' }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: '#64748B' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Contact consultant */}
          {(() => {
            const clientName = user?.displayName ?? user?.email?.split('@')[0] ?? ''
            const waMsg = encodeURIComponent(`Hi Ekta ma'am, I'm ${clientName}. I have a query regarding my ITR filing. Could you please help me?`)
            return (
              <div className="mb-6 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center gap-4 md:gap-6"
                style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', color: '#FCD34D' }}>ED</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Ekta Dhall</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>Advocate · Ekta Tax Consultants</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href="tel:8585988581"
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#7CB0FB', border: '1px solid rgba(59,130,246,0.18)' }}>
                    <Phone size={14} /> Call
                  </a>
                  <a href={`https://wa.me/918585988581?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}>
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
              </div>
            )
          })()}

          <div className="grid md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Recent Documents</h3>
                <a href="/dashboard/documents" className="text-xs" style={{ color: '#3B82F6' }}>View all</a>
              </div>
              {docs.length === 0 ? (
                <div className="text-center py-6">
                  <Upload size={24} style={{ color: '#2A3A55', margin: '0 auto 8px' }} />
                  <p className="text-xs" style={{ color: '#64748B' }}>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {docs.slice(0, 4).map(d => (
                    <div key={d.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                        <FileText size={14} style={{ color: '#3B82F6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-xs" style={{ color: '#64748B' }}>{d.type}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: d.reviewStatus === 'approved' ? 'rgba(34,197,94,0.12)' : d.reviewStatus === 'rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                        color: d.reviewStatus === 'approved' ? '#5BE090' : d.reviewStatus === 'rejected' ? '#FF8A8A' : '#FBC373',
                      }}>{d.reviewStatus}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Payment Summary</h3>
                <a href="/dashboard/payments" className="text-xs" style={{ color: '#3B82F6' }}>View all</a>
              </div>
              {client.feeAmount ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#94A3B8' }}>Total fee</span>
                    <span className="font-semibold">₹{client.feeAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#94A3B8' }}>Paid</span>
                    <span className="font-semibold" style={{ color: '#22C55E' }}>₹{paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-px" style={{ background: '#2A3A55' }} />
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#94A3B8' }}>Outstanding</span>
                    <span className="font-semibold" style={{ color: client.feeStatus === 'paid' ? '#22C55E' : '#F59E0B' }}>
                      ₹{(client.feeAmount - paid).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {client.feeStatus !== 'paid' && (client.feeAmount - paid) > 0 && (
                    <a href="/dashboard/payments"
                      className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
                      Pay ₹{(client.feeAmount - paid).toLocaleString('en-IN')} now →
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard size={24} style={{ color: '#2A3A55', margin: '0 auto 8px' }} />
                  <p className="text-xs" style={{ color: '#64748B' }}>No payment information yet</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <ClientShell>
        <DashboardContent />
      </ClientShell>
    </AuthGuard>
  )
}
