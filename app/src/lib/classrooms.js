import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, getSecondaryAuth } from '../firebase'

/**
 * Classrooms & students (Phase 3 — see docs/saas-gap-analysis.md).
 *
 * Students usually have no email, so accounts are provisioned by the
 * teacher: each student gets a synthetic Firebase Auth login built from
 * the classroom's join code and a per-student access code. The student
 * logs in on /login ("student" mode) with those two codes — no email
 * address needed on their side.
 */

// Unambiguous alphabet (no 0/O/1/I) — codes are read aloud in class.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function genCode(length = 6) {
  let out = ''
  const rnd = new Uint32Array(length)
  crypto.getRandomValues(rnd)
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[rnd[i] % CODE_ALPHABET.length]
  return out
}

/** Synthetic login email for a student account. */
export function studentEmail(joinCode, accessCode) {
  return `${joinCode.toLowerCase()}-${accessCode.toLowerCase()}@students.beacon-consult.app`
}

/**
 * Create a classroom owned by the current teacher.
 * Returns the created doc (`{ id, joinCode, ... }`).
 */
export async function createClassroom({ name, subjectId, grade }, teacherProfile, user) {
  const joinCode = genCode(6)
  const ref = await addDoc(collection(db, 'classrooms'), {
    name: name.trim(),
    subjectId: subjectId || null,
    grade,
    teacherId: user.uid,
    teacherName: teacherProfile?.name || user.displayName || 'Teacher',
    schoolId: teacherProfile?.schoolId ?? null,
    joinCode,
    archived: false,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, joinCode }
}

/**
 * Provision one student: auth account (on the secondary app) + profile doc.
 * Returns { uid, name, accessCode } — the teacher must hand the codes to
 * the pupil (they are stored on the student's users doc for recovery).
 */
export async function createStudent(classroom, name, teacherProfile) {
  const secondary = getSecondaryAuth()
  let lastErr = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const accessCode = genCode(6)
    const email = studentEmail(classroom.joinCode, accessCode)
    try {
      const cred = await createUserWithEmailAndPassword(secondary, email, accessCode)
      // Keep the teacher's session: the secondary app must not stay signed in.
      await signOut(secondary)
      return await finishStudentProfile(cred.user.uid, {
        name,
        accessCode,
        classroom,
        teacherProfile,
      })
    } catch (err) {
      lastErr = err
      if (err?.code !== 'auth/email-already-in-use') throw err
      // code collision — regenerate
    }
  }
  throw lastErr ?? new Error('Could not create student account')
}

/** Write the student's users doc (allowed for approved members — see rules). */
async function finishStudentProfile(uid, { name, accessCode, classroom, teacherProfile }) {
  await setDoc(doc(db, 'users', uid), {
    name: name.trim(),
    email: studentEmail(classroom.joinCode, accessCode),
    role: 'student',
    status: 'approved',
    classroomId: classroom.id,
    schoolId: teacherProfile?.schoolId ?? null,
    accessCode,
    createdAt: serverTimestamp(),
  })
  return { uid, name: name.trim(), accessCode }
}

/**
 * Save a QuizMaker-built quiz to a classroom so students can take it
 * in-app. The questions are snapshotted from the bank at assign time.
 */
export function assignQuiz({ title, subjectId, grade, classroomId, questions }, user) {
  return addDoc(collection(db, 'quizzes'), {
    title: title.trim(),
    subjectId: subjectId || null,
    grade,
    classroomId,
    authorId: user.uid,
    authorName: user.displayName || 'Teacher',
    questions,
    createdAt: serverTimestamp(),
  })
}
