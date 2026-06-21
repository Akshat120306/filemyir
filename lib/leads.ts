import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, orderBy, where, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { Lead, LeadStatus, IncomeType } from '@/types'

function fromFirestore(id: string, d: Record<string, unknown>): Lead {
  return {
    id,
    name: d.name as string,
    phone: d.phone as string,
    email: d.email as string,
    pan: d.pan as string | undefined,
    incomeTypes: (d.incomeTypes as IncomeType[]) ?? [],
    recommendedItr: d.recommendedItr as string,
    requiredDocs: (d.requiredDocs as string[]) ?? [],
    complexity: d.complexity as Lead['complexity'],
    status: d.status as LeadStatus,
    source: (d.source as Lead['source']) ?? 'assessment',
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
    contactedAt: (d.contactedAt as Timestamp)?.toDate(),
    convertedAt: (d.convertedAt as Timestamp)?.toDate(),
    convertedToClientId: d.convertedToClientId as string | undefined,
  }
}

export async function createLead(data: Omit<Lead, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(collection(db, 'leads'))
  await setDoc(ref, { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function getAllLeads(): Promise<Lead[]> {
  const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
}

export async function getNewLeads(): Promise<Lead[]> {
  const q = query(collection(db, 'leads'), where('status', '==', 'new'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getLead(leadId: string): Promise<Lead | null> {
  const snap = await getDoc(doc(db, 'leads', leadId))
  if (!snap.exists()) return null
  return fromFirestore(snap.id, snap.data())
}

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
  await updateDoc(doc(db, 'leads', leadId), { status })
}

export async function markLeadContacted(leadId: string): Promise<void> {
  await updateDoc(doc(db, 'leads', leadId), { status: 'contacted', contactedAt: serverTimestamp() })
}

export async function getLeadByEmail(email: string): Promise<Lead | null> {
  const q = query(collection(db, 'leads'), where('email', '==', email))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const leads = snap.docs.map(d => fromFirestore(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return leads[0]
}

export async function convertLeadToClient(leadId: string, clientId: string): Promise<void> {
  await updateDoc(doc(db, 'leads', leadId), {
    status: 'converted',
    convertedAt: serverTimestamp(),
    convertedToClientId: clientId,
  })
}
