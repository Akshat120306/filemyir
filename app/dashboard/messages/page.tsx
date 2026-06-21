'use client'
import { useEffect, useRef, useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import ClientShell from '@/components/client/ClientShell'
import { useAuth } from '@/lib/AuthContext'
import { getClientByEmail } from '@/lib/clients'
import { sendMessage, subscribeMessages } from '@/lib/messages'
import { notifyAdmin } from '@/lib/notifications'
import { emailAdminNewMessage } from '@/lib/email'
import { Message } from '@/types'
import { Send } from 'lucide-react'

function MessagesContent() {
  const { user } = useAuth()
  const [clientId, setClientId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMsg, setNewMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.email) return
    let unsub: (() => void) | undefined
    getClientByEmail(user.email).then(c => {
      if (!c) { setLoading(false); return }
      setClientId(c.id)
      unsub = subscribeMessages(c.id, msgs => {
        setMessages(msgs)
        setLoading(false)
      })
    })
    return () => unsub?.()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!clientId || !newMsg.trim() || busy) return
    setBusy(true)
    await sendMessage(clientId, newMsg, user?.uid ?? '', 'client')
    const senderName = user?.displayName ?? user?.email ?? ''
    notifyAdmin('💬 New message', `${senderName}: ${newMsg.slice(0, 80)}`, 'new_message', clientId).catch(() => {})
    emailAdminNewMessage(senderName, newMsg, clientId).catch(() => {})
    setNewMsg('')
    setBusy(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] pb-16 md:pb-0" style={{ maxHeight: '100dvh' }}>
      <div className="p-6 md:p-8 pb-0">
        <h1 className="text-2xl font-semibold mb-1">Messages</h1>
        <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>Chat with your consultant</p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 md:px-8 space-y-3 pb-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center py-16 text-sm" style={{ color: '#64748B' }}>No messages yet. Start the conversation!</p>
        ) : messages.map(m => (
          <div key={m.id} className={`flex ${m.senderType === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-xs px-4 py-3 rounded-2xl text-sm"
              style={{ background: m.senderType === 'client' ? '#3B82F6' : '#1E293B', color: '#fff', border: m.senderType === 'client' ? 'none' : '1px solid #2A3A55' }}>
              {m.text}
              <p className="text-xs mt-1 opacity-50">{m.sentAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="px-6 md:px-8 py-4 flex gap-3" style={{ borderTop: '1px solid #1F2C42', background: '#0F172A' }}>
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#1E293B', border: '1px solid #2A3A55', color: '#F1F5F9' }} />
        <button onClick={send} disabled={busy}
          className="px-4 py-2.5 rounded-xl"
          style={{ background: '#3B82F6', color: '#fff', opacity: busy ? 0.6 : 1 }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <AuthGuard>
      <ClientShell><MessagesContent /></ClientShell>
    </AuthGuard>
  )
}
