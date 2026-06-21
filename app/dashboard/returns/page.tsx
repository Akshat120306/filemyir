'use client'
import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import ClientShell from '@/components/client/ClientShell'
import { useAuth } from '@/lib/AuthContext'
import { getClientByEmail } from '@/lib/clients'
import { getReturns } from '@/lib/returns'
import { Return } from '@/types'
import { FileText, Download, ExternalLink } from 'lucide-react'

function ReturnsContent() {
  const { user } = useAuth()
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.email) return
    getClientByEmail(user.email).then(c => {
      if (!c) { setLoading(false); return }
      getReturns(c.id).then(r => { setReturns(r); setLoading(false) })
    })
  }, [user])

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Past Returns</h1>
      <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>All your filed Income Tax Returns</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : returns.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} style={{ color: '#2A3A55', margin: '0 auto 12px' }} />
          <p className="font-medium mb-1">No returns filed yet</p>
          <p className="text-sm" style={{ color: '#64748B' }}>Filed returns will appear here once your consultant uploads them</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map(r => (
            <div key={r.id} className="p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(34,197,94,0.12)' }}>
                    <FileText size={18} style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <p className="font-semibold">AY {r.year}-{String(r.year + 1).slice(2)}</p>
                    <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>{r.itrType}</p>
                    {r.acknowledgementNumber && (
                      <p className="text-xs mt-1 font-mono" style={{ color: '#64748B' }}>Ack: {r.acknowledgementNumber}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {r.itrCopyUrl && (
                    <a href={r.itrCopyUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(59,130,246,0.12)', color: '#7CB0FB' }}>
                      <Download size={12} /> ITR Copy
                    </a>
                  )}
                  {r.acknowledgementUrl && (
                    <a href={r.acknowledgementUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(139,92,246,0.12)', color: '#B6A0FA' }}>
                      <ExternalLink size={12} /> Acknowledgement
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 flex gap-4 text-xs" style={{ borderTop: '1px solid #1F2C42', color: '#64748B' }}>
                <span>Filed {r.filedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>Filed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReturnsPage() {
  return (
    <AuthGuard>
      <ClientShell><ReturnsContent /></ClientShell>
    </AuthGuard>
  )
}
