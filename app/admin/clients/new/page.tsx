'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminShell from '@/components/admin/AdminShell'
import { createClient } from '@/lib/clients'
import { convertLeadToClient } from '@/lib/leads'
import { PipelineStatus } from '@/types'
import { useToast } from '@/components/ui/Toast'

function AddClientForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()

  const leadDocs: string[] = JSON.parse(params.get('docs') ?? '[]')
  const [form, setForm] = useState({
    name: params.get('name') ?? '',
    phone: params.get('phone') ?? '',
    email: params.get('email') ?? '',
    pan: params.get('pan') ?? '',
    itrType: params.get('itr') ?? '',
    feeAmount: '',
  })
  const [busy, setBusy] = useState(false)
  const leadId = params.get('leadId')

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || form.name.trim().length < 2) { setError('Enter a valid full name'); return }
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) { setError('Phone must be a valid 10-digit Indian mobile number'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Enter a valid email address'); return }
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.toUpperCase())) { setError('PAN must be in format: ABCDE1234F'); return }
    setBusy(true)
    try {
      const clientId = await createClient({
        name: form.name,
        phone: form.phone,
        email: form.email,
        pan: form.pan ? form.pan.toUpperCase() : undefined,
        itrType: form.itrType || undefined,
        status: 'docs_pending' as PipelineStatus,
        assignedTo: 'admin',
        feeAmount: form.feeAmount ? Number(form.feeAmount) : undefined,
        feeStatus: 'unpaid',
        leadId: leadId ?? undefined,
        requiredDocs: leadDocs.length > 0 ? leadDocs : undefined,
      })
      if (leadId) await convertLeadToClient(leadId, clientId)
      toast('Client created successfully!')
      router.push(`/admin/clients/${clientId}`)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to create client', 'error')
    } finally { setBusy(false) }
  }

  const fields = [
    { key: 'name',      label: 'Full Name',      type: 'text',   placeholder: 'Rahul Sharma',       required: true },
    { key: 'phone',     label: 'Phone Number',   type: 'tel',    placeholder: '98765 43210',        required: true },
    { key: 'email',     label: 'Email Address',  type: 'email',  placeholder: 'rahul@example.com',  required: true },
    { key: 'pan',       label: 'PAN Number',     type: 'text',   placeholder: 'ABCDE1234F',         required: false },
    { key: 'itrType',   label: 'ITR Type',       type: 'text',   placeholder: 'ITR-2',              required: false },
    { key: 'feeAmount', label: 'Fee Amount (₹)', type: 'number', placeholder: '5000',               required: false },
  ]

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl space-y-5" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
        {leadId && (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#5BE090' }}>
            Converting lead to client
          </div>
        )}
        {fields.map(({ key, label, type, placeholder, required }) => (
          <div key={key}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>
              {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
            </label>
            <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]} required={required}
              onChange={e => set(key, key === 'pan' ? e.target.value.toUpperCase() : e.target.value)}
              maxLength={key === 'pan' ? 10 : undefined}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none font-mono"
              style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9', fontFamily: key === 'pan' ? 'monospace' : undefined }} />
            {key === 'pan' && form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan) && (
              <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>Format: ABCDE1234F (5 letters · 4 digits · 1 letter)</p>
            )}
          </div>
        ))}
        {error && <p className="text-xs py-2 px-3 rounded-lg" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: busy ? '#2A3A55' : '#3B82F6' }}>
            {busy ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AddClientPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminShell title="Add Client" subtitle="Create a new client account">
        <Suspense fallback={<div />}>
          <AddClientForm />
        </Suspense>
      </AdminShell>
    </AuthGuard>
  )
}
