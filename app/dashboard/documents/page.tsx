'use client'
import { useEffect, useRef, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import ClientShell from '@/components/client/ClientShell'
import { useAuth } from '@/lib/AuthContext'
import { getClientByEmail } from '@/lib/clients'
import { subscribeDocuments, addDocument, deleteDocument } from '@/lib/documents'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Client, ClientDocument, DocumentType } from '@/types'
import { FileText, Upload, CheckCircle, Clock, XCircle, AlertCircle, ExternalLink, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { notifyAdmin } from '@/lib/notifications'
import { emailAdminDocUploaded } from '@/lib/email'

// Raw Cloudinary URLs (PDFs/docs) open fine as-is; image URLs open inline
function docViewUrl(url: string): string { return url }

const docTypes: { value: DocumentType; label: string }[] = [
  { value: 'pan',           label: 'PAN Card' },
  { value: 'aadhaar',       label: 'Aadhaar Card' },
  { value: 'form16',        label: 'Form 16' },
  { value: 'ais',           label: 'AIS Statement' },
  { value: 'tis',           label: 'TIS Statement' },
  { value: 'capital_gains', label: 'Capital Gains Statement' },
  { value: 'bank_statement',label: 'Bank Statement' },
  { value: 'other',         label: 'Other' },
]

function ReviewIcon({ status }: { status: ClientDocument['reviewStatus'] }) {
  if (status === 'approved')            return <CheckCircle size={14} style={{ color: '#22C55E' }} />
  if (status === 'rejected')            return <XCircle    size={14} style={{ color: '#EF4444' }} />
  if (status === 'resubmission_needed') return <AlertCircle size={14} style={{ color: '#EF4444' }} />
  return <Clock size={14} style={{ color: '#F59E0B' }} />
}

function UploadButton({ label, clientId, clientEmail, onDone, existingDoc }: {
  label: string
  clientId: string
  clientEmail: string
  onDone: () => void
  existingDoc?: ClientDocument
}) {
  const { toast } = useToast()
  const { user } = useAuth()
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      const type: DocumentType = label.toLowerCase().includes('pan') ? 'pan'
        : label.toLowerCase().includes('aadhaar') ? 'aadhaar'
        : label.toLowerCase().includes('form 16') ? 'form16'
        : label.toLowerCase().includes('ais') ? 'ais'
        : label.toLowerCase().includes('capital') ? 'capital_gains'
        : label.toLowerCase().includes('bank') ? 'bank_statement'
        : 'other'
      await addDocument(clientId, { name: label, type, externalUrl: url, storagePath: '', uploadedBy: 'client', reviewStatus: 'pending' })
      const uploaderName = user?.displayName ?? clientEmail
      notifyAdmin('📄 Document uploaded', `${uploaderName} uploaded "${label}"`, 'doc_uploaded', clientId).catch(() => {})
      emailAdminDocUploaded(uploaderName, label, clientId).catch(() => {})
      toast('Uploaded successfully!')
      onDone()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally { setUploading(false); if (ref.current) ref.current.value = '' }
  }

  if (existingDoc) return (
    <div className="flex items-center gap-2">
      <ReviewIcon status={existingDoc.reviewStatus} />
      <span className="text-xs capitalize" style={{ color: existingDoc.reviewStatus === 'approved' ? '#22C55E' : existingDoc.reviewStatus === 'rejected' ? '#EF4444' : '#F59E0B' }}>
        {existingDoc.reviewStatus.replace('_', ' ')}
      </span>
      {existingDoc.externalUrl && (
        <a href={docViewUrl(existingDoc.externalUrl)} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={12} style={{ color: '#7CB0FB' }} />
        </a>
      )}
    </div>
  )

  return (
    <>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFile} />
      <button onClick={() => ref.current?.click()} disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{ background: 'rgba(59,130,246,0.12)', color: uploading ? '#64748B' : '#7CB0FB' }}>
        <Upload size={11} /> {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </>
  )
}

function DocsContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [docs, setDocs] = useState<ClientDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showManual, setShowManual] = useState(false)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState<DocumentType>('other')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    if (!user?.email) return
    let unsub: (() => void) | undefined
    getClientByEmail(user.email).then(c => {
      if (!c) { setLoading(false); return }
      setClient(c)
      setClientId(c.id)
      unsub = subscribeDocuments(c.id, d => { setDocs(d); setLoading(false) })
    })
    return () => unsub?.()
  }, [user])

  async function handleManualUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !selectedFile) return
    setBusy(true)
    try {
      const url = await uploadToCloudinary(selectedFile)
      await addDocument(clientId, { name: docName, type: docType, externalUrl: url, storagePath: '', uploadedBy: 'client', reviewStatus: 'pending' })
      const uploaderName2 = user?.displayName ?? user?.email ?? ''
      notifyAdmin('📄 Document uploaded', `${uploaderName2} uploaded "${docName}"`, 'doc_uploaded', clientId).catch(() => {})
      emailAdminDocUploaded(uploaderName2, docName, clientId).catch(() => {})
      setShowManual(false); setDocName(''); setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast('Document submitted!')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally { setBusy(false) }
  }

  const requiredDocs = client?.requiredDocs ?? []

  // Map uploaded docs by name (case-insensitive) for checklist matching
  const uploadedByName = (name: string) =>
    docs.find(d => d.name.toLowerCase() === name.toLowerCase())

  const extraDocs = docs.filter(d => !requiredDocs.some(r => r.toLowerCase() === d.name.toLowerCase()))

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Document Vault</h1>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Upload your documents for review</p>
        </div>
        <button onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: '#3B82F6' }}>
          <Upload size={15} /> Upload Other
        </button>
      </div>

      {/* Manual upload form */}
      {showManual && (
        <form onSubmit={handleManualUpload} className="p-5 rounded-2xl mb-6 space-y-4" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
          <h3 className="font-semibold">Upload Additional Document</h3>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Document Name</label>
            <input value={docName} onChange={e => setDocName(e.target.value)} required placeholder="e.g. Form 16 from Infosys"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Document Type</label>
            <select value={docType} onChange={e => setDocType(e.target.value as DocumentType)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
              {docTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Select File</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium"
              style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowManual(false)} className="flex-1 py-2.5 rounded-xl text-sm"
              style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#94A3B8' }}>Cancel</button>
            <button type="submit" disabled={busy || !selectedFile} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: busy ? '#2A3A55' : '#3B82F6' }}>{busy ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Required documents checklist */}
          {requiredDocs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#94A3B8' }}>
                REQUIRED DOCUMENTS
                <span className="ml-2 font-normal" style={{ color: '#64748B' }}>
                  {docs.filter(d => requiredDocs.some(r => r.toLowerCase() === d.name.toLowerCase())).length}/{requiredDocs.length} uploaded
                </span>
              </h2>
              <div className="space-y-2">
                {requiredDocs.map(name => {
                  const uploaded = uploadedByName(name)
                  return (
                    <div key={name} className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: '#1E293B', border: `1px solid ${uploaded ? '#1F2C42' : '#2A3A55'}` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: uploaded ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.08)' }}>
                          <FileText size={13} style={{ color: uploaded ? '#22C55E' : '#3B82F6' }} />
                        </div>
                        <span className="text-sm">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {clientId && (
                          <UploadButton label={name} clientId={clientId} clientEmail={client?.email ?? ''} onDone={() => {}} existingDoc={uploaded} />
                        )}
                        {uploaded && uploaded.uploadedBy === 'client' && clientId && (
                          <button onClick={async () => {
                            if (!confirm('Remove this document?')) return
                            await deleteDocument(clientId, uploaded.id)
                            toast('Document removed')
                          }} style={{ color: '#64748B' }} title="Remove">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Extra / manually uploaded docs */}
          {(extraDocs.length > 0 || requiredDocs.length === 0) && (
            <div>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#94A3B8' }}>
                {requiredDocs.length > 0 ? 'OTHER DOCUMENTS' : 'UPLOADED DOCUMENTS'}
              </h2>
              {extraDocs.length === 0 && requiredDocs.length === 0 ? (
                <div className="text-center py-16">
                  <FileText size={40} style={{ color: '#2A3A55', margin: '0 auto 12px' }} />
                  <p className="font-medium mb-1">No documents yet</p>
                  <p className="text-sm" style={{ color: '#64748B' }}>Click "Upload Other" above to add documents</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(requiredDocs.length === 0 ? docs : extraDocs).map(d => (
                    <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(59,130,246,0.12)' }}>
                        <FileText size={18} style={{ color: '#3B82F6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                          {docTypes.find(t => t.value === d.type)?.label} · {d.uploadedAt.toLocaleDateString('en-IN')}
                        </p>
                        {d.reviewNote && <p className="text-xs mt-1" style={{ color: '#FF8A8A' }}>{d.reviewNote}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ReviewIcon status={d.reviewStatus} />
                        <span className="text-xs capitalize" style={{ color: d.reviewStatus === 'approved' ? '#22C55E' : d.reviewStatus === 'rejected' ? '#EF4444' : '#F59E0B' }}>
                          {d.reviewStatus.replace('_', ' ')}
                        </span>
                        {d.externalUrl && (
                          <a href={docViewUrl(d.externalUrl)} target="_blank" rel="noopener noreferrer"
                            className="text-xs underline" style={{ color: '#7CB0FB' }}>
                            View
                          </a>
                        )}
                        {d.uploadedBy === 'client' && clientId && (
                          <button onClick={async () => {
                            if (!confirm('Remove this document?')) return
                            await deleteDocument(clientId, d.id)
                            toast('Document removed')
                          }} style={{ color: '#64748B' }} title="Remove">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function DocumentsPage() {
  return (
    <AuthGuard>
      <ClientShell><DocsContent /></ClientShell>
    </AuthGuard>
  )
}
