'use client'
import { useEffect, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import AdminShell from '@/components/admin/AdminShell'
import { getPaymentSettings, savePaymentSettings } from '@/lib/settings'
import { PaymentSettings } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { CreditCard, Save } from 'lucide-react'

const DEFAULTS: PaymentSettings = {
  upiId:         'ekta.dani@ybl',
  upiName:       'Ekta Dhal',
  bankName:      'Punjab National Bank',
  accountHolder: 'Ekta Dhal',
  accountNumber: '04882191001402',
  ifsc:          'PUNB0048810',
}

function SettingsContent() {
  const [form, setForm] = useState<PaymentSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    getPaymentSettings().then(s => { setForm(s ?? DEFAULTS); setLoading(false) })
  }, [])

  async function save() {
    if (!form.upiId.trim() && !form.accountNumber.trim()) {
      toast('Enter at least a UPI ID or bank account', 'error'); return
    }
    setSaving(true)
    try {
      await savePaymentSettings(form)
      toast('Payment settings saved')
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const field = (label: string, key: keyof PaymentSettings, placeholder = '') => (
    <div key={key}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>{label}</label>
      <input
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}
      />
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Settings</h1>
      <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>Configure payment details shown to clients</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* UPI Section */}
          <div className="p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={15} style={{ color: '#3B82F6' }} />
              <p className="text-sm font-semibold">UPI Details</p>
            </div>
            <div className="space-y-4">
              {field('UPI ID', 'upiId', 'yourname@upi')}
              {field('Display Name (shown in UPI app)', 'upiName', 'Your Name / Business')}
            </div>
          </div>

          {/* Bank Section */}
          <div className="p-5 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={15} style={{ color: '#8B5CF6' }} />
              <p className="text-sm font-semibold">Bank Transfer Details</p>
            </div>
            <div className="space-y-4">
              {field('Account Holder Name', 'accountHolder', 'Full name as per bank')}
              {field('Bank Name', 'bankName', 'e.g. HDFC Bank')}
              {field('Account Number', 'accountNumber', '12-digit account number')}
              {field('IFSC Code', 'ifsc', 'e.g. HDFC0001234')}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminShell title="Settings">
        <SettingsContent />
      </AdminShell>
    </AuthGuard>
  )
}
