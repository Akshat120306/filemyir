'use client'
import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminShell from '@/components/admin/AdminShell'
import { getAllLeads, updateLeadStatus, deleteLead } from '@/lib/leads'
import { Lead } from '@/types'
import { Phone, Mail, UserPlus, MessageCircle, Trash2, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'

const statusConfig = {
  new:       { label: 'New',       color: '#FBC373', bg: 'rgba(245,158,11,0.12)' },
  contacted: { label: 'Contacted', color: '#7CB0FB', bg: 'rgba(59,130,246,0.12)' },
  converted: { label: 'Converted', color: '#5BE090', bg: 'rgba(34,197,94,0.12)' },
  lost:      { label: 'Lost',      color: '#FF8A8A', bg: 'rgba(239,68,68,0.12)' },
}

const ALL_STATUSES = ['new', 'contacted', 'lost'] as const

function LeadsContent() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Lead['status'] | 'all'>('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    getAllLeads().then(l => { setLeads(l); setLoading(false) })
  }, [])

  async function handleStatus(id: string, status: Lead['status']) {
    try {
      await updateLeadStatus(id, status)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
      toast(`Marked as ${statusConfig[status].label}`)
    } catch { toast('Failed to update', 'error') }
    setOpenMenu(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete lead "${name}"? This cannot be undone.`)) return
    try {
      await deleteLead(id)
      setLeads(prev => prev.filter(l => l.id !== id))
      toast('Lead deleted')
    } catch { toast('Failed to delete', 'error') }
  }

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  return (
    <div onClick={() => setOpenMenu(null)}>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {(['all','new','contacted','converted','lost'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
            style={{ background: filter === s ? '#3B82F6' : '#1E293B', color: filter === s ? '#fff' : '#94A3B8', border: '1px solid ' + (filter === s ? '#3B82F6' : '#2A3A55') }}>
            {s === 'all' ? 'All leads' : statusConfig[s].label}
            {s !== 'all' && <span className="ml-1.5 opacity-60">{leads.filter(l => l.status === s).length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: '#64748B' }}>No leads found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => {
            const sc = statusConfig[lead.status]
            return (
              <div key={lead.id} className="p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#B6A0FA' }}>
                      {lead.name.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{lead.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#64748B' }}><Phone size={11} />{lead.phone}</span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#64748B' }}><Mail size={11} />{lead.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-right mr-1">
                      <p className="text-sm font-semibold" style={{ color: '#3B82F6' }}>{lead.recommendedItr}</p>
                      <p className="text-xs capitalize" style={{ color: '#64748B' }}>{lead.complexity} filing</p>
                    </div>

                    {/* WhatsApp */}
                    <a href={`https://wa.me/91${lead.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${lead.name}, I'm reaching out regarding your ITR filing inquiry. You filled out our assessment and we recommend ${lead.recommendedItr} for you. Let's schedule a quick call to get started!`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>
                      <MessageCircle size={12} /> WhatsApp
                    </a>

                    {/* Convert to client (only contacted) */}
                    {lead.status === 'contacted' && (
                      <Link href={`/admin/clients/new?leadId=${lead.id}&name=${encodeURIComponent(lead.name)}&phone=${lead.phone}&email=${encodeURIComponent(lead.email)}&itr=${lead.recommendedItr}${lead.pan ? `&pan=${lead.pan}` : ''}&docs=${encodeURIComponent(JSON.stringify(lead.requiredDocs ?? []))}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#5BE090' }}>
                        <UserPlus size={12} /> Convert
                      </Link>
                    )}

                    {/* Status dropdown (not for converted) */}
                    {lead.status !== 'converted' && (
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setOpenMenu(openMenu === lead.id ? null : lead.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>
                          Move <ChevronDown size={11} />
                        </button>
                        {openMenu === lead.id && (
                          <div className="absolute right-0 top-8 z-20 rounded-xl overflow-hidden shadow-xl"
                            style={{ background: '#1E293B', border: '1px solid #2A3A55', minWidth: 130 }}>
                            {ALL_STATUSES.filter(s => s !== lead.status).map(s => (
                              <button key={s} onClick={() => handleStatus(lead.id, s)}
                                className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5"
                                style={{ color: statusConfig[s].color }}>
                                {statusConfig[s].label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delete */}
                    <button onClick={() => handleDelete(lead.id, lead.name)}
                      className="p-1.5 rounded-lg"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#FF8A8A' }}
                      title="Delete lead">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {lead.incomeTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid #1F2C42' }}>
                    {lead.incomeTypes.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: '#141E33', color: '#94A3B8', border: '1px solid #2A3A55' }}>
                        {t.replace('_',' ')}
                      </span>
                    ))}
                    <span className="text-xs ml-auto" style={{ color: '#64748B' }}>{lead.createdAt.toLocaleDateString('en-IN')}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function LeadsPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminShell title="Leads" subtitle="Prospects from the assessment form">
        <LeadsContent />
      </AdminShell>
    </AuthGuard>
  )
}
