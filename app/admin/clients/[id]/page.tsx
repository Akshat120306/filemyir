'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import AuthGuard from '@/components/AuthGuard'
import AdminShell from '@/components/admin/AdminShell'
import { getClient, updateClient, updateClientStatus, deleteClient } from '@/lib/clients'
import { getDocuments, addDocument, reviewDocument, subscribeDocuments } from '@/lib/documents'
import { getTasks, addTask, toggleTask } from '@/lib/tasks'
import { getNotes, addNote } from '@/lib/notes'
import { getPayments, addPayment, approvePayment, rejectPayment } from '@/lib/payments'
import { updateLeadStatus } from '@/lib/leads'
import { notifyClient } from '@/lib/notifications'
import { emailClientDocApproved, emailClientDocRejected, emailClientNewMessage, emailClientPaymentApproved, emailClientPaymentRejected } from '@/lib/email'
import { sendMessage, subscribeMessages } from '@/lib/messages'
import { getReturns, addReturn } from '@/lib/returns'
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary'
import { Client, ClientDocument, Task, Note, Payment, Message, Return, PIPELINE_STAGES, PipelineStatus, ReviewStatus, DocumentType } from '@/types'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { CheckCircle, FileText, CreditCard, MessageSquare, Send, Check, Edit2, X, Plus, Archive, Upload, ExternalLink, Trash2, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

const tabs = ['Overview', 'Documents', 'Tasks', 'Notes', 'Payments', 'Messages', 'Returns'] as const
type Tab = typeof tabs[number]

const docTypes: { value: DocumentType; label: string }[] = [
  { value: 'pan', label: 'PAN Card' }, { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'form16', label: 'Form 16' }, { value: 'ais', label: 'AIS Statement' },
  { value: 'tis', label: 'TIS Statement' }, { value: 'capital_gains', label: 'Capital Gains' },
  { value: 'bank_statement', label: 'Bank Statement' }, { value: 'other', label: 'Other' },
]

function statusStyle(s: string) {
  const map: Record<string, [string, string]> = {
    lead_created: ['#94A3B8', 'rgba(148,163,184,0.12)'],
    docs_pending: ['#FF8A8A', 'rgba(239,68,68,0.12)'],
    docs_received: ['#FBC373', 'rgba(245,158,11,0.12)'],
    review_started: ['#7CB0FB', 'rgba(59,130,246,0.12)'],
    return_preparation: ['#B6A0FA', 'rgba(139,92,246,0.12)'],
    ready_to_file: ['#5BE090', 'rgba(34,197,94,0.12)'],
    filed: ['#5BE090', 'rgba(34,197,94,0.12)'],
    closed: ['#94A3B8', 'rgba(148,163,184,0.12)'],
  }
  const [color, bg] = map[s] ?? ['#94A3B8', 'rgba(148,163,184,0.12)']
  return { color, bg }
}

function ReviewBadge({ status }: { status: ReviewStatus }) {
  const m: Record<ReviewStatus, [string, string, string]> = {
    pending: ['#FBC373', 'rgba(245,158,11,0.12)', 'Pending'],
    approved: ['#5BE090', 'rgba(34,197,94,0.12)', 'Approved'],
    rejected: ['#FF8A8A', 'rgba(239,68,68,0.12)', 'Rejected'],
    resubmission_needed: ['#FF8A8A', 'rgba(239,68,68,0.12)', 'Resubmit'],
  }
  const [color, bg, label] = m[status]
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ color, background: bg }}>{label}</span>
}

