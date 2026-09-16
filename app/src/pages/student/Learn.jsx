import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { useAllSubjects } from '../../hooks/useCurriculum'
import { SkeletonList } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { Badge } from '../../components/ui'

/**
 * Student home (Phase 3): quizzes assigned to the pupil's classroom, with
 * their latest score on each, plus a short recent-results strip.
 */
export default function Learn() {
  const { user, profile } = useAuth()
  const subjects = useAllSubjects()
  const [quizzes, setQuizzes] = useState(null)
  const [attempts, setAttempts] = useState(null)

  const classroomId = profile?.classroomId ?? null

  useEffect(() => {
    if (!user || !classroomId) return
    let active = true
    getDocs(query(collection(db, 'quizzes'), where('classroomId', '==', classroomId)))
      .then((snap) => {
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        setQuizzes(list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)))
      })
      .catch(() => active && setQuizzes([]))
    getDocs(query(collection(db, 'quiz_attempts'), where('studentId', '==', user.uid)))
      .then((snap) => {
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        setAttempts(list.sort((a, b) => (b.completedAt?.seconds ?? 0) - (a.completedAt?.seconds ?? 0)))
      })
      .catch(() => active && setAttempts([]))
    return () => {
      active = false
    }
  }, [user, classroomId])

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id ?? ''

  const bestByQuiz = useMemo(() => {
    const best = {}
    for (const a of attempts ?? []) {
      const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0
      if (!best[a.quizId] || pct > best[a.quizId]) best[a.quizId] = pct
    }
    return best
  }, [attempts])

  if (!classroomId) {
    return (
      <EmptyState
        icon="search"
        title="No classroom yet"
        body="Ask your teacher to add you to a class — your quizzes will appear here."
      />
    )
  }

  return (
    <div className="learning-dashboard">
      <h1 className="learning-dashboard__title">My quizzes</h1>
      <p className="learning-dashboard__intro">
        Answer the quizzes your teacher assigns. Multiple-choice questions are marked
        straight away.
      </p>

      {!quizzes ? (
        <SkeletonList count={3} />
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon="question"
          title="No quizzes yet"
          body="When your teacher assigns a quiz to your class it will show up here."
        />
      ) : (
        <div className="learning-dashboard__quizzes">
          {quizzes.map((qz) => {
            const best = bestByQuiz[qz.id]
            return (
              <Link
                key={qz.id}
                to={`/portal/learn/quiz/${qz.id}`}
                className="learning-quiz-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{qz.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {subjectName(qz.subjectId)} · {qz.grade} ·{' '}
                      {qz.questions?.length ?? 0} question
                      {(qz.questions?.length ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {best !== undefined && (
                      <Badge variant={best >= 50 ? 'success' : 'warn'}>Best: {best}%</Badge>
                    )}
                    <span className="learning-quiz-card__action">
                      {best !== undefined ? 'Try again' : 'Start'}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {attempts && attempts.length > 0 && (
        <section className="learning-results">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Recent results
          </h2>
          <ul className="learning-results__list">
            {attempts.slice(0, 8).map((a) => {
              const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0
              const qz = (quizzes ?? []).find((x) => x.id === a.quizId)
              return (
                <li key={a.id} className="flex items-center justify-between px-4 py-2.5">
                  <p className="truncate text-sm text-slate-700">
                    {qz?.title ?? 'Quiz'}
                    <span className="ml-2 text-xs text-slate-400">
                      {new Date((a.completedAt?.seconds ?? 0) * 1000).toLocaleDateString('en-GB')}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {a.score}/{a.total}
                    <span className={`ml-2 text-xs ${pct >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {pct}%
                    </span>
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
