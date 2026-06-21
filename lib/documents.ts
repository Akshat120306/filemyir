import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { ClientDocument, DocumentType, ReviewStatus, SenderType } from '@/types'

function fromFirestore(id: string, d: Record<string, unknown>): ClientDocument {
  return {
    id,
    name: d.name as string,
    type: d.type as DocumentType,
    storagePath: (d.storagePath as string) ?? '',
    externalUrl: d.externalUrl as string | undefined,
    year: d.year as number | undefined,
    uploadedAt: (d.uploadedAt as Timestamp)?.toDate() ?? new Date(),
    uploadedBy: d.uploadedBy as SenderType,
    reviewStatus: d.reviewStatus as ReviewStatus,
    reviewNote: d.reviewNote as string | undefined,
  }
}

export async function getDocuments(clientId: string): Promise<ClientDocument[]> {
  const q = query(collection(db, 'clients', clientId, 'documents'), orderBy('uploadedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
}

export async function addDocument(clientId: string, data: Omit<ClientDocument, 'id' | 'uploadedAt'>): Promise<string> {
  const ref = doc(collection(db, 'clients', clientId, 'documents'))
  await setDoc(ref, { ...data, uploadedAt: serverTimestamp() })
  return ref.id
}

export async function deleteDocument(clientId: string, documentId: string): Promise<void> {
  await deleteDoc(doc(db, 'clients', clientId, 'documents', documentId))
}

export async function reviewDocument(clientId: string, documentId: string, reviewStatus: ReviewStatus, reviewNote?: string): Promise<void> {
  await updateDoc(doc(db, 'clients', clientId, 'documents', documentId), { reviewStatus, reviewNote: reviewNote ?? '' })
}

export function subscribeDocuments(clientId: string, cb: (docs: ClientDocument[]) => void): () => void {
  const q = query(collection(db, 'clients', clientId, 'documents'), orderBy('uploadedAt', 'desc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore(d.id, d.data()))))
}
