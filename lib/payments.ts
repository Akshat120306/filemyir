import {
  collection, doc, getDocs, setDoc, updateDoc,
  query, orderBy, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { Payment, PaymentStatus } from '@/types'

function fromFirestore(id: string, d: Record<string, unknown>): Payment {
  return {
    id,
    description:     d.description as string,
    amount:          d.amount as number,
    method:          d.method as string | undefined,
    status:          d.status as PaymentStatus,
    date:            (d.date as Timestamp)?.toDate() ?? new Date(),
    invoiceUrl:      d.invoiceUrl as string | undefined,
    utr:             d.utr as string | undefined,
    paymentMode:     d.paymentMode as Payment['paymentMode'],
    submittedBy:     d.submittedBy as Payment['submittedBy'],
    rejectionReason: d.rejectionReason as string | undefined,
  }
}

export async function getPayments(clientId: string): Promise<Payment[]> {
  const q = query(collection(db, 'clients', clientId, 'payments'), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => fromFirestore(d.id, d.data()))
}

export function subscribePayments(clientId: string, cb: (payments: Payment[]) => void): () => void {
  const q = query(collection(db, 'clients', clientId, 'payments'), orderBy('date', 'desc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => fromFirestore(d.id, d.data()))))
}

export async function addPayment(clientId: string, data: Omit<Payment, 'id'>): Promise<string> {
  const ref = doc(collection(db, 'clients', clientId, 'payments'))
  await setDoc(ref, { ...data, date: serverTimestamp() })
  return ref.id
}

export async function submitUtrPayment(
  clientId: string,
  data: { amount: number; utr: string; paymentMode: Payment['paymentMode']; description: string }
): Promise<string> {
  const ref = doc(collection(db, 'clients', clientId, 'payments'))
  await setDoc(ref, {
    description:  data.description,
    amount:       data.amount,
    status:       'pending_verification',
    utr:          data.utr,
    paymentMode:  data.paymentMode,
    submittedBy:  'client',
    date:         serverTimestamp(),
  })
  return ref.id
}

export async function approvePayment(clientId: string, paymentId: string): Promise<void> {
  await updateDoc(doc(db, 'clients', clientId, 'payments', paymentId), {
    status: 'paid',
    rejectionReason: null,
  })

  // Auto-sync client feeStatus if fully paid
  try {
    const { getClient, updateClient } = await import('./clients')
    const client = await getClient(clientId)
    if (!client?.feeAmount) return
    const allPayments = await getPayments(clientId)
    const totalPaid = allPayments
      .filter(p => p.status === 'paid')
      .reduce((s, p) => s + p.amount, 0)
    if (totalPaid >= client.feeAmount) {
      await updateClient(clientId, { feeStatus: 'paid' })
    }
  } catch { /* non-critical, don't block approval */ }
}

export async function rejectPayment(clientId: string, paymentId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'clients', clientId, 'payments', paymentId), {
    status:          'unpaid',
    rejectionReason: reason,
  })
}
