import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, orderBy, where, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { Client, PipelineStatus, PaymentStatus } from '@/types'

function fromFirestore(id: string, d: Record<string, unknown>): Client {
  return {
    id,
    name: d.name as string,
    phone: d.phone as string,
    email: d.email as string,
    pan: d.pan as string | undefined,
    aadhaar: d.aadhaar as string | undefined,
    itrType: d.itrType as string | undefined,
    category: d.category as string | undefined,
    status: d.status as PipelineStatus,
    assignedTo: d.assignedTo as string,
    leadId: d.leadId as string | undefined,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
    lastActivityAt: (d.lastActivityAt as Timestamp)?.toDate() ?? new Date(),
    feeAmount: d.feeAmount as number | undefined,
    feeStatus: d.feeStatus as PaymentStatus | undefined,
    requiredDocs: (d.requiredDocs as string[] | undefined) ?? undefined,
  }
}

export async function getAllClients(): Promise<Client[]> {
  const q = query(collection(db, 'clients'), orderBy('lastActivityAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
}

export async function getClient(clientId: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, 'clients', clientId))
  if (!snap.exists()) return null
  return fromFirestore(snap.id, snap.data())
}

export async function getClientByEmail(email: string): Promise<Client | null> {
  const q = query(collection(db, 'clients'), where('email', '==', email), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return fromFirestore(snap.docs[0].id, snap.docs[0].data())
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt' | 'lastActivityAt'>): Promise<string> {
  const ref = doc(collection(db, 'clients'))
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), lastActivityAt: serverTimestamp() })
  return ref.id
}

export async function updateClient(clientId: string, data: Partial<Omit<Client, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'clients', clientId), { ...data, lastActivityAt: serverTimestamp() })
}

export async function updateClientStatus(clientId: string, status: PipelineStatus, changedBy: string): Promise<void> {
  const client = await getClient(clientId)
  if (!client) return
  await updateDoc(doc(db, 'clients', clientId), { status, lastActivityAt: serverTimestamp() })
  const histRef = doc(collection(db, 'clients', clientId, 'statusHistory'))
  await setDoc(histRef, {
    fromStatus: client.status,
    toStatus: status,
    changedAt: serverTimestamp(),
    changedBy,
  })
}
