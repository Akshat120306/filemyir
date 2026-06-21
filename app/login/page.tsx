'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clientSignIn, clientSignUp, googleSignIn, signOut, resetPassword } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import { getLeadByEmail } from '@/lib/leads'
import { getClientByEmail } from '@/lib/clients'
import { FirebaseError } from 'firebase/app'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

function firebaseMsg(err: unknown): string {
  if (!(err instanceof FirebaseError)) return err instanceof Error ? err.message : 'Something went wrong'
  switch (err.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect password. Please try again.'
    case 'auth/invalid-email':      return 'Invalid email address.'
    case 'auth/too-many-requests':  return 'Too many attempts. Try again in a few minutes.'
    case 'auth/user-disabled':      return 'This account has been disabled. Contact your consultant.'
    default: return 'Sign in failed. Please try again.'
  }
}

type Step = 'signin' | 'set_password' | 'forgot'

export default function ClientLoginPage() {
  const router = useRouter()
  const { user, loading, isAdmin } = useAuth()
  const [step, setStep]     = useState<Step>('signin')
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [busy, setBusy]         = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace(isAdmin ? '/admin' : '/dashboard')
  }, [user, loading, isAdmin, router])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo('')
    setBusy(true)
    try {
      await clientSignIn(email, password)
      router.replace('/dashboard')
    } catch (err: unknown) {
      // User not found → check if they have a lead (came through assessment)
      const isNotFound = err instanceof FirebaseError &&
        (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')

      if (isNotFound) {
        // Try to detect "wrong password for existing account" vs "account doesn't exist"
        // We check Firestore — if lead exists, offer account setup; otherwise block entirely
        try {
          const lead = await getLeadByEmail(email)
          if (lead) {
            // First time logging in — move them to password-creation step
            setStep('set_password')
            setError('')
          } else {
            const client = await getClientByEmail(email)
            if (client) {
              // Client account but no Firebase auth account — shouldn't happen, but handle gracefully
              setStep('set_password')
              setError('')
            } else {
              setError('No account found with this email. Please complete the free ITR assessment first.')
            }
          }
        } catch {
          setError('No account found. Please complete the free ITR assessment at /assess first.')
        }
      } else {
        setError(firebaseMsg(err))
      }
    } finally { setBusy(false) }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      await clientSignUp(email, password)
      router.replace('/dashboard')
    } catch (err: unknown) {
      if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
        // Account actually exists — wrong password earlier
        setStep('signin')
        setError('Account already exists. Please enter your existing password.')
      } else {
        setError(firebaseMsg(err))
      }
    } finally { setBusy(false) }
  }

  async function handleGoogle() {
    setError(''); setInfo('')
    setBusy(true)
    try {
      const googleUser = await googleSignIn()
      const email = googleUser.email!
      // Check if this Google account is linked to a lead or client
      const [lead, client] = await Promise.all([
        getLeadByEmail(email),
        getClientByEmail(email),
      ])
      if (!lead && !client) {
        await signOut()
        setError(
          `${email} hasn't completed the ITR assessment. ` +
          'Please visit /assess first, then log in with this Google account.'
        )
        return
      }
      router.replace('/dashboard')
    } catch (err: unknown) {
      if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') return
      setError(firebaseMsg(err))
    } finally { setBusy(false) }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email) { setError('Enter your email above.'); return }
    setBusy(true)
    try {
      await resetPassword(email)
      setInfo('Password reset email sent. Check your inbox.')
      setStep('signin')
    } catch (err: unknown) {
      setError(firebaseMsg(err))
    } finally { setBusy(false) }
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>T</div>
          <span className="font-semibold text-lg" style={{ color: '#F1F5F9' }}>TaxOS</span>
        </div>

        <div className="p-8 rounded-2xl" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>

          {/* ── SIGN IN ── */}
          {step === 'signin' && (
            <>
              <h1 className="text-xl font-semibold mb-1" style={{ color: '#F1F5F9' }}>Sign in</h1>
              <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>Access your ITR filing portal</p>

              <button onClick={handleGoogle} disabled={busy}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium mb-5 transition-all"
                style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: '#2A3A55' }} />
                <span className="text-xs" style={{ color: '#64748B' }}>or</span>
                <div className="flex-1 h-px" style={{ background: '#2A3A55' }} />
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Email</label>
                  <input type="email" placeholder="you@example.com" value={email} required
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: '#94A3B8' }}>Password</label>
                    <button type="button" onClick={() => setStep('forgot')} className="text-xs" style={{ color: '#64748B' }}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} required
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none pr-10"
                      style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {info && <p className="text-xs py-2 px-3 rounded-lg" style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}>{info}</p>}
                {error && <p className="text-xs py-2 px-3 rounded-lg leading-relaxed" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>{error}</p>}

                <button type="submit" disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                  style={{ background: '#3B82F6', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </>
          )}

          {/* ── SET PASSWORD (first-time login) ── */}
          {step === 'set_password' && (
            <>
              <button onClick={() => { setStep('signin'); setError(''); setPassword(''); setConfirm('') }}
                className="text-xs mb-4 flex items-center gap-1" style={{ color: '#64748B' }}>
                ← Back
              </button>
              <h1 className="text-xl font-semibold mb-1" style={{ color: '#F1F5F9' }}>Set your password</h1>
              <p className="text-sm mb-1" style={{ color: '#94A3B8' }}>Welcome! Create a password to access your portal.</p>
              <p className="text-xs mb-6 px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', color: '#5BE090' }}>
                Assessment found for <strong>{email}</strong>
              </p>

              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>New password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters" value={password} required
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none pr-10"
                      style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Confirm password</label>
                  <input type="password" placeholder="Re-enter password" value={confirm} required
                    onChange={e => { setConfirm(e.target.value); setError('') }}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                </div>

                {error && <p className="text-xs py-2 px-3 rounded-lg leading-relaxed" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>{error}</p>}

                <button type="submit" disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Creating account…' : 'Create account & sign in'} <ArrowRight size={15} />
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {step === 'forgot' && (
            <>
              <button onClick={() => { setStep('signin'); setError(''); setInfo('') }}
                className="text-xs mb-4 flex items-center gap-1" style={{ color: '#64748B' }}>
                ← Back to sign in
              </button>
              <h1 className="text-xl font-semibold mb-1" style={{ color: '#F1F5F9' }}>Reset password</h1>
              <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>We'll send a reset link to your email.</p>

              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Email</label>
                  <input type="email" placeholder="you@example.com" value={email} required
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                    style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                </div>
                {info  && <p className="text-xs py-2 px-3 rounded-lg" style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}>{info}</p>}
                {error && <p className="text-xs py-2 px-3 rounded-lg" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>{error}</p>}
                <button type="submit" disabled={busy}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#3B82F6', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #1F2C42' }}>
            <p className="text-xs text-center" style={{ color: '#64748B' }}>
              Consultant? <Link href="/admin/login" className="font-medium" style={{ color: '#3B82F6' }}>Admin login</Link>
            </p>
          </div>
        </div>

        {/* New user CTA */}
        <div className="mt-5 p-4 rounded-2xl text-center" style={{ background: '#141E33', border: '1px solid #1F2C42' }}>
          <p className="text-xs mb-2" style={{ color: '#64748B' }}>First time here? Don't have an account yet?</p>
          <Link href="/assess"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: '#7CB0FB' }}>
            Find out which ITR you need — free <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  )
}
