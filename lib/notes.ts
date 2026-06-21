import {
  collection, doc, getDocs, setDoc,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { Note } from '@/types'

function fromFirestore(id: string, d: Record<string, unknown>): Note {
  return {
    id,
    text: d.text as string,
    authorId: d.authorId as string,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
  }
}

export async function getNotes(clientId: string): Promise<Note[]> {
  const q = query(collection(db, 'clients', clientId, 'notes'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
}

export async function addNote(clientId: string, text: string, authorId: string): Promise<string> {
  const ref = doc(collection(db, 'clients', clientId, 'notes'))
  await setDoc(ref, { text, authorId, createdAt: serverTimestamp() })
  return ref.id
}
