import {
  collection, doc, getDocs, setDoc,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { Return } from '@/types'

function fromFirestore(id: string, d: Record<string, unknown>): Return {
  return {
    id,
    year: d.year as number,
    itrType: d.itrType as string,
    filedAt: (d.filedAt as Timestamp)?.toDate() ?? new Date(),
    acknowledgementUrl: d.acknowledgementUrl as string | undefined,
    itrCopyUrl: d.itrCopyUrl as string | undefined,
    acknowledgementNumber: d.acknowledgementNumber as string | undefined,
  }
}

export async function getReturns(clientId: string): Promise<Return[]> {
  const q = query(collection(db, 'clients', clientId, 'returns'), orderBy('year', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
}

export async function addReturn(clientId: string, data: Omit<Return, 'id'>): Promise<string> {
  const ref = doc(collection(db, 'clients', clientId, 'returns'))
  await setDoc(ref, { ...data, filedAt: serverTimestamp() })
  return ref.id
}
