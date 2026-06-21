import {
  collection, doc, getDocs, setDoc, updateDoc, onSnapshot,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { Notification } from '@/types'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL!

function fromFirestore(id: string, d: Record<string, unknown>): Notification {
  return {
    id,
    recipientEmail: d.recipientEmail as string,
    title: d.title as string,
    body: d.body as string,
    type: d.type as Notification['type'],
    read: d.read as boolean,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
    clientId: d.clientId as string | undefined,
  }
}

export async function createNotification(data: Omit<Notification, 'id' | 'createdAt'>): Promise<void> {
  const ref = doc(collection(db, 'notifications'))
  await setDoc(ref, { ...data, createdAt: serverTimestamp() })
}

export async function notifyAdmin(title: string, body: string, type: Notification['type'], clientId?: string): Promise<void> {
  await createNotification({ recipientEmail: ADMIN_EMAIL, title, body, type, read: false, clientId })
}

export async function notifyClient(email: string, title: string, body: string, type: Notification['type'], clientId?: string): Promise<void> {
  await createNotification({ recipientEmail: email, title, body, type, read: false, clientId })
}

export async function markRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true })
}

export async function markAllRead(email: string): Promise<void> {
  const q = query(collection(db, 'notifications'), where('recipientEmail', '==', email), where('read', '==', false))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })))
}

export function subscribeNotifications(email: string, cb: (notifications: Notification[]) => void): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('recipientEmail', '==', email),
    limit(30)
  )
  return onSnapshot(q, snap => {
    const sorted = snap.docs
      .map(d => fromFirestore(d.id, d.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    cb(sorted)
  })
}
