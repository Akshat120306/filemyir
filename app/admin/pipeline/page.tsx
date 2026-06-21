'use client'
import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminShell from '@/components/admin/AdminShell'
import { getAllClients, updateClientStatus } from '@/lib/clients'
import { Client, PIPELINE_STAGES, PipelineStatus } from '@/types'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'

export default function PipelinePage() {
  return (
    <AuthGuard requireAdmin>
      <AdminShell title="Pipeline" subtitle="Drag clients to update their status">
        <PipelineContent />
      </AdminShell>
    </AuthGuard>
  )
}

function PipelineContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => {
    getAllClients().then(c => { setClients(c); setLoading(false) })
  }, [])

  async function handleDrop(status: PipelineStatus) {
    if (!dragging) return
    const client = clients.find(c => c.id === dragging)
    if (!client || client.status === status) { setDragging(null); setDragOver(null); return }
    setClients(prev => prev.map(c => c.id === dragging ? { ...c, status } : c))
    setDragging(null)
    setDragOver(null)
    try {
      await updateClientStatus(dragging, status, user?.email ?? 'admin')
      toast('Status updated to ' + PIPELINE_STAGES.find(s => s.status === status)?.label)
    } catch {
      toast('Failed to update status', 'error')
      getAllClients().then(setClients)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  const stageColors: Record<string, string> = {
    lead_created: '#94A3B8', docs_pending: '#EF4444', docs_received: '#F59E0B',
    review_started: '#3B82F6', return_preparation: '#8B5CF6', ready_to_file: '#22C55E',
    filed: '#22C55E', closed: '#64748B',
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 min-h-[60vh]">
      {PIPELINE_STAGES.map(stage => {
        const stageClients = clients.filter(c => c.status === stage.status)
        const color = stageColors[stage.status]
        const isOver = dragOver === stage.status
        return (
          <div key={stage.status}
            className="flex-shrink-0 w-56 rounded-2xl p-3 transition-all"
            style={{ background: isOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (isOver ? '#3B82F6' : '#1F2C42'), minHeight: 200 }}
            onDragOver={e => { e.preventDefault(); setDragOver(stage.status) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(stage.status)}>
            <div className="flex items-center justify-between px-1 pb-3" style={{ borderBottom: '1px solid #1F2C42' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold" style={{ color: '#F1F5F9' }}>{stage.label}</span>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#64748B' }}>{stageClients.length}</span>
            </div>
            <div className="pt-3 space-y-2">
              {stageClients.map(c => (
                <div key={c.id}
                  draggable
                  onDragStart={() => setDragging(c.id)}
                  onDragEnd={() => { setDragging(null); setDragOver(null) }}
                  className="p-3 rounded-xl transition-all"
                  style={{ background: '#1E293B', border: '1px solid #2A3A55', cursor: 'grab', opacity: dragging === c.id ? 0.4 : 1 }}>
                  <Link href={`/admin/clients/${c.id}`} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', color: '#B6A0FA' }}>
                        {c.name.slice(0,1).toUpperCase()}
                      </div>
                      <p className="text-xs font-medium truncate" style={{ color: '#F1F5F9' }}>{c.name}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: '#64748B' }}>{c.itrType ?? 'TBD'}</span>
                      {c.feeAmount && <span className="text-xs font-medium" style={{ color: c.feeStatus === 'paid' ? '#22C55E' : '#F59E0B' }}>Rs{Math.round(c.feeAmount/1000)}k</span>}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
