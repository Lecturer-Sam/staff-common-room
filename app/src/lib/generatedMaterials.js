import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Generation history — what a school's teachers have produced.
 *
 * The Generate screen streams a document straight to the browser, so without
 * this nothing records that it ever happened. That matters twice over:
 *
 *   1. A headteacher cannot see what their staff produced last term, which is
 *      half the product promise ("you get proof of what's taught").
 *   2. There is no usage signal — which grades and subjects people actually
 *      generate, which is how you decide what to build next.
 *
 * Queries are equality-only and sorted client-side, matching the pattern in
 * SchoolWorkspace: no composite indexes required.
 */

/**
 * Record a successful generation.
 *
 * @param {object} args
 * @param {object} args.user       Firebase user (must not be null)
 * @param {string|null} args.schoolId   caller's school; null if they have none
 * @param {object} args.request    the request sent to the Material Service
 * @param {string} args.filename   name the service returned
 * @param {boolean} [args.isZip]   true when the download bundled many subjects
 * @returns {Promise<string|null>} new document id, or null if not signed in
 */
export async function recordGeneration({
  user,
  schoolId,
  request,
  filename,
  isZip,
}) {
  if (!user) return null

  const doc = {
    authorId: user.uid,
    authorName: user.displayName ?? null,
    // Pinned server-side by rules to the caller's own school.
    schoolId: schoolId ?? null,
    kind: request.kind,
    grade: request.grade,
    subject: request.subject ?? null, // null = every subject in the grade
    term: request.term ?? null, // null = full year
    filename,
    isZip: Boolean(isZip),
    createdAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, 'generated_materials'), doc)
  return ref.id
}

function collect(snap) {
  const list = []
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
  return list.sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
  )
}

/** What this school's members have generated, newest first. */
export async function listSchoolGenerations(schoolId, cap = 50) {
  if (!schoolId) return []
  const snap = await getDocs(
    query(
      collection(db, 'generated_materials'),
      where('schoolId', '==', schoolId),
      limit(cap),
    ),
  )
  return collect(snap)
}

/** One teacher's own history, shown on the Generate screen. */
export async function listMyGenerations(uid, cap = 10) {
  if (!uid) return []
  const snap = await getDocs(
    query(
      collection(db, 'generated_materials'),
      where('authorId', '==', uid),
      limit(cap),
    ),
  )
  return collect(snap)
}
