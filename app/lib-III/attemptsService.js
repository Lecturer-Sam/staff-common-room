// Stage 4: attempts live in Firestore — users/{uid}/attempts/{attemptId}
// Offline writes are queued by Firestore's local cache (see lib/firebase.js).
import { useEffect, useState } from 'react'
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db as fdb } from '../lib/firebase'

// addDoc resolves when the write is QUEUED locally — not when synced.
// Offline is fine: it still resolves, the sync happens later.
export async function saveAttempt(uid, attempt) {
  const ref = await addDoc(collection(fdb, 'users', uid, 'attempts'), {
    standardId: attempt.standardId,
    subjectId: attempt.subjectId,
    classId: attempt.classId,
    score: attempt.score,
    total: attempt.total,
    timeSeconds: attempt.timeSeconds,
    answers: attempt.answers,
    date: attempt.date,
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, ...attempt }
}

export function getAttempts(uid, onResult, onError) {
  const q = query(collection(fdb, 'users', uid, 'attempts'), orderBy('date', 'desc'))
  return onSnapshot(
    q,
    (snap) => onResult(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

export function useAttempts(uid) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!uid) {
      setAttempts([])
      setLoading(false)
      return undefined
    }
    setAttempts([])
    setLoading(true)
    return getAttempts(
      uid,
      (items) => {
        setAttempts(items)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
  }, [uid])

  return { attempts, loading, error }
}