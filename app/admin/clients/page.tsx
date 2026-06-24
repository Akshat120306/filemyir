'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AdminShell from '@/components/admin/AdminShell'
import { getAllClients, deleteClient } from '@/lib/clients'
import { Client, PIPELINE_STAGES } from '@/types'
import Link from 'next/link'
import { UserPlus, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const statusColors: Record<string, { color: string; bg: string }> = {
  lead_created:       { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  docs_pending:       { color: '#FF8A8A', bg: 'rgba(239,68,68,0.12)' },
  docs_received:      { color: '#FBC373', bg: 'rgba(245,158,11,0.12)' },
  review_started:     { color: '#7CB0FB', bg: 'rgba(59,130,246,0.12)' },
  return_preparation: { color: '#B6A0FA', bg: 'rgba(139,92,246,0.12)' },
  ready_to_file:      { color: '#5BE090', bg: 'rgba(34,197,94,0.12)' },
  filed:              { color: '#5BE090', bg: 'rgba(34,197,94,0.12)' },
  closed:             { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
}

function ClientsContent() {
  const params = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return
    try {
      await deleteClient(id)
      setClients(prev => prev.filter(c => c.id !== id))
      toast('Client deleted')
    } catch { toast('Failed to delete', 'error') }
  }

  useEffect(() => {
    getAllClients().then(c => { setClients(c); setLoading(false) })
  }, [])

  // Update search when URL param changes (from AdminShell search bar)
  useEffect(() => { setSearch(params.get('q') ?? '') }, [params])

  const q = search.toLowerCase()
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    c.phone.includes(search) ||
    (c.pan ?? '').toLowerCase().includes(q)
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {search && (
          <p className="text-sm flex-1" style={{ color: '#94A3B8' }}>
            Showing results for <span className="font-medium" style={{ color: '#F1F5F9' }}>"{search}"</span>
            <button onClick={() => setSearch('')} className="ml-2 text-xs" style={{ color: '#64748B' }}>Clear</button>
          </p>
        )}
        <div className="ml-auto">
          <Link href="/admin/clients/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: '#3B82F6' }}>
            <UserPlus size={15} /> Add Client
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2C42' }}>
                {['Client','Contact','ITR Type','Status','Fee','Last Activity',''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#64748B', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#64748B' }}>No clients found</td></tr>
              ) : filtered.map(c => {
                const sc = statusColors[c.status]
                const stage = PIPELINE_STAGES.find(s => s.status === c.status)
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1F2C42', cursor: 'pointer' }}
                    onClick={() => window.location.href = `/admin/clients/${c.id}`}
                    className="transition-all hover:bg-white/5">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)', color: '#B6A0FA' }}>
                          {c.name.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          {c.pan && <p className="text-xs" style={{ color: '#64748B' }}>PAN: {c.pan}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm">{c.phone}</p>
                      <p className="text-xs" style={{ color: '#64748B' }}>{c.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold" style={{ color: '#7CB0FB' }}>{c.itrType ?? '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: sc.bg, color: sc.color }}>
                        {stage?.label ?? c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {c.feeAmount ? (
                        <div>
                          <p className="text-sm font-medium">₹{c.feeAmount.toLocaleString('en-IN')}</p>
                          <p className="text-xs" style={{ color: c.feeStatus === 'paid' ? '#22C55E' : '#F59E0B' }}>{c.feeStatus ?? 'unpaid'}</p>
                        </div>
                      ) : <span style={{ color: '#64748B' }}>—</span>}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: '#64748B' }}>
                      {c.lastActivityAt.toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-4" onClick={e => handleDelete(e, c.id, c.name)}>
                      <button className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#FF8A8A' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ClientsPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminShell title="Clients" subtitle="All registered clients">
        <Suspense fallback={<div />}>
          <ClientsContent />
        </Suspense>
      </AdminShell>
    </AuthGuard>
  )
}
