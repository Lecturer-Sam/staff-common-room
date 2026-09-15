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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-slate-900">Assign to classroom</h2>
        <p className="mt-1 text-sm text-slate-500">
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

        <div className="mt-5 flex gap-3">
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
