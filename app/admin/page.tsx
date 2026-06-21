'use client'
import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminShell from '@/components/admin/AdminShell'
import { getAllClients } from '@/lib/clients'
import { getAllLeads } from '@/lib/leads'
import { Client, Lead, PIPELINE_STAGES } from '@/types'
import Link from 'next/link'
import { Users, Inbox, AlertCircle, CheckCircle, Clock, TrendingUp, ArrowRight, CreditCard } from 'lucide-react'

function AdminDashboardContent() {
  const [clients, setClients] = useState<Client[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [c, l] = await Promise.all([getAllClients(), getAllLeads()])
      setClients(c)
      setLeads(l)
      setLoading(false)
    }
    load()
  }, [])

  const newLeads = leads.filter(l => l.status === 'new')
  const active = clients.filter(c => !['filed','closed'].includes(c.status))
  const filed = clients.filter(c => c.status === 'filed' || c.status === 'closed')
  const needsDocs = clients.filter(c => c.status === 'docs_pending')
  const readyToFile = clients.filter(c => c.status === 'ready_to_file')
  const unpaidClients  = clients.filter(c => c.feeStatus === 'unpaid' && c.feeAmount)
  const totalBilled    = clients.reduce((s, c) => s + (c.feeAmount ?? 0), 0)
  const totalOutstanding = clients.filter(c => c.feeStatus !== 'paid').reduce((s, c) => s + (c.feeAmount ?? 0), 0)

  const metrics = [
    { label: 'Total Clients', value: clients.length, icon: Users, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    { label: 'New Leads', value: newLeads.length, icon: Inbox, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Active Cases', value: active.length, icon: TrendingUp, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
    { label: 'Docs Pending', value: needsDocs.length, icon: Clock, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    { label: 'Ready to File', value: readyToFile.length, icon: AlertCircle, color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    { label: 'Filed', value: filed.length, icon: CheckCircle, color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    { label: 'Pending Payment', value: unpaidClients.length,                                                  icon: TrendingUp, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Total Billed',    value: '₹' + (totalBilled / 1000).toFixed(0) + 'k',                          icon: CreditCard, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
    { label: 'Outstanding',     value: '₹' + (totalOutstanding / 1000).toFixed(0) + 'k',                     icon: AlertCircle, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {metrics.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="p-4 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ letterSpacing: '-0.5px' }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="font-semibold">New Leads</h2>
            <Link href="/admin/leads" className="text-xs flex items-center gap-1" style={{ color: '#3B82F6' }}>View all <ArrowRight size={12} /></Link>
          </div>
          <div className="p-5 space-y-3">
            {newLeads.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: '#64748B' }}>No new leads</p>
            ) : newLeads.slice(0,5).map(lead => (
              <Link key={lead.id} href={`/admin/leads`}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{ background: '#141E33', border: '1px solid #1F2C42' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)', color: '#FBC373' }}>
                  {lead.name.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  <p className="text-xs" style={{ color: '#64748B' }}>{lead.phone} · {lead.recommendedItr}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)', color: '#FBC373' }}>New</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="font-semibold">Needs Attention</h2>
            <Link href="/admin/clients" className="text-xs flex items-center gap-1" style={{ color: '#3B82F6' }}>All clients <ArrowRight size={12} /></Link>
          </div>
          <div className="p-5 space-y-3">
            {needsDocs.length === 0 && readyToFile.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: '#64748B' }}>All caught up!</p>
            ) : [...needsDocs, ...readyToFile].slice(0,5).map(c => (
              <Link key={c.id} href={`/admin/clients/${c.id}`}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{ background: '#141E33', border: '1px solid #1F2C42' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)', color: '#B6A0FA' }}>
                  {c.name.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs" style={{ color: '#64748B' }}>{c.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{
                  background: c.status === 'ready_to_file' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  color: c.status === 'ready_to_file' ? '#5BE090' : '#FF8A8A',
                }}>
                  {PIPELINE_STAGES.find(s => s.status === c.status)?.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminShell title="Dashboard" subtitle="Welcome back">
        <AdminDashboardContent />
      </AdminShell>
    </AuthGuard>
  )
}
