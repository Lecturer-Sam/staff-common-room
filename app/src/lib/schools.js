import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { genCode } from './classrooms'

/**
 * Schools (Phase 2 multi-tenancy — see docs/saas-gap-analysis.md).
 *
 * A school is a tenant: `schools/{schoolId}` holds its identity, and
 * membership lives on `users/{uid}.schoolId`. School-scoped content
 * (schemes, lesson plans with visibility 'school'; notes with status
 * 'school') carries the author's `schoolId` at write time so list queries
 * and Firestore rules can match it without an extra user lookup.
 *
 * Roles:
 *   - platform `admin` creates schools and can manage any of them
 *   - `school_admin` manages membership of their own school only
 *     (rules restrict them to setting/clearing schoolId)
 */

/** Create a school (platform admins only — enforced in rules). */
export function createSchool({ name, location }, user) {
  return addDoc(collection(db, 'schools'), {
    name: name.trim(),
    location: (location ?? '').trim(),
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  })
}

/**
 * Assign a member to a school, or pass null to remove them. Rules decide
 * who is allowed: platform admins anyone; school admins only their own
 * school's members / unassigned members.
 */
export function assignSchool(uid, schoolId) {
  return updateDoc(doc(db, 'users', uid), { schoolId: schoolId ?? null })
}

/** Set a member's role (platform admins only). */
export function setUserRole(uid, role) {
  return updateDoc(doc(db, 'users', uid), { role })
}

/* ── Join codes (Phase 2.5) ──────────────────────────────────────────── */

/**
 * Create (or rotate) the school's join code. Codes map to the school via
 * `school_codes/{code}` so a member can join self-service by entering it.
 * The code is also mirrored on the school doc for display to managers.
 */
export async function generateJoinCode(school) {
  if (school.joinCode) {
    await deleteDoc(doc(db, 'school_codes', school.joinCode)).catch(() => null)
  }
  const code = genCode(8)
  await setDoc(doc(db, 'school_codes', code), {
    schoolId: school.id,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'schools', school.id), { joinCode: code })
  return code
}

/**
 * Self-service join: validate the code, set the member's schoolId. The code
 * is embedded in the write so the rules can verify it (see firestore.rules),
 * then stripped again immediately afterwards.
 */
export async function joinSchoolWithCode(user, rawCode) {
  const code = (rawCode ?? '').trim().toUpperCase()
  if (!code) throw new Error('Enter the join code your school gave you.')
  const snap = await getDoc(doc(db, 'school_codes', code))
  if (!snap.exists()) throw new Error('That join code is not recognised — check it with your school.')
  const schoolId = snap.data().schoolId
  const me = doc(db, 'users', user.uid)
  await updateDoc(me, { schoolId, joinCode: code })
  await updateDoc(me, { joinCode: deleteField() }).catch(() => null)
  return schoolId
}
