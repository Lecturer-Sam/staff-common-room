import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

// Default share an agent keeps on a delivery when their profile has no
// explicit commissionRate set. Stored as a fraction (0.2 = 20%).
export const DEFAULT_COMMISSION_RATE = 0.2

// Material types an agent can request a delivery for. `collection` maps to the
// Firestore collection the source document lives in; `view` builds the portal
// route to the material (used so the owner can jump to it and download the
// clean file after approving). Only stored-doc types are wired for delivery.
export const MATERIAL_TYPES = {
  lesson_plan: {
    label: 'Lesson Plan',
    collection: 'lesson_plans',
    view: (id) => `/portal/plans/${id}`,
  },
  scheme: {
    label: 'Scheme of Learning',
    collection: 'weekly_forecasts',
    view: (id) => `/portal/forecasts/${id}`,
  },
  question_paper: { label: 'Question Paper', collection: 'questions' },
  quiz: { label: 'Quiz', collection: 'questions' },
  note: { label: 'Study Note', collection: 'notes' },
}

// Portal route to a delivery's source material, or null if the type has no
// viewable document.
export function materialRoute(delivery) {
  const id = delivery?.materialRef?.id
  const view = MATERIAL_TYPES[delivery?.materialType]?.view
  return id && view ? view(id) : null
}

// Delivery lifecycle. Commission is realized only at `paid`, matching the
// "commission on confirmed payment" rule.
export const DELIVERY_STATUS = {
  requested: { label: 'Requested', badge: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', badge: 'bg-sky-50 text-sky-700' },
  paid: { label: 'Paid', badge: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rejected', badge: 'bg-red-50 text-red-700' },
}

export function commissionRateFor(profile) {
  const rate = profile?.commissionRate
  return typeof rate === 'number' ? rate : DEFAULT_COMMISSION_RATE
}

/**
 * Agent action: create a pending delivery request for a material.
 * `profile` is the requesting agent's user profile (for name + rate snapshot).
 */
export function createDeliveryRequest({
  uid,
  profile,
  materialType,
  materialRef,
  materialTitle,
  schoolName,
  amount,
  note = '',
}) {
  const rate = commissionRateFor(profile)
  // Prefer the auth uid — some older profile docs have no `uid` field, and
  // Firestore rejects any write containing an `undefined` value.
  const agentId = uid ?? profile?.uid
  return addDoc(collection(db, 'deliveries'), {
    agentId,
    agentName: profile?.name ?? '',
    schoolName: schoolName ?? '',
    materialType: materialType ?? '',
    materialRef: materialRef ?? null, // { collection, id }
    materialTitle: materialTitle ?? '',
    amount: Number(amount) || 0,
    commissionRate: rate,
    commissionAmount: Math.round((Number(amount) || 0) * rate * 100) / 100,
    status: 'requested',
    note: note ?? '',
    requestedAt: serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
    paidAt: null,
  })
}

// Owner action: approve a pending request. Recomputes commission from the
// snapshotted rate in case the amount was adjusted.
export function approveDelivery(delivery, ownerUid) {
  return updateDoc(doc(db, 'deliveries', delivery.id), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: ownerUid,
    commissionAmount:
      Math.round(delivery.amount * delivery.commissionRate * 100) / 100,
  })
}

// Owner action: reject a pending request with an optional reason.
export function rejectDelivery(delivery, reason = '') {
  return updateDoc(doc(db, 'deliveries', delivery.id), {
    status: 'rejected',
    note: reason,
  })
}

// Owner action: mark an approved delivery as paid — this realizes commission.
export function markDeliveryPaid(delivery) {
  return updateDoc(doc(db, 'deliveries', delivery.id), {
    status: 'paid',
    paidAt: serverTimestamp(),
  })
}

// Agent action: cancel their own still-pending request.
export function cancelDeliveryRequest(delivery) {
  return deleteDoc(doc(db, 'deliveries', delivery.id))
}
