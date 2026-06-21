'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminSignIn } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'

export default function AdminLoginPage() {
  const router = useRouter()
  const { user, loading, isAdmin } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.replace(isAdmin ? '/admin' : '/dashboard')
    }
  }, [user, loading, isAdmin, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await adminSignIn(email, password)
      router.replace('/admin')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
      <div
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{ background: '#1E293B', border: '1px solid #1F2C42' }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}
          >
            T
          </div>
          <span className="font-semibold text-lg" style={{ color: '#F1F5F9' }}>TaxOS</span>
        </div>

        <h1 className="text-xl font-semibold mb-1" style={{ color: '#F1F5F9' }}>Admin login</h1>
        <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>Sign in to the consultant dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}
            />
          </div>

          {error && (
            <p className="text-xs py-2 px-3 rounded-lg" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: busy ? '#2A3A55' : '#3B82F6' }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 pt-5" style={{ borderTop: '1px solid #1F2C42' }}>
          <p className="text-xs text-center" style={{ color: '#64748B' }}>
            Are you a client?{' '}
            <a href="/login" className="font-medium" style={{ color: '#3B82F6' }}>
              Client login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
