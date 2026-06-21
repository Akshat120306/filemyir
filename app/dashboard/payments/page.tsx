'use client'
import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import ClientShell from '@/components/client/ClientShell'
import { useAuth } from '@/lib/AuthContext'
import { getClientByEmail } from '@/lib/clients'
import { subscribePayments, submitUtrPayment } from '@/lib/payments'
import { getPaymentSettings } from '@/lib/settings'
import { notifyAdmin } from '@/lib/notifications'
import { emailAdminPaymentSubmitted } from '@/lib/email'
import { Client, Payment, PaymentSettings } from '@/types'
import { CreditCard, CheckCircle, Clock, Copy, AlertCircle, Send } from 'lucide-react'

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => { copyText(value); setDone(true); setTimeout(() => setDone(false), 1500) }}
      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-all"
      style={{ background: done ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)', color: done ? '#22C55E' : '#7CB0FB' }}>
      <Copy size={11} /> {done ? 'Copied' : 'Copy'}
    </button>
  )
}

function StatusBadge({ status, rejectionReason }: { status: Payment['status']; rejectionReason?: string }) {
  if (status === 'paid')
    return <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>Paid</span>
  if (status === 'pending_verification')
    return <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(59,130,246,0.12)', color: '#7CB0FB' }}>Verifying…</span>
  return (
    <div className="text-right">
      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#FF8A8A' }}>
        {rejectionReason ? 'Rejected' : 'Unpaid'}
      </span>
      {rejectionReason && <p className="text-xs mt-1" style={{ color: '#FF8A8A' }}>{rejectionReason}</p>}
    </div>
  )
}

function validateUtr(utr: string, mode: string): string | null {
  const clean = utr.replace(/\s/g, '')
  if (!clean) return 'Enter UTR / reference number'
  if (mode === 'upi' && clean.length < 12) return 'UPI reference should be at least 12 digits'
  if (mode === 'imps' && !/^\d{12}$/.test(clean)) return 'IMPS UTR should be exactly 12 digits'
  if ((mode === 'neft' || mode === 'rtgs') && clean.length < 16) return 'NEFT/RTGS UTR should be at least 16 characters'
  return null
}