function EditModal({ client, onSave, onClose }: { client: Client; onSave: (d: Partial<Client>) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<{ name: string; phone: string; email: string; pan: string; itrType: string; feeAmount: string; feeStatus: 'paid' | 'unpaid' }>({
    name: client.name, phone: client.phone, email: client.email,
    pan: client.pan ?? '', itrType: client.itrType ?? '',
    feeAmount: client.feeAmount?.toString() ?? '', feeStatus: (client.feeStatus === 'paid' ? 'paid' : 'unpaid'),
  })
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  async function save() {
    if (!form.name.trim() || form.name.trim().length < 2) { toast('Enter a valid name', 'error'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast('Enter a valid email address', 'error'); return }
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) { toast('Enter a valid 10-digit mobile number', 'error'); return }
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.toUpperCase())) { toast('PAN must be in format: ABCDE1234F', 'error'); return }
    setBusy(true)
    try {
      await onSave({ name: form.name, phone: form.phone, email: form.email, pan: form.pan ? form.pan.toUpperCase() : undefined, itrType: form.itrType || undefined, feeAmount: form.feeAmount ? Number(form.feeAmount) : undefined, feeStatus: form.feeStatus })
      toast('Client updated'); onClose()
    } catch { toast('Failed', 'error') } finally { setBusy(false) }
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: '#1E293B', border: '1px solid #2A3A55' }}>
        <div className="flex items-center justify-between mb-2"><h2 className="text-lg font-semibold">Edit Client</h2><button onClick={onClose}><X size={18} style={{ color: '#64748B' }} /></button></div>
        {field('Name', 'name')}{field('Phone', 'phone')}{field('Email', 'email')}{field('PAN', 'pan')}{field('ITR Type', 'itrType')}{field('Fee Amount (INR)', 'feeAmount', 'number')}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Fee Status</label>
          <select value={form.feeStatus} onChange={e => setForm(p => ({ ...p, feeStatus: e.target.value as 'paid' | 'unpaid' }))}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
            <option value="unpaid">Unpaid</option><option value="paid">Paid</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: busy ? '#2A3A55' : '#3B82F6' }}>{busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

function AddReturnModal({ clientId, onClose, onAdded }: { clientId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ year: new Date().getFullYear() - 1, itrType: 'ITR-1', itrCopyUrl: '', acknowledgementUrl: '', acknowledgementNumber: '' })
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()
  async function save() {
    setBusy(true)
    try {
      await addReturn(clientId, { year: Number(form.year), itrType: form.itrType, itrCopyUrl: form.itrCopyUrl || undefined, acknowledgementUrl: form.acknowledgementUrl || undefined, acknowledgementNumber: form.acknowledgementNumber || undefined, filedAt: new Date() })
      toast('Return added'); onAdded(); onClose()
    } catch { toast('Failed', 'error') } finally { setBusy(false) }
  }
  const field = (label: string, key: keyof typeof form, ph = '') => (
    <div key={key}><label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>{label}</label>
      <input value={String(form[key])} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} /></div>
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: '#1E293B', border: '1px solid #2A3A55' }}>
        <div className="flex items-center justify-between mb-2"><h2 className="text-lg font-semibold">Add Filed Return</h2><button onClick={onClose}><X size={18} style={{ color: '#64748B' }} /></button></div>
        {field('Assessment Year', 'year')}{field('Acknowledgement Number', 'acknowledgementNumber', '12345...')}
        {field('ITR Copy Link', 'itrCopyUrl', 'https://')}{field('Acknowledgement Link', 'acknowledgementUrl', 'https://')}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>ITR Type</label>
          <select value={form.itrType} onChange={e => setForm(p => ({ ...p, itrType: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
            {['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: busy ? '#2A3A55' : '#3B82F6' }}>{busy ? 'Adding...' : 'Add Return'}</button>
        </div>
      </div>
    </div>
  )
}

type PaymentMode = 'upi' | 'imps' | 'neft' | 'rtgs' | 'cash'

function AddPaymentModal({ clientId, onClose, onAdded }: { clientId: string; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ description: '', amount: '', mode: 'upi' as PaymentMode, utr: '', status: 'paid' as 'paid' | 'unpaid' })
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const isCash     = form.mode === 'cash'
  const needsUtr   = !isCash
  const amountNum  = Number(form.amount)
  const isValid    = form.description.trim() && amountNum > 0 && (!needsUtr || form.utr.trim())

  async function save() {
    setBusy(true)
    try {
      await addPayment(clientId, {
        description:  form.description.trim(),
        amount:       amountNum,
        status:       form.status,
        paymentMode:  form.mode === 'cash' ? undefined : form.mode,
        utr:          needsUtr ? form.utr.trim() : undefined,
        submittedBy:  'admin',
        date:         new Date(),
      })
      toast('Payment recorded')
      onAdded()
      onClose()
    } catch { toast('Failed to record payment', 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1E293B', border: '1px solid #2A3A55' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{step === 'confirm' ? 'Confirm Payment' : 'Record Payment'}</h2>
          <button onClick={onClose}><X size={18} style={{ color: '#64748B' }} /></button>
        </div>

        {step === 'form' ? (
          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Description</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Advance payment, Final payment…"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
            </div>

            {/* Payment mode */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Payment Mode</label>
              <div className="grid grid-cols-5 gap-2">
                {(['upi', 'imps', 'neft', 'rtgs', 'cash'] as PaymentMode[]).map(m => (
                  <button key={m} onClick={() => setForm(p => ({ ...p, mode: m, utr: m === 'cash' ? '' : p.utr }))}
                    className="py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: form.mode === m ? (m === 'cash' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)') : '#141E33',
                      color:      form.mode === m ? (m === 'cash' ? '#22C55E' : '#7CB0FB') : '#64748B',
                      border:     `1px solid ${form.mode === m ? (m === 'cash' ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.4)') : '#2A3A55'}`,
                    }}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* UTR (not for cash) */}
            {needsUtr && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>
                  {form.mode === 'upi' ? 'UPI Transaction ID' : 'UTR Number'}
                </label>
                <input value={form.utr} onChange={e => setForm(p => ({ ...p, utr: e.target.value }))}
                  placeholder={form.mode === 'upi' ? '12-digit transaction ID' : form.mode === 'imps' ? 'IMPS UTR (12 digits)' : 'NEFT/RTGS UTR'}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono"
                  style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Status</label>
              <div className="flex gap-3">
                {([['paid', '#22C55E', 'rgba(34,197,94,0.12)'], ['unpaid', '#F59E0B', 'rgba(245,158,11,0.12)']] as const).map(([s, color, bg]) => (
                  <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all"
                    style={{ background: form.status === s ? bg : '#141E33', color: form.status === s ? color : '#64748B', border: `1px solid ${form.status === s ? color + '60' : '#2A3A55'}` }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>Cancel</button>
              <button onClick={() => setStep('confirm')} disabled={!isValid}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#3B82F6' }}>
                Review →
              </button>
            </div>
          </div>
        ) : (
          /* Confirm step */
          <div>
            <div className="p-4 rounded-xl mb-5 space-y-3" style={{ background: '#141E33', border: '1px solid #2A3A55' }}>
              {[
                ['Description',    form.description],
                ['Amount',         '₹' + amountNum.toLocaleString('en-IN')],
                ['Payment Mode',   form.mode.toUpperCase()],
                ...(needsUtr && form.utr ? [['UTR / Ref', form.utr] as [string, string]] : []),
                ['Status',         form.status],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span style={{ color: '#64748B' }}>{l}</span>
                  <span className="font-medium" style={{ color: l === 'Status' ? (form.status === 'paid' ? '#22C55E' : '#F59E0B') : '#F1F5F9' }}>{v}</span>
                </div>
              ))}
            </div>

            {isCash && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <span style={{ color: '#F59E0B', fontSize: 14 }}>⚠</span>
                <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                  You're recording a <strong style={{ color: '#F59E0B' }}>cash payment</strong>. Make sure you've physically received this amount before confirming.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>← Edit</button>
              <button onClick={save} disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: isCash ? '#22C55E' : '#3B82F6' }}>
                {busy ? 'Saving…' : isCash ? '✓ Confirm Cash Received' : '✓ Record Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RejectPaymentModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#1E293B', border: '1px solid #2A3A55' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Reject Payment</h2>
          <button onClick={onClose}><X size={16} style={{ color: '#64748B' }} /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>Tell the client why this payment was rejected so they can resubmit.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder="e.g. UTR number not found in bank records, wrong amount…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-4"
          style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>Cancel</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'rgba(239,68,68,0.8)' }}>
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

function Content({ clientId }: { clientId: string }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [docs, setDocs] = useState<ClientDocument[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [returns, setReturns] = useState<Return[]>([])
  const [tab, setTab] = useState<Tab>('Overview')
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [newTask, setNewTask] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddReturn, setShowAddReturn] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Required docs editing
  const [editingDocs, setEditingDocs] = useState(false)
  const [newDocName, setNewDocName] = useState('')

  // Admin file upload
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getClient(clientId), getTasks(clientId), getNotes(clientId), getPayments(clientId), getReturns(clientId)])
      .then(([c, t, n, p, r]) => { setClient(c); setTasks(t); setNotes(n); setPayments(p); setReturns(r); setLoading(false) })
    const unsubDocs = subscribeDocuments(clientId, setDocs)
    const unsubMsgs = subscribeMessages(clientId, setMessages)
    return () => { unsubDocs(); unsubMsgs() }
  }, [clientId])

  useEffect(() => {
    if (tab === 'Messages') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  async function changeStatus(s: PipelineStatus) {
    try { await updateClientStatus(clientId, s, user?.email ?? 'admin'); setClient(p => p ? { ...p, status: s } : p); toast('Status updated') }
    catch { toast('Failed', 'error') }
  }

  const router = useRouter()

  async function handleEditSave(data: Partial<Client>) {
    await updateClient(clientId, data); setClient(p => p ? { ...p, ...data } : p)
  }

  async function handleDeleteClient() {
    if (!client) return
    if (!confirm(`Delete client "${client.name}"? This cannot be undone.`)) return
    try {
      await deleteClient(clientId)
      toast('Client deleted')
      router.replace('/admin/clients')
    } catch { toast('Failed to delete', 'error') }
  }

  async function handleRevertToLead() {
    if (!client) return
    if (!confirm(`Revert "${client.name}" back to lead? Their client record will be deleted.`)) return
    try {
      if (client.leadId) await updateLeadStatus(client.leadId, 'contacted')
      await deleteClient(clientId)
      toast('Reverted to lead')
      router.replace('/admin/leads')
    } catch { toast('Failed to revert', 'error') }
  }

  async function addRequiredDoc() {
    if (!newDocName.trim() || !client) return
    const updated = [...(client.requiredDocs ?? []), newDocName.trim()]
    await updateClient(clientId, { requiredDocs: updated })
    setClient(p => p ? { ...p, requiredDocs: updated } : p)
    setNewDocName('')
  }

  async function removeRequiredDoc(name: string) {
    if (!client) return
    const updated = (client.requiredDocs ?? []).filter(d => d !== name)
    await updateClient(clientId, { requiredDocs: updated })
    setClient(p => p ? { ...p, requiredDocs: updated } : p)
  }

  async function handleAdminUpload(file: File, docName: string, type: DocumentType = 'other') {
    setUploadingFor(docName)
    try {
      const url = await uploadToCloudinary(file)
      await addDocument(clientId, { name: docName, type, externalUrl: url, storagePath: '', uploadedBy: 'consultant', reviewStatus: 'approved' })
      toast('Document uploaded')
    } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Upload failed', 'error') }
    finally { setUploadingFor(null); if (uploadRef.current) uploadRef.current.value = '' }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!client) return <div className="text-center py-16 text-sm" style={{ color: '#64748B' }}>Client not found</div>

  const ss = statusStyle(client.status)
  const totalFee = client.feeAmount ?? 0
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const remaining = totalFee - totalPaid

  return (
    <div>
      {showEdit && <EditModal client={client} onSave={handleEditSave} onClose={() => setShowEdit(false)} />}
      {showAddReturn   && <AddReturnModal clientId={clientId} onClose={() => setShowAddReturn(false)} onAdded={() => getReturns(clientId).then(setReturns)} />}
      {showAddPayment  && <AddPaymentModal clientId={clientId} onClose={() => setShowAddPayment(false)} onAdded={() => getPayments(clientId).then(setPayments)} />}
      {rejectingPaymentId && (
        <RejectPaymentModal
          onClose={() => setRejectingPaymentId(null)}
          onConfirm={async reason => {
            const rp = payments.find(p => p.id === rejectingPaymentId)
            await rejectPayment(clientId, rejectingPaymentId, reason)
            const ps = await getPayments(clientId); setPayments(ps)
            if (client && rp) { notifyClient(client.email, '⚠️ Payment could not be verified', reason, 'payment_submitted', clientId).catch(()=>{}); emailClientPaymentRejected(client.email, client.name, rp.amount, reason).catch(()=>{}) }
            toast('Payment rejected')
            setRejectingPaymentId(null)
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: '#B6A0FA' }}>
            {client.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{client.name}</h1>
              <button onClick={() => setShowEdit(true)} className="p-1 rounded-lg" style={{ color: '#64748B' }} title="Edit"><Edit2 size={14} /></button>
              {client.leadId && (
                <button onClick={handleRevertToLead} className="p-1 rounded-lg" style={{ color: '#F59E0B' }} title="Revert to lead"><RotateCcw size={14} /></button>
              )}
              <button onClick={handleDeleteClient} className="p-1 rounded-lg" style={{ color: '#FF8A8A' }} title="Delete client"><Trash2 size={14} /></button>
            </div>
            <div className="flex gap-4 mt-1 flex-wrap text-sm" style={{ color: '#94A3B8' }}>
              <span>{client.phone}</span><span>{client.email}</span>
              {client.itrType && <span className="font-semibold" style={{ color: '#7CB0FB' }}>{client.itrType}</span>}
            </div>
          </div>
        </div>
        <select value={client.status} onChange={e => changeStatus(e.target.value as PipelineStatus)}
          className="px-3 py-2 rounded-xl text-sm font-medium outline-none"
          style={{ background: ss.bg, color: ss.color, border: 'none' }}>
          {PIPELINE_STAGES.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {([['Documents', docs.length, FileText], ['Tasks', tasks.filter(t => t.completed).length + '/' + tasks.length, CheckCircle], ['Fee', client.feeAmount ? '₹' + client.feeAmount.toLocaleString('en-IN') : '-', CreditCard], ['Messages', messages.length, MessageSquare]] as const).map(([l, v, Icon]: any) => (
          <div key={l} className="p-4 rounded-xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <Icon size={15} style={{ color: '#64748B', marginBottom: 8 }} />
            <p className="text-lg font-bold">{v}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid #1F2C42' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-2.5 text-sm font-medium whitespace-nowrap"
            style={{ color: tab === t ? '#F1F5F9' : '#64748B', borderBottom: tab === t ? '2px solid #3B82F6' : '2px solid transparent', position: 'relative', top: 1 }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <h3 className="text-xs font-semibold uppercase mb-4" style={{ color: '#64748B', letterSpacing: '0.05em' }}>Personal Details</h3>
            {([['Name', client.name], ['Phone', client.phone], ['Email', client.email], ['PAN', client.pan ?? '-'], ['ITR Type', client.itrType ?? '-']] as const).map(([l, v]) => (
              <div key={l} className="flex justify-between py-2.5 text-sm" style={{ borderBottom: '1px solid #1F2C42' }}>
                <span style={{ color: '#64748B' }}>{l}</span><span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <h3 className="text-xs font-semibold uppercase mb-4" style={{ color: '#64748B', letterSpacing: '0.05em' }}>Fee and Status</h3>
            {([['Total Fee', totalFee ? '₹' + totalFee.toLocaleString('en-IN') : '-'], ['Total Paid', '₹' + totalPaid.toLocaleString('en-IN')], ['Remaining', '₹' + remaining.toLocaleString('en-IN')], ['Case Status', PIPELINE_STAGES.find(s => s.status === client.status)?.label ?? client.status]] as const).map(([l, v]) => (
              <div key={l} className="flex justify-between py-2.5 text-sm" style={{ borderBottom: '1px solid #1F2C42' }}>
                <span style={{ color: '#64748B' }}>{l}</span>
                <span className="font-medium" style={{ color: l === 'Remaining' && remaining > 0 ? '#F59E0B' : l === 'Total Paid' ? '#22C55E' : undefined }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab === 'Documents' && (
        <div>
          {/* Required docs checklist */}
          <div className="mb-6 p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Required Documents Checklist</h3>
              <button onClick={() => setEditingDocs(!editingDocs)} className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: editingDocs ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.12)', color: editingDocs ? '#FF8A8A' : '#7CB0FB' }}>
                {editingDocs ? 'Done Editing' : 'Edit List'}
              </button>
            </div>
            {(client.requiredDocs ?? []).length === 0 && !editingDocs && (
              <p className="text-sm" style={{ color: '#64748B' }}>No required documents set. Click "Edit List" to add.</p>
            )}
            <div className="space-y-2">
              {(client.requiredDocs ?? []).map(name => {
                const uploaded = docs.find(d => d.name.toLowerCase() === name.toLowerCase())
                return (
                  <div key={name} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: '#141E33' }}>
                    <div className="flex items-center gap-2">
                      {uploaded
                        ? <CheckCircle size={13} style={{ color: '#22C55E' }} />
                        : <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: '#2A3A55' }} />
                      }
                      <span className="text-sm">{name}</span>
                      {uploaded && <ReviewBadge status={uploaded.reviewStatus} />}
                    </div>
                    {editingDocs
                      ? <button onClick={() => removeRequiredDoc(name)} className="text-xs px-2 py-0.5 rounded" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>Remove</button>
                      : uploaded?.externalUrl
                        ? <a href={uploaded.externalUrl?.includes('/raw/upload/') ? `/api/doc-proxy?url=${encodeURIComponent(uploaded.externalUrl)}` : uploaded.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#7CB0FB' }}>View</a>
                        : null
                    }
                  </div>
                )
              })}
            </div>
            {editingDocs && (
              <div className="flex gap-2 mt-3">
                <input value={newDocName} onChange={e => setNewDocName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRequiredDoc()}
                  placeholder="Add document name and press Enter..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: '#0F172A', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                <button onClick={addRequiredDoc} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#3B82F6' }}>
                  <Plus size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Upload a doc as admin */}
          <div className="flex justify-end mb-4">
            <input ref={uploadRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                await handleAdminUpload(file, file.name.replace(/\.[^.]+$/, ''))
              }} />
            <button onClick={() => uploadRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: '#3B82F6' }}>
              <Upload size={14} /> Upload Document
            </button>
          </div>

          {docs.length === 0 && <p className="text-center py-8 text-sm" style={{ color: '#64748B' }}>No documents uploaded</p>}
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl mb-3" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
                <FileText size={15} style={{ color: '#3B82F6' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs" style={{ color: '#64748B' }}>{d.type} · {d.uploadedBy} · {d.uploadedAt.toLocaleDateString('en-IN')}</p>
                {d.reviewNote && <p className="text-xs mt-0.5" style={{ color: '#FF8A8A' }}>{d.reviewNote}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ReviewBadge status={d.reviewStatus} />
                {d.externalUrl && (
                  <a href={d.externalUrl.includes('/raw/upload/') ? `/api/doc-proxy?url=${encodeURIComponent(d.externalUrl)}` : d.externalUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={13} style={{ color: '#7CB0FB' }} />
                  </a>
                )}
                {d.reviewStatus === 'pending' && (
                  <>
                    <button onClick={async () => { await reviewDocument(clientId, d.id, 'approved'); if (client) { notifyClient(client.email, '✅ Document approved', `"${d.name}" has been approved`, 'doc_reviewed', clientId).catch(()=>{}); emailClientDocApproved(client.email, client.name, d.name).catch(()=>{}) } toast('Approved') }}
                      className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(34,197,94,0.12)', color: '#5BE090' }}>Approve</button>
                    <button onClick={async () => { const note = prompt('Rejection reason:'); if (note === null) return; await reviewDocument(clientId, d.id, 'rejected', note); if (client) { notifyClient(client.email, '⚠️ Document needs resubmission', `"${d.name}": ${note}`, 'doc_reviewed', clientId).catch(()=>{}); emailClientDocRejected(client.email, client.name, d.name, note).catch(()=>{}) } toast('Rejected') }}
                      className="px-3 py-1 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#FF8A8A' }}>Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TASKS ── */}
      {tab === 'Tasks' && (
        <div>
          <div className="flex gap-3 mb-4">
            <input value={newTask} onChange={e => setNewTask(e.target.value)}
              onKeyDown={async e => { if (e.key !== 'Enter' || !newTask.trim()) return; await addTask(clientId, { title: newTask, priority: 'medium', completed: false }); const t = await getTasks(clientId); setTasks(t); setNewTask(''); toast('Task added') }}
              placeholder="Add task and press Enter..."
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#1E293B', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
          </div>
          {tasks.length === 0 && <p className="text-center py-8 text-sm" style={{ color: '#64748B' }}>No tasks</p>}
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-4 rounded-xl mb-2" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <button onClick={() => { toggleTask(clientId, t.id, !t.completed); setTasks(prev => prev.map(x => x.id === t.id ? { ...x, completed: !t.completed } : x)) }}
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: t.completed ? '#22C55E' : 'transparent', border: t.completed ? 'none' : '1.5px solid #2A3A55' }}>
                {t.completed && <Check size={12} style={{ color: '#0F2918' }} />}
              </button>
              <p className="text-sm flex-1" style={{ color: t.completed ? '#64748B' : '#F1F5F9', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.priority === 'high' ? 'rgba(239,68,68,0.12)' : t.priority === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)', color: t.priority === 'high' ? '#FF8A8A' : t.priority === 'medium' ? '#FBC373' : '#5BE090' }}>{t.priority}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── NOTES ── */}
      {tab === 'Notes' && (
        <div>
          <div className="flex gap-3 mb-4">
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} placeholder="Add a note..."
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#1E293B', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
            <button onClick={async () => { if (!newNote.trim()) return; await addNote(clientId, newNote, user?.email ?? 'admin'); const n = await getNotes(clientId); setNotes(n); setNewNote(''); toast('Note added') }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white self-start" style={{ background: '#3B82F6' }}>Add</button>
          </div>
          {notes.length === 0 && <p className="text-center py-8 text-sm" style={{ color: '#64748B' }}>No notes</p>}
          {notes.map(n => (
            <div key={n.id} className="p-4 rounded-xl mb-3" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div className="flex justify-between mb-2 text-xs" style={{ color: '#64748B' }}><span>{n.authorId}</span><span>{n.createdAt.toLocaleDateString('en-IN')}</span></div>
              <p className="text-sm leading-relaxed">{n.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {tab === 'Payments' && (
        <div>
          {/* Fee breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[['Total Fee', '₹' + totalFee.toLocaleString('en-IN'), '#8B5CF6'], ['Paid', '₹' + totalPaid.toLocaleString('en-IN'), '#22C55E'], ['Remaining', '₹' + remaining.toLocaleString('en-IN'), remaining > 0 ? '#F59E0B' : '#22C55E']].map(([l, v, c]) => (
              <div key={l} className="p-4 rounded-xl text-center" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
                <p className="text-lg font-bold" style={{ color: c }}>{v}</p>
                <p className="text-xs mt-1" style={{ color: '#64748B' }}>{l}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddPayment(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#3B82F6' }}>
              <Plus size={14} /> Add Payment
            </button>
          </div>

          {/* Pending UTR verifications */}
          {payments.filter(p => p.status === 'pending_verification').length > 0 && (
            <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <p className="text-xs font-semibold uppercase mb-3" style={{ color: '#7CB0FB', letterSpacing: '0.06em' }}>Pending Verification</p>
              {payments.filter(p => p.status === 'pending_verification').map(p => (
                <div key={p.id} className="p-4 rounded-xl mb-2 last:mb-0" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">₹{p.amount.toLocaleString('en-IN')}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{p.date.toLocaleDateString('en-IN')} · {p.paymentMode?.toUpperCase()}</p>
                      {p.utr && <p className="text-xs mt-1 font-mono px-2 py-0.5 rounded-md inline-block" style={{ background: '#0F172A', color: '#94A3B8' }}>UTR: {p.utr}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={async () => { await approvePayment(clientId, p.id); const ps = await getPayments(clientId); setPayments(ps); if (client) { notifyClient(client.email, '✅ Payment confirmed', `₹${p.amount.toLocaleString('en-IN')} has been verified`, 'payment_submitted', clientId).catch(()=>{}); emailClientPaymentApproved(client.email, client.name, p.amount).catch(()=>{}) } toast('Payment approved') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.12)', color: '#5BE090' }}>
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setRejectingPaymentId(p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#FF8A8A' }}>
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {payments.length === 0 && <p className="text-center py-8 text-sm" style={{ color: '#64748B' }}>No payments</p>}
          {payments.filter(p => p.status !== 'pending_verification').map(p => (
            <div key={p.id} className="flex justify-between items-center p-4 rounded-xl mb-3" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div>
                <p className="text-sm font-medium">{p.description}</p>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{p.date.toLocaleDateString('en-IN')}{p.utr && ` · UTR: ${p.utr}`}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{p.amount.toLocaleString('en-IN')}</p>
                <span className="text-xs" style={{ color: p.status === 'paid' ? '#22C55E' : '#FF8A8A' }}>{p.status}</span>
                {p.rejectionReason && <p className="text-xs" style={{ color: '#FF8A8A' }}>{p.rejectionReason}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MESSAGES ── */}
      {tab === 'Messages' && (
        <div>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 && <p className="text-center py-8 text-sm" style={{ color: '#64748B' }}>No messages</p>}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.senderType === 'consultant' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-xs px-4 py-3 rounded-2xl text-sm"
                  style={{ background: m.senderType === 'consultant' ? '#3B82F6' : '#1E293B', color: '#fff', border: m.senderType === 'consultant' ? 'none' : '1px solid #2A3A55' }}>
                  {m.text}
                  <p className="text-xs mt-1 opacity-50">{m.sentAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-3">
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={async e => { if (e.key !== 'Enter' || !newMsg.trim()) return; await sendMessage(clientId, newMsg, user?.uid ?? 'admin', 'consultant'); if (client) { notifyClient(client.email, '💬 New message from your consultant', newMsg.slice(0,80), 'new_message', clientId).catch(()=>{}); emailClientNewMessage(client.email, client.name, newMsg).catch(()=>{}) } setNewMsg('') }}
              placeholder="Type a message..." className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#1E293B', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
            <button onClick={async () => { if (!newMsg.trim()) return; await sendMessage(clientId, newMsg, user?.uid ?? 'admin', 'consultant'); if (client) notifyClient(client.email, '💬 New message from your consultant', newMsg.slice(0,80), 'new_message', clientId).catch(()=>{}); setNewMsg('') }}
              className="px-4 py-2.5 rounded-xl" style={{ background: '#3B82F6', color: '#fff' }}><Send size={15} /></button>
          </div>
        </div>
      )}

      {/* ── RETURNS ── */}
      {tab === 'Returns' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddReturn(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#22C55E' }}>
              <Archive size={14} /> Add Filed Return
            </button>
          </div>
          {returns.length === 0 && <p className="text-center py-8 text-sm" style={{ color: '#64748B' }}>No returns filed yet</p>}
          {returns.map(r => (
            <div key={r.id} className="p-5 rounded-2xl mb-4" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">AY {r.year}-{String(r.year + 1).slice(2)}</p>
                  <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>{r.itrType}</p>
                  {r.acknowledgementNumber && <p className="text-xs mt-1 font-mono" style={{ color: '#64748B' }}>Ack: {r.acknowledgementNumber}</p>}
                </div>
                <div className="flex gap-2">
                  {r.itrCopyUrl && <a href={r.itrCopyUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(59,130,246,0.12)', color: '#7CB0FB' }}>ITR Copy</a>}
                  {r.acknowledgementUrl && <a href={r.acknowledgementUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(139,92,246,0.12)', color: '#B6A0FA' }}>Acknowledgement</a>}
                </div>
              </div>
              <p className="text-xs mt-3 pt-3" style={{ borderTop: '1px solid #1F2C42', color: '#64748B' }}>Filed {r.filedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClientProfilePage() {
  const params = useParams()
  return (
    <AuthGuard requireAdmin>
      <AdminShell title="Client Profile">
        <Content clientId={params.id as string} />
      </AdminShell>
    </AuthGuard>
  )
}
