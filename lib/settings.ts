import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { PaymentSettings } from '@/types'

export async function getPaymentSettings(): Promise<PaymentSettings | null> {
  const snap = await getDoc(doc(db, 'settings', 'payment'))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    upiId:         d.upiId ?? '',
    upiName:       d.upiName ?? '',
    bankName:      d.bankName ?? '',
    accountHolder: d.accountHolder ?? '',
    accountNumber: d.accountNumber ?? '',
    ifsc:          d.ifsc ?? '',
  }
}

export async function savePaymentSettings(data: PaymentSettings): Promise<void> {
  await setDoc(doc(db, 'settings', 'payment'), { ...data, updatedAt: serverTimestamp() })
}
