'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, GitBranch, Bell, Search, LogOut, Inbox, X, FileText, MessageSquare, User, Settings, UserPlus, CreditCard, Menu } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { subscribeNotifications, markAllRead } from '@/lib/notifications'
import { Notification } from '@/types'

const nav = [
  { href: '/admin',           label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/leads',     label: 'Leads',      icon: Inbox },
  { href: '/admin/clients',   label: 'Clients',    icon: Users },
  { href: '/admin/pipeline',  label: 'Pipeline',   icon: GitBranch },
  { href: '/admin/payments',  label: 'Payments',   icon: CreditCard },
  { href: '/admin/settings',  label: 'Settings',   icon: Settings },
]

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL!

const notifIcon: Record<Notification['type'], React.ElementType> = {
  doc_uploaded: FileText, doc_reviewed: FileText, new_message: MessageSquare,
  new_lead: User, return_filed: FileText, payment_submitted: CreditCard,
}

export default function AdminShell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs]       = useState(false)
  const [showDrawer, setShowDrawer]       = useState(false)
  const [search, setSearch]               = useState(false)
  const [searchVal, setSearchVal]         = useState('')
  const notifRef  = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!ADMIN_EMAIL) return
    const unsub = subscribeNotifications(ADMIN_EMAIL, setNotifications)
    return unsub
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close drawer on route change
  useEffect(() => { setShowDrawer(false) }, [pathname])

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && searchVal.trim()) {
      router.push(`/admin/clients?q=${encodeURIComponent(searchVal.trim())}`)
      setSearchVal(''); setSearch(false)
    }
    if (e.key === 'Escape') { setSearch(false); setSearchVal('') }
  }

  const NavLinks = () => (
    <>
      <nav className="flex-1 px-3 space-y-0.5 py-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ color: active ? '#7CB0FB' : '#94A3B8', background: active ? 'rgba(59,130,246,0.14)' : 'transparent' }}>
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 space-y-2" style={{ borderTop: '1px solid #1F2C42' }}>
        <Link href="/admin/clients/new"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#3B82F6', color: '#fff' }}>
          <UserPlus size={15} /> Add Client
        </Link>
        <button onClick={async () => { await signOut(); router.replace('/admin/login') }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium"
          style={{ color: '#64748B' }}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen" style={{ background: '#0F172A' }}>

      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col" style={{ background: '#141E33', borderRight: '1px solid #1F2C42' }}>
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>T</div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#F1F5F9' }}>FilemyITR</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Admin</p>
          </div>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile drawer overlay */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDrawer(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ background: '#141E33', borderRight: '1px solid #1F2C42' }}>
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>T</div>
                <p className="font-semibold text-sm" style={{ color: '#F1F5F9' }}>FilemyITR</p>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ color: '#64748B' }}><X size={20} /></button>
            </div>
            <NavLinks />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-7 sticky top-0 z-40"
          style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1F2C42' }}>

          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button className="md:hidden p-1.5 rounded-lg" style={{ color: '#94A3B8' }}
              onClick={() => setShowDrawer(true)}>
              <Menu size={20} />
            </button>
            <div>
              {title && <h1 className="text-base md:text-lg font-semibold leading-tight" style={{ color: '#F1F5F9' }}>{title}</h1>}
              {subtitle && <p className="text-xs hidden sm:block" style={{ color: '#64748B' }}>{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Search — desktop always visible, mobile toggle */}
            {search ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#1E293B', border: '1px solid #1F2C42', width: 220 }}>
                <Search size={14} style={{ color: '#64748B', flexShrink: 0 }} />
                <input ref={searchRef} autoFocus value={searchVal} onChange={e => setSearchVal(e.target.value)} onKeyDown={handleSearch}
                  placeholder="Search clients…"
                  className="flex-1 bg-transparent outline-none text-sm" style={{ color: '#F1F5F9' }} />
                <button onClick={() => { setSearch(false); setSearchVal('') }}><X size={12} style={{ color: '#64748B' }} /></button>
              </div>
            ) : (
              <>
                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#1E293B', border: '1px solid #1F2C42', width: 240 }}>
                  <Search size={14} style={{ color: '#64748B', flexShrink: 0 }} />
                  <input value={searchVal} onChange={e => setSearchVal(e.target.value)} onKeyDown={handleSearch}
                    placeholder="Search clients… (Enter)"
                    className="flex-1 bg-transparent outline-none text-sm" style={{ color: '#F1F5F9' }} />
                  {searchVal && <button onClick={() => setSearchVal('')}><X size={12} style={{ color: '#64748B' }} /></button>}
                </div>
                <button className="md:hidden p-2 rounded-lg" style={{ color: '#94A3B8' }}
                  onClick={() => { setSearch(true); setTimeout(() => searchRef.current?.focus(), 50) }}>
                  <Search size={18} />
                </button>
              </>
            )}

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) markAllRead(ADMIN_EMAIL) }}
                className="relative p-2 rounded-lg" style={{ color: '#94A3B8', background: showNotifs ? '#1E293B' : 'transparent' }}>
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center text-xs font-bold"
                    style={{ background: '#EF4444', fontSize: '10px' }}>{unread > 9 ? '9+' : unread}</span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
                  style={{ background: '#1E293B', border: '1px solid #2A3A55', width: 'min(320px, calc(100vw - 32px))' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2A3A55' }}>
                    <p className="text-sm font-semibold">Notifications</p>
                    <button onClick={() => setShowNotifs(false)}><X size={14} style={{ color: '#64748B' }} /></button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center py-8 text-sm" style={{ color: '#64748B' }}>No notifications</p>
                    ) : notifications.slice(0, 15).map(n => {
                      const Icon = notifIcon[n.type] ?? Bell
                      return (
                        <div key={n.id} className="flex gap-3 px-4 py-3 cursor-pointer"
                          style={{ background: n.read ? 'transparent' : 'rgba(59,130,246,0.06)', borderBottom: '1px solid #1F2C42' }}
                          onClick={() => { if (n.clientId) router.push(`/admin/clients/${n.clientId}`); setShowNotifs(false) }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(59,130,246,0.12)' }}>
                            <Icon size={13} style={{ color: '#7CB0FB' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{n.title}</p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>{n.body}</p>
                            <p className="text-xs mt-1" style={{ color: '#475569' }}>
                              {n.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {n.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#3B82F6' }} />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-7 pb-20 md:pb-10 overflow-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex justify-around py-2"
          style={{ background: '#141E33', borderTop: '1px solid #1F2C42' }}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-2 py-1">
                <Icon size={19} style={{ color: active ? '#7CB0FB' : '#64748B' }} />
                <span className="text-xs" style={{ color: active ? '#7CB0FB' : '#64748B', fontSize: '10px' }}>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
