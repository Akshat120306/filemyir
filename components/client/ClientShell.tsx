'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderOpen, CreditCard, FileText, MessageSquare, LogOut, Bell, X } from 'lucide-react'
import { APP_VERSION } from '@/lib/version'
import Logo from '@/components/ui/Logo'
import { signOut } from '@/lib/auth'
import { useAuth } from '@/lib/AuthContext'
import { subscribeNotifications, markAllRead } from '@/lib/notifications'
import { Notification } from '@/types'

const nav = [
  { href: '/dashboard',           label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/documents', label: 'Documents',    icon: FolderOpen },
  { href: '/dashboard/payments',  label: 'Payments',     icon: CreditCard },
  { href: '/dashboard/returns',   label: 'Past Returns', icon: FileText },
  { href: '/dashboard/messages',  label: 'Messages',     icon: MessageSquare },
]

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user } = useAuth()
  const initials = user?.displayName?.slice(0,2).toUpperCase() ?? user?.email?.slice(0,2).toUpperCase() ?? 'CL'

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifs, setShowNotifs]       = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const unread   = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!user?.email) return
    const unsub = subscribeNotifications(user.email, setNotifications)
    return unsub
  }, [user?.email])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="flex min-h-screen" style={{ background: '#0F172A' }}>
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col" style={{ background: '#141E33', borderRight: '1px solid #1F2C42' }}>
        <div className="flex items-center gap-2.5 px-5 py-6">
          <Logo size={30} />
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            const unreadMsgs = label === 'Messages'
              ? notifications.filter(n => !n.read && n.type === 'new_message').length
              : 0
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ color: active ? '#7CB0FB' : '#94A3B8', background: active ? 'rgba(59,130,246,0.14)' : 'transparent' }}>
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {unreadMsgs > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: '#EF4444', fontSize: '10px' }}>
                    {unreadMsgs > 9 ? '9+' : unreadMsgs}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto" style={{ borderTop: '1px solid #1F2C42' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'rgba(139,92,246,0.2)', color: '#B6A0FA' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#F1F5F9' }}>{user?.displayName ?? 'My Account'}</p>
              <p className="text-xs truncate" style={{ color: '#64748B' }}>{user?.email}</p>
            </div>
            {/* Notifications bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0 && user?.email) markAllRead(user.email) }}
                className="relative p-1.5" style={{ color: '#64748B' }}>
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center font-bold"
                    style={{ background: '#EF4444', fontSize: '9px' }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute bottom-8 right-0 w-72 rounded-xl shadow-xl overflow-hidden z-50"
                  style={{ background: '#1E293B', border: '1px solid #2A3A55' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2A3A55' }}>
                    <p className="text-xs font-semibold">Notifications</p>
                    <button onClick={() => setShowNotifs(false)}><X size={13} style={{ color: '#64748B' }} /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs" style={{ color: '#64748B' }}>No notifications</p>
                    ) : notifications.slice(0, 10).map(n => (
                      <div key={n.id} className="px-4 py-3"
                        style={{ background: n.read ? 'transparent' : 'rgba(59,130,246,0.06)', borderBottom: '1px solid #1F2C42' }}>
                        <p className="text-xs font-medium">{n.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{n.body}</p>
                        <p className="text-xs mt-1" style={{ color: '#475569' }}>
                          {n.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={async () => { await signOut(); router.replace('/login') }} style={{ color: '#64748B' }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <header className="md:hidden h-14 flex items-center justify-between px-4 sticky top-0 z-40"
          style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1F2C42' }}>
          <Logo size={26} />
          <div className="flex items-center gap-2">
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0 && user?.email) markAllRead(user.email) }}
                className="relative p-2" style={{ color: '#94A3B8' }}>
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                    style={{ background: '#EF4444', fontSize: '9px' }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 mt-2 rounded-xl shadow-xl overflow-hidden z-50"
                  style={{ background: '#1E293B', border: '1px solid #2A3A55', width: 'min(300px, calc(100vw - 32px))' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2A3A55' }}>
                    <p className="text-xs font-semibold">Notifications</p>
                    <button onClick={() => setShowNotifs(false)}><X size={13} style={{ color: '#64748B' }} /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs" style={{ color: '#64748B' }}>No notifications</p>
                    ) : notifications.slice(0, 10).map(n => (
                      <div key={n.id} className="px-4 py-3"
                        style={{ background: n.read ? 'transparent' : 'rgba(59,130,246,0.06)', borderBottom: '1px solid #1F2C42' }}>
                        <p className="text-xs font-medium">{n.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'rgba(139,92,246,0.2)', color: '#B6A0FA' }}>
              {initials}
            </div>
            <button onClick={async () => { await signOut(); router.replace('/login') }} className="p-2" style={{ color: '#64748B' }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-around py-2 pb-safe" style={{ background: '#141E33', borderTop: '1px solid #1F2C42' }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          const unreadMsgs = label === 'Messages'
            ? notifications.filter(n => !n.read && n.type === 'new_message').length
            : 0
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 px-3 py-1 relative">
              <div className="relative">
                <Icon size={20} style={{ color: active ? '#7CB0FB' : '#64748B' }} />
                {unreadMsgs > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: '#EF4444', fontSize: '9px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>
                )}
              </div>
              <span className="text-xs" style={{ color: active ? '#7CB0FB' : '#64748B' }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
