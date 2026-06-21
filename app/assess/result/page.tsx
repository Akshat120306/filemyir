'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Shield } from 'lucide-react'
import { IncomeType } from '@/types'

const complexityConfig = {
  simple:   { label: 'Simple Filing',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  moderate: { label: 'Moderate Filing', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  complex:  { label: 'Complex Filing',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

const itrColor: Record<string, string> = {
  'ITR-1': '#22C55E', 'ITR-2': '#F59E0B', 'ITR-3': '#EF4444', 'ITR-4': '#8B5CF6',
}

function ResultContent() {
  const params     = useSearchParams()
  const itr        = params.get('itr') ?? 'ITR-2'
  const complexity = (params.get('complexity') ?? 'moderate') as keyof typeof complexityConfig
  const confidence = params.get('confidence') ? Number(params.get('confidence')) : null
  const docs: string[]            = JSON.parse(params.get('docs') ?? '[]')
  const reason                    = params.get('reason') ?? ''
  const incomeTypes: IncomeType[] = JSON.parse(params.get('incomeTypes') ?? '[]')
  const cfg   = complexityConfig[complexity] ?? complexityConfig.moderate
  const color = itrColor[itr] ?? '#F59E0B'

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <Link href="/assess" className="inline-flex items-center gap-2 text-sm mb-8" style={{ color: '#64748B' }}>
        <ArrowLeft size={14} /> Redo assessment
      </Link>

      <div className="flex items-center gap-2 mb-6">
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
          <CheckCircle size={13} style={{ color: '#22C55E' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: '#22C55E' }}>Assessment complete</p>
      </div>

      <h1 className="text-2xl font-bold mb-1">Your ITR Recommendation</h1>
      <p className="mb-7 text-sm" style={{ color: '#94A3B8' }}>{reason || 'Based on your income sources and profile.'}</p>

      <div className="p-6 rounded-2xl mb-4" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#64748B', letterSpacing: '0.06em' }}>RECOMMENDED FORM</p>
            <p className="text-4xl font-black" style={{ color }}>{itr}</p>
          </div>
          <div className="text-right">
            {confidence && <p className="text-2xl font-black mb-1">{confidence}%</p>}
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>

        {confidence && (
          <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: '#141E33' }}>
            <div className="h-full rounded-full" style={{ width: confidence + '%', background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
          </div>
        )}

        <div className="h-px mb-4" style={{ background: '#2A3A55' }} />
        <p className="text-xs font-semibold mb-3" style={{ color: '#64748B', letterSpacing: '0.06em' }}>DOCUMENTS YOU WILL NEED</p>
        <div className="space-y-2">
          {docs.map(d => (
            <div key={d} className="flex items-center gap-3 text-sm">
              <FileText size={12} style={{ color: '#3B82F6', flexShrink: 0 }} />
              <span style={{ color: '#CBD5E1' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl mb-7" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <Shield size={14} style={{ color: '#7CB0FB', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
          <span className="font-medium" style={{ color: '#7CB0FB' }}>Not a legal determination.</span> Final review will be performed by a tax professional.
        </p>
      </div>

      <Link href="/login" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white mb-3"
        style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
        Create Account to Track Filing <ArrowRight size={16} />
      </Link>
      <p className="text-center text-xs" style={{ color: '#64748B' }}>
        Already have an account? <Link href="/login" style={{ color: '#7CB0FB' }}>Log in</Link>
      </p>
    </div>
  )
}

export default function ResultPage() {
  return (
    <div style={{ background: '#0A0F1E', minHeight: '100vh', color: '#F1F5F9' }}>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <ResultContent />
      </Suspense>
    </div>
  )
}
