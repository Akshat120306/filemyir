import {
  collection, doc, getDocs, setDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { Message, SenderType } from '@/types'

function fromFirestore(id: string, d: Record<string, unknown>): Message {
  return {
    id,
    text: d.text as string,
    senderId: d.senderId as string,
    senderType: d.senderType as SenderType,
    sentAt: (d.sentAt as Timestamp)?.toDate() ?? new Date(),
    readAt: (d.readAt as Timestamp)?.toDate(),
  }
}

export async function getMessages(clientId: string): Promise<Message[]> {
  const q = query(collection(db, 'clients', clientId, 'messages'), orderBy('sentAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
}

export async function sendMessage(clientId: string, text: string, senderId: string, senderType: SenderType): Promise<string> {
  const ref = doc(collection(db, 'clients', clientId, 'messages'))
  await setDoc(ref, { text, senderId, senderType, sentAt: serverTimestamp() })
  return ref.id
}

export async function markRead(clientId: string, messageId: string): Promise<void> {
  await updateDoc(doc(db, 'clients', clientId, 'messages', messageId), { readAt: serverTimestamp() })
}

export function subscribeMessages(clientId: string, cb: (msgs: Message[]) => void): () => void {
  const q = query(collection(db, 'clients', clientId, 'messages'), orderBy('sentAt', 'asc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore(d.id, d.data()))))
}
