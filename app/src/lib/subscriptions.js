import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * SaaS subscription layer (Phase 1 — see docs/saas-gap-analysis.md).
 *
 * Model: one doc per member at `subscriptions/{uid}`.
 *   planId   'free' | 'pro' | 'school'
 *   status   'none' | 'requested' | 'active' | 'cancelled' | 'rejected'
 *   exports  { month: 'YYYY-MM', count }  — free-tier export meter
 *
 * Payments are collected out-of-band via Mobile Money; the member submits
 * their MoMo number + transaction reference and an admin activates the
 * subscription from /portal/billing (same manual "mark as paid" pattern
 * proven by the Deliveries module — see docs/deliveries-roadmap.md).
 */

export const FREE_EXPORT_LIMIT = 5

// MoMo details shown on the upgrade form. Edit here when the merchant
// number changes (a Cloud Function + gateway webhook replaces this manual
// loop in a later phase).
export const PAYMENT_INSTRUCTIONS = {
  method: 'Mobile Money (MTN / Telecel / AT)',
  momoNumber: '054 042 3359', // TODO: replace with the Beacon merchant number
  accountName: 'Beacon Educational Consult',
  note: 'After paying, enter the MoMo number you paid from and the transaction reference below. Your plan is activated once the payment is confirmed.',
}

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: '₵0',
    period: 'forever',
    tagline: 'Browse the curriculum and start planning',
    features: [
      'Full NaCCA curriculum (KG–B9)',
      'Schemes of learning & lesson plans',
      `${FREE_EXPORT_LIMIT} document downloads / month`,
      'Question bank contributions',
      'Teacher feed, articles & study notes',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Teacher',
    price: '₵29',
    period: 'per month',
    tagline: 'Unlimited planning and assessment tools',
    features: [
      'Everything in Free',
      'Unlimited PDF / Word downloads',
      'Unlimited exam papers & quizzes',
      'Quiz Maker PowerPoint exports',
      'Priority support',
    ],
  },
  school: {
    id: 'school',
    name: 'School',
    price: '₵99',
    period: 'per month',
    comingSoon: true,
    tagline: 'A workspace for your whole school (coming soon)',
    features: [
      'Everything in Pro',
      'Up to 10 teacher seats',
      'School-wide scheme library',
      'Coverage analytics dashboard',
    ],
  },
}

/** 'YYYY-MM' key for the current calendar month (local time). */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** The plan a subscription doc currently grants. No/invalid doc → 'free'. */
export function planIdFor(sub) {
  if (sub?.status === 'active' && PLANS[sub.planId]) return sub.planId
  return 'free'
}

/** True when the doc grants an active paid plan (Pro or School). */
export function isPaidSub(sub) {
  return planIdFor(sub) !== 'free'
}

/**
 * Ask the member's subscription doc to upgrade to a paid plan. Creates the
 * doc on first request; `profile` supplies denormalised name/email so the
 * admin billing queue is readable without extra joins.
 */
export async function requestUpgrade(user, profile, planId, { momoNumber, paymentRef }) {
  const ref = doc(db, 'subscriptions', user.uid)
  const fields = {
    planId,
    status: 'requested',
    requestedAt: serverTimestamp(),
    momoNumber,
    paymentRef,
    name: profile?.name ?? user.displayName ?? '',
    email: user.email ?? '',
  }
  // First interaction with the ledger: create it (rules require exports).
  const existing = await getDoc(ref).catch(() => null)
  if (!existing?.exists()) {
    await setDoc(ref, { ...fields, exports: { month: monthKey(), count: 0 } })
  } else {
    await updateDoc(ref, fields)
  }
}

/** Member self-service: cancel an active or pending subscription. */
export function cancelSubscription(uid) {
  return updateDoc(doc(db, 'subscriptions', uid), { status: 'cancelled' })
}

/**
 * Count one export against the member's monthly quota. Paid plans are not
 * metered. Never throws — returns { ok, reason } so callers can toast.
 */
export async function recordExport(user, sub) {
  if (!user) return { ok: false, reason: 'signed-out' }
  if (isPaidSub(sub)) return { ok: true, metered: false }

  const mk = monthKey()
  const ref = doc(db, 'subscriptions', user.uid)
  try {
    if (!sub) {
      await setDoc(ref, {
        planId: 'free',
        status: 'none',
        exports: { month: mk, count: 1 },
      })
    } else {
      const cur = sub.exports ?? { month: null, count: 0 }
      const count = cur.month === mk ? cur.count + 1 : 1
      await updateDoc(ref, { exports: { month: mk, count } })
    }
    return { ok: true, metered: true }
  } catch (err) {
    return { ok: false, reason: 'denied', error: err }
  }
}

/** Exports used this month for a (possibly absent) subscription doc. */
export function exportsUsedThisMonth(sub) {
  if (sub?.exports?.month === monthKey()) return sub.exports.count
  return 0
}
