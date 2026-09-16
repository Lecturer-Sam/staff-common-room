import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { assignQuiz } from '../lib/classrooms'
import { Button } from './ui'

/**
 * Assign a QuizMaker-built quiz to one of the teacher's classrooms so pupils
 * can take it in-app (Phase 3). Questions are snapshotted at assign time.
 */
export default function AssignQuizModal({ quiz, subjectId, grade, onClose }) {
  const { user } = useAuth()
  const toast = useToast()
  const [classrooms, setClassrooms] = useState(null)
  const [classroomId, setClassroomId] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    getDocs(query(collection(db, 'classrooms'), where('teacherId', '==', user.uid)))
      .then((snap) => {
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        setClassrooms(list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))
      })
      .catch(() => active && setClassrooms([]))
    return () => {
      active = false
    }
  }, [user])

  async function submit() {
    if (!classroomId) return
    setBusy(true)
    try {
      await assignQuiz(
        {
          title: quiz.title,
          subjectId,
          grade,
          classroomId,
          questions: quiz.questions.map((q) => ({
            question: q.question,
            type: q.type,
            options: q.options ?? [],
            answer: q.answer ?? '',
            marks: q.marks ?? 1,
          })),
        },
        user,
      )
      toast.success('Quiz assigned — pupils will see it under My quizzes.')
      onClose()
    } catch {
      toast.error('Could not assign the quiz — check the deployed rules include quizzes.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hearth-modal" onClick={onClose}>
      <div className="hearth-modal__backdrop" />
      <div
        className="hearth-modal__dialog hearth-modal__dialog--sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-quiz-title"
      >
        <h2 id="assign-quiz-title" className="hearth-modal__title">Assign to classroom</h2>
        <p className="hearth-modal__copy">
          “{quiz.title}” ({quiz.questions.length} questions) will be playable in-app by the
          class you pick. MCQs are auto-marked.
        </p>

        {!classrooms ? (
          <p className="mt-4 text-sm text-slate-400">Loading your classrooms…</p>
        ) : classrooms.length === 0 ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            You have no classrooms yet — create one on the Classrooms page first.
          </p>
        ) : (
          <select
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choose a classroom…</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <div className="hearth-modal__actions">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={submit} disabled={busy || !classroomId}>
            {busy ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
      </div>
    </div>
  )
}
