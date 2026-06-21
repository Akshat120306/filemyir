'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, GitBranch, Bell, Search, LogOut, Inbox, X, FileText, MessageSquare, User, Settings, UserPlus, CreditCard } from 'lucide-react'
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
  const [search, setSearch]               = useState('')
  const notifRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!ADMIN_EMAIL) return
    const unsub = subscribeNotifications(ADMIN_EMAIL, setNotifications)
    return unsub
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/admin/clients?q=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0F172A' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#141E33', borderRight: '1px solid #1F2C42' }}>
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>T</div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#F1F5F9' }}>TaxOS</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
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

        <div className="p-4 mt-auto space-y-2" style={{ borderTop: '1px solid #1F2C42' }}>
          <Link href="/admin/clients/new"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#3B82F6', color: '#fff' }}>
            <UserPlus size={15} /> Add Client
          </Link>
          <button
            onClick={async () => { await signOut(); router.replace('/admin/login') }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium"
            style={{ color: '#64748B' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-7 sticky top-0 z-40"
          style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1F2C42' }}>
          <div>
            {title && <h1 className="text-lg font-semibold" style={{ color: '#F1F5F9' }}>{title}</h1>}
            {subtitle && <p className="text-xs" style={{ color: '#64748B' }}>{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#1E293B', border: '1px solid #1F2C42', width: 240 }}>
              <Search size={14} style={{ color: '#64748B', flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search clients… (Enter)"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: '#F1F5F9' }}
              />
              {search && (
                <button onClick={() => setSearch('')}><X size={12} style={{ color: '#64748B' }} /></button>
              )}
            </div>

            {/* Notifications bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) markAllRead(ADMIN_EMAIL) }}
                className="relative p-2 rounded-lg" style={{ color: '#94A3B8', background: showNotifs ? '#1E293B' : 'transparent' }}>
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center text-xs font-bold"
                    style={{ background: '#EF4444', fontSize: '10px' }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl overflow-hidden z-50"
                  style={{ background: '#1E293B', border: '1px solid #2A3A55' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2A3A55' }}>
                    <p className="text-sm font-semibold">Notifications</p>
                    <button onClick={() => setShowNotifs(false)}><X size={14} style={{ color: '#64748B' }} /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center py-8 text-sm" style={{ color: '#64748B' }}>No notifications</p>
                    ) : notifications.slice(0, 15).map(n => {
                      const Icon = notifIcon[n.type] ?? Bell
                      return (
                        <div key={n.id}
                          className="flex gap-3 px-4 py-3 cursor-pointer"
                          style={{ background: n.read ? 'transparent' : 'rgba(59,130,246,0.06)', borderBottom: '1px solid #1F2C42' }}
                          onClick={() => { if (n.clientId) router.push(`/admin/clients/${n.clientId}`); setShowNotifs(false) }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: 'rgba(59,130,246,0.12)' }}>
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

        <main className="flex-1 p-7 pb-16 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
