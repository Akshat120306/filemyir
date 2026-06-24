'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clientSignIn, clientSignUp, googleSignIn, signOut, resetPassword, resendVerificationEmail, updateDisplayName, linkEmailPassword } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import { getLeadByEmail } from '@/lib/leads'
import { getClientByEmail } from '@/lib/clients'
import { FirebaseError } from 'firebase/app'
import { Eye, EyeOff, ArrowRight, Mail, CheckCircle } from 'lucide-react'

function firebaseMsg(err: unknown): string {
  if (!(err instanceof FirebaseError)) return err instanceof Error ? err.message : 'Something went wrong'
  switch (err.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':    return 'Incorrect password. Please try again.'
    case 'auth/invalid-email':         return 'Invalid email address.'
    case 'auth/too-many-requests':     return 'Too many attempts. Try again in a few minutes.'
    case 'auth/user-disabled':         return 'This account has been disabled. Contact your consultant.'
    case 'auth/email-already-in-use':  return 'An account with this email already exists. Please sign in.'
    case 'auth/credential-already-in-use': return 'This email is already linked to another account.'
    case 'auth/provider-already-linked': return 'Password login is already set up for this account.'
    default: return 'Something went wrong. Please try again.'
  }
}

type Step = 'signin' | 'signup' | 'set_password' | 'forgot' | 'verify_email' | 'google_setup'
type Tab  = 'signin' | 'signup'

