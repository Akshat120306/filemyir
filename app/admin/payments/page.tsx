'use client'
import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminShell from '@/components/admin/AdminShell'
import { getAllClients } from '@/lib/clients'
import { getPayments } from '@/lib/payments'
import { Client, Payment } from '@/types'
import Link from 'next/link'
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface ClientPaymentRow {
  client: Client
  payments: Payment[]
  totalFee: number
  collected: number
  pending: number
  outstanding: number
}

function AdminPaymentsContent() {
  const [rows, setRows]       = useState<ClientPaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'outstanding' | 'pending' | 'settled'>('all')

  useEffect(() => {
    async function load() {
      const clients = await getAllClients()
      const withPayments = await Promise.all(
        clients
          .filter(c => c.feeAmount)
          .map(async c => {
            const payments = await getPayments(c.id)
            const collected  = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
            const pending    = payments.filter(p => p.status === 'pending_verification').reduce((s, p) => s + p.amount, 0)
            const outstanding = Math.max(0, (c.feeAmount ?? 0) - collected - pending)
            return { client: c, payments, totalFee: c.feeAmount ?? 0, collected, pending, outstanding }
          })
      )
      withPayments.sort((a, b) => b.outstanding - a.outstanding)
      setRows(withPayments)
      setLoading(false)
    }
    load()
  }, [])

  const totalFee       = rows.reduce((s, r) => s + r.totalFee, 0)
  const totalCollected = rows.reduce((s, r) => s + r.collected, 0)
  const totalPending   = rows.reduce((s, r) => s + r.pending, 0)
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0)

  const filtered = filter === 'all'         ? rows
    : filter === 'outstanding' ? rows.filter(r => r.outstanding > 0)
    : filter === 'pending'     ? rows.filter(r => r.pending > 0)
    : rows.filter(r => r.outstanding === 0 && r.pending === 0)

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Payments Overview</h1>
      <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>All client fees and payment status at a glance</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Billed',    value: totalFee,         color: '#8B5CF6', icon: CreditCard  },
          { label: 'Collected',       value: totalCollected,   color: '#22C55E', icon: CheckCircle },
          { label: 'Verifying',       value: totalPending,     color: '#3B82F6', icon: Clock       },
          { label: 'Outstanding',     value: totalOutstanding, color: '#F59E0B', icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <Icon size={16} style={{ color, marginBottom: 10 }} />
            <p className="text-xl font-bold" style={{ letterSpacing: '-0.3px' }}>
              ₹{value.toLocaleString('en-IN')}
            </p>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([
          ['all',         'All'],
          ['outstanding', `Outstanding (${rows.filter(r => r.outstanding > 0).length})`],
          ['pending',     `Verifying (${rows.filter(r => r.pending > 0).length})`],
          ['settled',     `Settled (${rows.filter(r => r.outstanding === 0 && r.pending === 0).length})`],
        ] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{ background: filter === val ? '#3B82F6' : '#1E293B', color: filter === val ? '#fff' : '#94A3B8', border: '1px solid ' + (filter === val ? '#3B82F6' : '#2A3A55') }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: '#64748B' }}>No clients match this filter</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ client: c, totalFee, collected, pending, outstanding }) => (
            <Link key={c.id} href={`/admin/clients/${c.id}?tab=Payments`}
              className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:opacity-90"
              style={{ background: '#1E293B', border: `1px solid ${outstanding > 0 ? 'rgba(245,158,11,0.2)' : pending > 0 ? 'rgba(59,130,246,0.2)' : '#1F2C42'}` }}>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#B6A0FA' }}>
                {c.name.slice(0,2).toUpperCase()}
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs truncate" style={{ color: '#64748B' }}>{c.email} · {c.itrType ?? '—'}</p>
              </div>

              {/* Fee breakdown */}
              <div className="hidden md:flex items-center gap-5 text-right flex-shrink-0">
                <div>
                  <p className="text-xs" style={{ color: '#64748B' }}>Billed</p>
                  <p className="text-sm font-semibold">₹{totalFee.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#64748B' }}>Paid</p>
                  <p className="text-sm font-semibold" style={{ color: '#22C55E' }}>₹{collected.toLocaleString('en-IN')}</p>
                </div>
                {pending > 0 && (
                  <div>
                    <p className="text-xs" style={{ color: '#64748B' }}>Verifying</p>
                    <p className="text-sm font-semibold" style={{ color: '#7CB0FB' }}>₹{pending.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>

              {/* Status chip */}
              <div className="flex-shrink-0 text-right">
                {outstanding > 0 ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                    ₹{outstanding.toLocaleString('en-IN')} due
                  </span>
                ) : pending > 0 ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(59,130,246,0.12)', color: '#7CB0FB' }}>
                    Verifying
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                    Settled ✓
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPaymentsPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminShell title="Payments" subtitle="Revenue overview">
        <AdminPaymentsContent />
      </AdminShell>
    </AuthGuard>
  )
}
