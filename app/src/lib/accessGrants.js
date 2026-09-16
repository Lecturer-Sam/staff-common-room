import { addDoc, collection, doc, getDocs, limit, query, serverTimestamp, where, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Access Grants — PRD §8
 * Manual / institutional authorization that bypasses payment.
 * Doc id can be uid, schoolId, or auto-id with userId/schoolId field.
 *
 * type: manual | payment | institutional_license
 * planId: pro | school
 * expiresAt: Timestamp | null (null = perpetual institutional)
 */

/**
 * Check if user has active grant (client-side, for UI).
 * Rules also enforce hasAccessGrant() via exists() checks.
 */
export function isGrantActive(grant) {
  if (!grant) return false
  if (grant.expiresAt == null) return true // perpetual institutional
  const exp = grant.expiresAt?.toDate ? grant.expiresAt.toDate() : new Date(grant.expiresAt)
  return exp > new Date()
}

/**
 * Fetch grants for a user (own) — for Plans page.
 */
export async function fetchMyGrants(uid) {
  const snap = await getDocs(query(collection(db, 'access_grants'), where('userId', '==', uid), limit(20)))
  const list = []
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
  return list.filter(isGrantActive)
}

/**
 * Fetch all grants (admin).
 */
export async function fetchAllGrants() {
  const snap = await getDocs(query(collection(db, 'access_grants'), limit(200)))
  const list = []
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
  return list
}

/**
 * Admin: grant access to user or school.
 */
export async function createAccessGrant({ userId, schoolId, planId = 'pro', type = 'manual', expiresAt = null, note = '', grantedBy }) {
  const payload = {
    userId: userId || null,
    schoolId: schoolId || null,
    planId,
    type,
    expiresAt, // null = perpetual, or Timestamp
    note,
    grantedBy: grantedBy || null,
    createdAt: serverTimestamp(),
  }
  // If userId provided, use it as doc id for fast exists() check in rules
  if (userId && !schoolId) {
    // Try to set doc id = userId for rules hasAccessGrant() fast path
    try {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'access_grants', userId), payload)
      return userId
    } catch {
      // fallback to auto-id
    }
  }
  if (schoolId && !userId) {
    try {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'access_grants', schoolId), payload)
      return schoolId
    } catch {}
  }
  const ref = await addDoc(collection(db, 'access_grants'), payload)
  return ref.id
}

export async function revokeGrant(grantId) {
  await deleteDoc(doc(db, 'access_grants', grantId))
}

export async function updateGrant(grantId, fields) {
  await updateDoc(doc(db, 'access_grants', grantId), { ...fields, updatedAt: serverTimestamp() })
}