export default function ClientLoginPage() {
  const router = useRouter()
  const { user, loading, isAdmin } = useAuth()

  const [tab, setTab]           = useState<Tab>('signin')
  const [step, setStep]         = useState<Step>('signin')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const [busy, setBusy]         = useState(false)
  const [resent, setResent]     = useState(false)
  // google setup
  const [googleName, setGoogleName]   = useState('')
  const [googlePw, setGooglePw]       = useState('')
  const [googleCf, setGoogleCf]       = useState('')
  const [skipPw, setSkipPw]           = useState(false)
  const [googleSetupDone, setGoogleSetupDone] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) { router.replace('/admin'); return }
      // If user signed in with Google and hasn't done setup yet, show google_setup
      const isGoogle = user.providerData.some(p => p.providerId === 'google.com')
      const hasPassword = user.providerData.some(p => p.providerId === 'password')
      const isNew = !user.displayName || user.displayName === user.email
      if (isGoogle && !hasPassword && isNew && !googleSetupDone) {
        setGoogleName(user.displayName ?? '')
        setStep('google_setup')
        return
      }
      router.replace('/dashboard')
    }
  }, [user, loading, isAdmin, googleSetupDone, router])

  function switchTab(t: Tab) {
    setTab(t); setStep(t); setError(''); setInfo('')
    setPassword(''); setConfirm(''); setName('')
  }

  // ── Sign In ──────────────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo('')
    setBusy(true)
    try {
      await clientSignIn(email, password)
      router.replace('/dashboard')
    } catch (err: unknown) {
      const isNotFound = err instanceof FirebaseError &&
        (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')
      if (isNotFound) {
        try {
          const lead = await getLeadByEmail(email)
          if (lead) { setStep('set_password'); setError(''); return }
          const client = await getClientByEmail(email)
          if (client) { setStep('set_password'); setError(''); return }
          setError('No account found with this email. Please complete the free ITR assessment first.')
        } catch {
          setError('No account found. Please complete the free ITR assessment first.')
        }
      } else {
        setError(firebaseMsg(err))
      }
    } finally { setBusy(false) }
  }

  // ── Sign Up ──────────────────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      // Gate: must have completed assessment (use API route — Firestore rules block unauthenticated reads)
      try {
        const res = await fetch(`/api/check-lead?email=${encodeURIComponent(email)}`)
        const data = await res.json()
        if (!data.found) {
          setError('No ITR assessment found for this email. Please complete the free assessment first.')
          setBusy(false); return
        }
      } catch {
        setError('Could not verify your email. Please check your connection and try again.')
        setBusy(false); return
      }
      await clientSignUp(email, password, name.trim())
      setStep('verify_email')
    } catch (err: unknown) {
      if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
        setError('An account already exists. Please sign in instead.')
        setTab('signin'); setStep('signin')
      } else {
        setError(firebaseMsg(err))
      }
    } finally { setBusy(false) }
  }

  // ── Set Password (legacy first-time) ─────────────────────────────────────────
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
        setStep('signin'); setError('Account already exists. Please enter your existing password.')
      } else {
        setError(firebaseMsg(err))
      }
    } finally { setBusy(false) }
  }

  // ── Resend verification ───────────────────────────────────────────────────────
  async function handleResend() {
    setBusy(true)
    try { await resendVerificationEmail(); setResent(true) }
    catch { setError('Could not resend. Try again.') }
    finally { setBusy(false) }
  }

  // ── Forgot password ───────────────────────────────────────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email) { setError('Enter your email above.'); return }
    setBusy(true)
    try {
      await resetPassword(email)
      setInfo('Reset link sent. Check your inbox.')
      setStep('signin')
    } catch (err: unknown) { setError(firebaseMsg(err)) }
    finally { setBusy(false) }
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────────
  async function handleGoogle() {
    setError(''); setInfo('')
    setBusy(true)
    try {
      const googleUser = await googleSignIn()
      const em = googleUser.email!
      const [lead, client] = await Promise.all([getLeadByEmail(em), getClientByEmail(em)])
      if (!lead && !client) {
        await signOut()
        setError(`${em} hasn't completed the ITR assessment. Please visit /assess first.`)
        return
      }
      // useEffect handles routing / google_setup step
    } catch (err: unknown) {
      if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') return
      setError(firebaseMsg(err))
    } finally { setBusy(false) }
  }

  // ── Google Setup ──────────────────────────────────────────────────────────────
  async function handleGoogleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!googleName.trim()) { setError('Please enter your name.'); return }
    if (!skipPw) {
      if (googlePw.length < 6) { setError('Password must be at least 6 characters.'); return }
      if (googlePw !== googleCf) { setError('Passwords do not match.'); return }
    }
    setBusy(true)
    try {
      await updateDisplayName(googleName.trim())
      if (!skipPw) await linkEmailPassword(googlePw)
      setGoogleSetupDone(true)
      router.replace('/dashboard')
    } catch (err: unknown) { setError(firebaseMsg(err)) }
    finally { setBusy(false) }
  }

  if (loading) return null

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>T</div>
          <span className="font-semibold text-lg" style={{ color: '#F1F5F9' }}>FilemyITR</span>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid #1F2C42' }}>

          {/* Tabs — only show on signin/signup */}
          {(step === 'signin' || step === 'signup') && (
            <div className="flex" style={{ borderBottom: '1px solid #1F2C42' }}>
              {(['signin', 'signup'] as Tab[]).map(t => (
                <button key={t} onClick={() => switchTab(t)}
                  className="flex-1 py-3.5 text-sm font-medium transition-colors"
                  style={{
                    color: tab === t ? '#F1F5F9' : '#64748B',
                    borderBottom: tab === t ? '2px solid #3B82F6' : '2px solid transparent',
                    background: 'transparent',
                  }}>
                  {t === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          <div className="p-8">

            {/* ── SIGN IN ── */}
            {step === 'signin' && (
              <>
                <button onClick={handleGoogle} disabled={busy}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium mb-5"
                  style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                  </svg>
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
                  {info  && <p className="text-xs py-2 px-3 rounded-lg" style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}>{info}</p>}
                  {error && <p className="text-xs py-2 px-3 rounded-lg leading-relaxed" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>{error}</p>}
                  <button type="submit" disabled={busy}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: '#3B82F6', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
              </>
            )}

            {/* ── SIGN UP ── */}
            {step === 'signup' && (
              <>
                <button onClick={handleGoogle} disabled={busy}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium mb-5"
                  style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                  </svg>
                  Sign up with Google
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px" style={{ background: '#2A3A55' }} />
                  <span className="text-xs" style={{ color: '#64748B' }}>or</span>
                  <div className="flex-1 h-px" style={{ background: '#2A3A55' }} />
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Full Name</label>
                    <input type="text" placeholder="Your name" value={name} required
                      onChange={e => { setName(e.target.value); setError('') }}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                      style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Email</label>
                    <input type="email" placeholder="you@example.com" value={email} required
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                      style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Password</label>
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
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Confirm Password</label>
                    <div className="relative">
                      <input type={showCf ? 'text' : 'password'} placeholder="Re-enter password" value={confirm} required
                        onChange={e => { setConfirm(e.target.value); setError('') }}
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none pr-10"
                        style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                      <button type="button" onClick={() => setShowCf(!showCf)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }}>
                        {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-xs py-2 px-3 rounded-lg leading-relaxed" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>{error}</p>}
                  <button type="submit" disabled={busy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Creating account…' : 'Create account'} <ArrowRight size={15} />
                  </button>
                </form>
              </>
            )}

            {/* ── VERIFY EMAIL ── */}
            {step === 'verify_email' && (
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <Mail size={26} style={{ color: '#3B82F6' }} />
                </div>
                <h1 className="text-xl font-semibold mb-2" style={{ color: '#F1F5F9' }}>Verify your email</h1>
                <p className="text-sm mb-1" style={{ color: '#94A3B8' }}>
                  We sent a verification link to
                </p>
                <p className="text-sm font-medium mb-5" style={{ color: '#F1F5F9' }}>{email}</p>
                <p className="text-xs mb-6" style={{ color: '#64748B' }}>
                  Click the link in the email to activate your account, then come back and sign in.
                </p>
                {resent
                  ? <p className="text-xs py-2 px-3 rounded-lg mb-4" style={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}>
                      <CheckCircle size={12} className="inline mr-1" />Verification email resent!
                    </p>
                  : <button onClick={handleResend} disabled={busy}
                      className="text-xs mb-4 underline" style={{ color: '#64748B' }}>
                      Didn't get it? Resend email
                    </button>
                }
                {error && <p className="text-xs py-2 px-3 rounded-lg mb-4" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>{error}</p>}
                <button onClick={() => { switchTab('signin') }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#3B82F6' }}>
                  Go to Sign In
                </button>
              </div>
            )}

            {/* ── SET PASSWORD (legacy first-time from sign-in flow) ── */}
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

            {/* ── GOOGLE SETUP ── */}
            {step === 'google_setup' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(34,197,94,0.12)' }}>
                    <CheckCircle size={22} style={{ color: '#22C55E' }} />
                  </div>
                  <h1 className="text-xl font-semibold mb-1" style={{ color: '#F1F5F9' }}>One last step</h1>
                  <p className="text-sm" style={{ color: '#94A3B8' }}>Set your name and optionally a password for email login</p>
                </div>
                <form onSubmit={handleGoogleSetup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Your Name</label>
                    <input type="text" placeholder="Full name" value={googleName} required
                      onChange={e => { setGoogleName(e.target.value); setError('') }}
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                      style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                  </div>

                  <div className="p-3 rounded-xl" style={{ background: '#141E33', border: '1px solid #2A3A55' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#F1F5F9' }}>Set a password</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>So you can also sign in with email</p>
                      </div>
                      <button type="button" onClick={() => setSkipPw(!skipPw)}
                        className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
                        style={{ background: skipPw ? '#2A3A55' : '#3B82F6' }}>
                        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: skipPw ? '2px' : '22px' }} />
                      </button>
                    </div>
                  </div>

                  {!skipPw && (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Password</label>
                        <div className="relative">
                          <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters" value={googlePw}
                            onChange={e => { setGooglePw(e.target.value); setError('') }}
                            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none pr-10"
                            style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }}>
                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Confirm Password</label>
                        <input type="password" placeholder="Re-enter password" value={googleCf}
                          onChange={e => { setGoogleCf(e.target.value); setError('') }}
                          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                          style={{ background: '#141E33', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
                      </div>
                    </>
                  )}

                  {error && <p className="text-xs py-2 px-3 rounded-lg leading-relaxed" style={{ color: '#FF8A8A', background: 'rgba(239,68,68,0.1)' }}>{error}</p>}

                  <button type="submit" disabled={busy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Saving…' : 'Continue to portal'} <ArrowRight size={15} />
                  </button>
                </form>
              </>
            )}

          </div>
        </div>

        {/* Footer links */}
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs" style={{ color: '#64748B' }}>
            Consultant? <Link href="/admin/login" className="font-medium" style={{ color: '#3B82F6' }}>Admin login</Link>
          </p>
          <Link href="/assess" className="text-xs flex items-center gap-1" style={{ color: '#7CB0FB' }}>
            Free ITR check <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}
