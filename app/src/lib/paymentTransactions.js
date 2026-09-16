import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Payment Transactions — PRD §8
 * Ghana-focused: MTN MoMo, Telecel, AT, cards via Paystack/Hubtel.
 * Manual MoMo path remains primary until 50 schools (OPPORTUNITY_MAP.md).
 */

/**
 * Create a payment transaction record (client creates pending, admin verifies).
 */
export async function createPaymentTransaction({ userId, schoolId, amount, gateway = 'manual_momo', channel = 'mtn', momoNumber, reference, note }) {
  const payload = {
    userId: userId || null,
    schoolId: schoolId || null,
    amount: Number(amount) || 0,
    currency: 'GHS',
    gateway,
    channel, // mtn | vodafone/telecel | airtel_tigo/at | card
    momoNumber: momoNumber || null,
    reference: reference || null,
    status: 'pending',
    note: note || null,
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, 'payment_transactions'), payload)
  return ref.id
}

/**
 * Fetch transactions for a user (own).
 */
export async function fetchMyTransactions(uid) {
  const snap = await getDocs(query(collection(db, 'payment_transactions'), where('userId', '==', uid), limit(50)))
  const list = []
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
  list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
  return list
}

/**
 * Fetch all transactions (admin) — for Billing page.
 */
export async function fetchAllTransactions() {
  const snap = await getDocs(query(collection(db, 'payment_transactions'), limit(200)))
  const list = []
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
  list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
  return list
}