function PaymentsContent() {
  const { user } = useAuth()
  const [client, setClient]       = useState<Client | null>(null)
  const [payments, setPayments]   = useState<Payment[]>([])
  const [settings, setSettings]   = useState<PaymentSettings | null>(null)
  const [loading, setLoading]     = useState(true)
  const [showPay, setShowPay]     = useState(false)
  const [payTab, setPayTab]       = useState<'upi' | 'bank'>('upi')
  const [amount, setAmount]       = useState('')
  const [utr, setUtr]             = useState('')
  const [mode, setMode]           = useState<'upi' | 'imps' | 'neft' | 'rtgs'>('upi')
  const [utrError, setUtrError]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  useEffect(() => {
    if (!user?.email) return
    getClientByEmail(user.email).then(c => {
      if (!c) { setLoading(false); return }
      setClient(c)
      const unsub = subscribePayments(c.id, p => { setPayments(p); setLoading(false) })
      return () => unsub()
    })
    getPaymentSettings().then(setSettings)
  }, [user])

  const totalFee  = client?.feeAmount ?? 0
  const paid      = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pending   = payments.filter(p => p.status === 'pending_verification').reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, totalFee - paid - pending)

  async function handleSubmit() {
    const err = validateUtr(utr, mode)
    if (err) { setUtrError(err); return }
    const amt = Number(amount)
    if (!amt || amt <= 0) { setUtrError('Enter a valid amount'); return }
    if (!client) return
    setSubmitting(true)
    try {
      const payerName = user?.displayName ?? user?.email ?? ''
      const cleanUtr  = utr.replace(/\s/g,'')
      notifyAdmin('💰 Payment submitted', `${payerName} paid ₹${amt.toLocaleString('en-IN')} via ${mode.toUpperCase()} · UTR: ${cleanUtr}`, 'payment_submitted', client.id).catch(() => {})
      emailAdminPaymentSubmitted(payerName, amt, cleanUtr, mode, client.id).catch(() => {})
      await submitUtrPayment(client.id, {
        amount: amt,
        utr: utr.replace(/\s/g, ''),
        paymentMode: mode,
        description: 'Payment via ' + mode.toUpperCase(),
      })
      setSubmitted(true)
      setUtr(''); setAmount(''); setUtrError('')
      setTimeout(() => { setSubmitted(false); setShowPay(false) }, 3000)
    } catch { setUtrError('Submission failed. Try again.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Payments</h1>
      <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>Pay your filing fee and track payment status</p>

      {/* Fee breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Fee',  value: totalFee ? '₹' + totalFee.toLocaleString('en-IN') : '—', icon: CreditCard, color: '#8B5CF6' },
          { label: 'Paid',       value: '₹' + paid.toLocaleString('en-IN'),                       icon: CheckCircle, color: '#22C55E' },
          { label: 'Remaining',  value: '₹' + remaining.toLocaleString('en-IN'),                  icon: Clock,       color: remaining > 0 ? '#F59E0B' : '#22C55E' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <Icon size={16} style={{ color, marginBottom: 10 }} />
            <p className="text-xl font-bold" style={{ letterSpacing: '-0.3px' }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Pending verification notice */}
      {pending > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <Clock size={14} style={{ color: '#7CB0FB', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            <span style={{ color: '#7CB0FB' }}>₹{pending.toLocaleString('en-IN')}</span> is being verified by your consultant. Usually done within a few hours.
          </p>
        </div>
      )}

      {/* Pay Now CTA */}
      {remaining > 0 && settings && !showPay && (
        <button
          onClick={() => { setAmount(remaining.toString()); setShowPay(true) }}
          className="w-full py-3.5 rounded-xl font-semibold text-white mb-6"
          style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
          Pay ₹{remaining.toLocaleString('en-IN')} Now
        </button>
      )}

      {/* Payment Flow */}
      {showPay && settings && !submitted && (
        <div className="rounded-2xl mb-6 overflow-hidden" style={{ border: '1px solid #1F2C42' }}>
          {/* Tab switcher */}
          <div className="flex" style={{ background: '#141E33' }}>
            {(['upi', 'bank'] as const).map(t => (
              <button key={t} onClick={() => { setPayTab(t); setMode(t === 'upi' ? 'upi' : 'imps') }}
                className="flex-1 py-3 text-sm font-medium transition-colors"
                style={{ color: payTab === t ? '#F1F5F9' : '#64748B', borderBottom: payTab === t ? '2px solid #3B82F6' : '2px solid transparent' }}>
                {t === 'upi' ? 'UPI' : 'Bank Transfer'}
              </button>
            ))}
          </div>

          <div className="p-5" style={{ background: '#1E293B' }}>
            {payTab === 'upi' ? (
              <div className="mb-5">
                <p className="text-xs font-medium mb-3" style={{ color: '#64748B' }}>Pay to this UPI ID</p>
                <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ background: '#141E33', border: '1px solid #2A3A55' }}>
                  <div>
                    <p className="text-sm font-mono font-semibold">{settings.upiId}</p>
                    {settings.upiName && <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{settings.upiName}</p>}
                  </div>
                  <CopyButton value={settings.upiId} />
                </div>
                <a href={`upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.upiName)}&am=${remaining}&cu=INR`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#7CB0FB', border: '1px solid rgba(59,130,246,0.2)' }}>
                  Open in UPI App
                </a>
              </div>
            ) : (
              <div className="mb-5 space-y-2">
                <p className="text-xs font-medium mb-3" style={{ color: '#64748B' }}>Transfer to bank account</p>
                {[
                  ['Account Holder', settings.accountHolder],
                  ['Bank', settings.bankName],
                  ['Account Number', settings.accountNumber],
                  ['IFSC', settings.ifsc],
                ].map(([l, v]) => v && (
                  <div key={l} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ background: '#141E33' }}>
                    <div>
                      <p className="text-xs" style={{ color: '#64748B' }}>{l}</p>
                      <p className="text-sm font-mono font-medium mt-0.5">{v}</p>
                    </div>
                    <CopyButton value={v} />
                  </div>
                ))}
              </div>
            )}

            {/* UTR submission */}
            <div className="pt-4" style={{ borderTop: '1px solid #1F2C42' }}>
              <p className="text-xs font-medium mb-3" style={{ color: '#94A3B8' }}>After paying, enter your payment details below</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#64748B' }}>Amount paid (₹)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#64748B' }}>Payment mode</label>
                  <select value={mode} onChange={e => setMode(e.target.value as typeof mode)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
                    <option value="upi">UPI</option>
                    <option value="imps">IMPS</option>
                    <option value="neft">NEFT</option>
                    <option value="rtgs">RTGS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: '#64748B' }}>
                    {mode === 'upi' ? 'UPI Reference / Transaction ID' : mode === 'imps' ? 'IMPS UTR (12 digits)' : 'NEFT/RTGS UTR Number'}
                  </label>
                  <input value={utr} onChange={e => { setUtr(e.target.value); setUtrError('') }}
                    placeholder={mode === 'upi' ? '12-digit transaction ID' : mode === 'imps' ? '123456789012' : '16-character UTR'}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono"
                    style={{ background: '#141E33', border: `1px solid ${utrError ? '#EF4444' : '#2A3A55'}`, color: '#F1F5F9' }} />
                  {utrError && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <AlertCircle size={11} style={{ color: '#FF8A8A' }} />
                      <p className="text-xs" style={{ color: '#FF8A8A' }}>{utrError}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setShowPay(false); setUtrError('') }}
                    className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#141E33', color: '#64748B', border: '1px solid #2A3A55' }}>
                    Cancel
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: '#3B82F6' }}>
                    <Send size={14} /> {submitting ? 'Submitting…' : 'Submit Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission success */}
      {submitted && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-6" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle size={16} style={{ color: '#22C55E', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Payment submitted! Your consultant will verify within a few hours.</p>
        </div>
      )}

      {/* No settings configured */}
      {remaining > 0 && !settings && !loading && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-6" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Payment details not set up yet. Your consultant will share them with you.</p>
        </div>
      )}

      {/* Payment history */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#64748B' }}>
          <CreditCard size={36} style={{ margin: '0 auto 12px', color: '#2A3A55' }} />
          <p className="text-sm">No payment records yet</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase mb-3" style={{ color: '#64748B', letterSpacing: '0.06em' }}>Payment History</p>
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: '#1E293B', border: `1px solid ${p.status === 'pending_verification' ? 'rgba(59,130,246,0.25)' : '#1F2C42'}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: p.status === 'paid' ? 'rgba(34,197,94,0.12)' : p.status === 'pending_verification' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)' }}>
                    {p.status === 'paid'
                      ? <CheckCircle size={16} style={{ color: '#22C55E' }} />
                      : p.status === 'pending_verification'
                      ? <Clock size={16} style={{ color: '#7CB0FB' }} />
                      : <Clock size={16} style={{ color: '#F59E0B' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                      {p.date.toLocaleDateString('en-IN')}
                      {p.utr && <span className="ml-2 font-mono">UTR: {p.utr}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-semibold mb-1">₹{p.amount.toLocaleString('en-IN')}</p>
                  <StatusBadge status={p.status} rejectionReason={p.rejectionReason} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <AuthGuard>
      <ClientShell><PaymentsContent /></ClientShell>
    </AuthGuard>
  )
}
