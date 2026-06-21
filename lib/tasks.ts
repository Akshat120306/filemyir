import {
  collection, doc, getDocs, setDoc, updateDoc,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { Task, Priority } from '@/types'

function fromFirestore(id: string, d: Record<string, unknown>): Task {
  return {
    id,
    title: d.title as string,
    dueDate: (d.dueDate as Timestamp)?.toDate(),
    priority: d.priority as Priority,
    completed: d.completed as boolean,
    assignedTo: d.assignedTo as string | undefined,
    createdAt: (d.createdAt as Timestamp)?.toDate() ?? new Date(),
  }
}

export async function getTasks(clientId: string): Promise<Task[]> {
  const q = query(collection(db, 'clients', clientId, 'tasks'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
}

export async function addTask(clientId: string, data: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(collection(db, 'clients', clientId, 'tasks'))
  await setDoc(ref, { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function toggleTask(clientId: string, taskId: string, completed: boolean): Promise<void> {
  await updateDoc(doc(db, 'clients', clientId, 'tasks', taskId), { completed })
}
