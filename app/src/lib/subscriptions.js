import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * SaaS subscription layer — PRD Phase 3
 * Model: one doc per member at `subscriptions/{uid}`.
 *   planId   'free' | 'pro' | 'school' | 'institutional'
 *   status   'none' | 'requested' | 'active' | 'cancelled' | 'rejected' | 'expired'
 *   exports  { month: 'YYYY-MM', count }
 *
 * Payments: Ghana-focused — MTN MoMo, Telecel, AT, cards via Paystack/Hubtel.
 * Manual MoMo path remains primary until 50 schools (OPPORTUNITY_MAP.md).
 * Access grants (access_grants/{uid|schoolId}) provide manual/institutional bypass.
 */

export const FREE_EXPORT_LIMIT = 5

// Ghana MoMo details — PRD §8: prioritize local channels (cards + MoMo), keep manual path
export const PAYMENT_INSTRUCTIONS = {
  method: 'Mobile Money (MTN / Telecel / AT) or Card via Paystack',
  momoNumber: '054 042 3359', // Beacon merchant — TODO: replace with real merchant number
  momoNumbers: {
    mtn: '054 042 3359',
    telecel: '020 000 0000', // placeholder — update with real
    at: '027 000 0000', // placeholder
  },
  accountName: 'Beacon Educational Consult',
  paystackLink: null, // TODO: add Paystack payment link when gateway webhook ships (Phase 5)
  note: 'Pay via MoMo to the number above, or card via Paystack when link is available. After paying, enter the MoMo number you paid from and the transaction reference below. Your plan activates once confirmed (usually within hours). For institutional offline payments, contact admin for manual authorization.',
  institutionalNote: 'Schools paying offline (bank transfer, cheque) get perpetual institutional license via access_grants — no expiry until revoked.',
}

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: '₵0',
    period: 'forever',
    tagline: 'Browse curriculum and start planning',
    features: [
      'Full NaCCA curriculum (KG–B9) — 4,040 indicators',
      'Schemes of learning & lesson plans',
      `${FREE_EXPORT_LIMIT} document downloads / month`,
      'Question bank: browse + 5 contributions/week',
      'Teacher feed, articles & study notes',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro Teacher',
    price: '₵29',
    period: 'per month',
    tagline: 'Unlimited planning and assessment tools',
    popular: true,
    features: [
      'Everything in Free',
      'Unlimited PDF / Word downloads',
      'Unlimited exam papers (NaCCA-aligned, content-standard filter)',
      'Question bank: unlimited generation, difficulty balancing, answer key',
      'Quiz Maker PPTX + classroom assignments',
      'Generated test history & audit trail',
      'Priority support via WhatsApp',
    ],
  },
  school: {
    id: 'school',
    name: 'School Standard',
    price: '₵4,500',
    period: 'per year',
    tagline: 'Workspace for whole school — the real business (OPPORTUNITY_MAP.md)',
    features: [
      'Everything in Pro',
      'Up to 30 teacher seats',
      'School-wide scheme library + coverage analytics',
      'School-shared question bank (private + shared)',
      'Multi-campus support (Chain from GHS 12,000/yr)',
      'School name locked on generated papers',
    ],
  },
  institutional: {
    id: 'institutional',
    name: 'Institutional',
    price: 'Custom',
    period: 'perpetual',
    tagline: 'Offline payment, manual authorization',
    features: [
      'Perpetual license until revoked',
      'Bank transfer / cheque / MoMo offline',
      'Manual grant via access_grants',
      'Same features as School Standard',
      'Dedicated onboarding',
    ],
  },
}

/** 'YYYY-MM' key for current calendar month (local time). */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** The plan a subscription doc currently grants. No/invalid doc → 'free'. */
export function planIdFor(sub) {
  if (sub?.status === 'active' && PLANS[sub.planId]) return sub.planId
  return 'free'
}

/** True when the doc grants an active paid plan (Pro, School, Institutional). */
export function isPaidSub(sub) {
  return planIdFor(sub) !== 'free'
}

/** Check if subscription is expired (renewsAt in past). */
export function isExpired(sub) {
  if (!sub?.renewsAt?.toDate) return false
  return sub.renewsAt.toDate() < new Date()
}

/**
 * Ask the member's subscription doc to upgrade to a paid plan. Creates the
 * doc on first request; `profile` supplies denormalised name/email so the
 * admin billing queue is readable without extra joins.
 */
export async function requestUpgrade(user, profile, planId, { momoNumber, paymentRef, channel = 'mtn', amount = 29 }) {
  const ref = doc(db, 'subscriptions', user.uid)
  const fields = {
    planId,
    status: 'requested',
    requestedAt: serverTimestamp(),
    momoNumber,
    paymentRef,
    channel,
    amount,
    name: profile?.name ?? user.displayName ?? '',
    email: user.email ?? '',
    schoolId: profile?.schoolId || null,
  }
  const existing = await getDoc(ref).catch(() => null)
  if (!existing?.exists()) {
    await setDoc(ref, { ...fields, exports: { month: monthKey(), count: 0 } })
  } else {
    await updateDoc(ref, fields)
  }

  // Also create a payment_transactions record for audit trail (PRD §8)
  try {
    const { createPaymentTransaction } = await import('./paymentTransactions')
    await createPaymentTransaction({
      userId: user.uid,
      schoolId: profile?.schoolId || null,
      amount,
      gateway: 'manual_momo',
      channel,
      momoNumber,
      reference: paymentRef,
      note: `Upgrade request to ${planId}`,
    })
  } catch (e) {
    console.warn('Failed to create payment transaction audit:', e)
  }
}

/** Member self-service: cancel an active or pending subscription. */
export function cancelSubscription(uid) {
  return updateDoc(doc(db, 'subscriptions', uid), { status: 'cancelled' })
}

/**
 * Count one export against the member's monthly quota. Paid plans are not
 * metered. Never throws — returns { ok, reason } so callers can toast.
 * Access grants bypass metering — handled in SubscriptionContext isPro check.
 */
export async function recordExport(user, sub, hasGrant = false) {
  if (!user) return { ok: false, reason: 'signed-out' }
  if (isPaidSub(sub) || hasGrant) return { ok: true, metered: false }

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
