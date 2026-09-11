import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Skeleton } from '../../components/Skeleton'
import { Button } from '../../components/ui'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * In-app quiz player (Phase 3). MCQs are auto-marked against the snapshotted
 * answer; short/essay answers are collected but left for the teacher. On
 * submit a `quiz_attempts` row records the score for the teacher's analytics.
 */
export default function QuizPlayer() {
  const { quizId } = useParams()
  const { user, profile } = useAuth()
  const toast = useToast()

  const [quiz, setQuiz] = useState(undefined) // undefined=loading, null=missing
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({}) // qKey → letter / free text
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    getDoc(doc(db, 'quizzes', quizId))
      .then((snap) => active && setQuiz(snap.exists() ? { id: snap.id, ...snap.data() } : null))
      .catch(() => active && setQuiz(null))
    return () => {
      active = false
    }
  }, [quizId])

  const questions = useMemo(() => quiz?.questions ?? [], [quiz])
  const qKey = (i) => `${i}`
  const current = questions[idx]
  const mcqs = useMemo(() => questions.filter((q) => q.type === 'mcq'), [questions])

  if (quiz === undefined) return <Skeleton height="h-24" />
  if (quiz === null) return <p className="text-slate-500">Quiz not found.</p>

  function choose(letter) {
    setAnswers((a) => ({ ...a, [qKey(idx)]: letter }))
  }

  async function submit() {
    setBusy(true)
    // Auto-mark MCQs only; free-text answers go to the teacher.
    let score = 0
    questions.forEach((q, i) => {
      if (q.type === 'mcq' && answers[qKey(i)] === q.answer) score += 1
    })
    const total = mcqs.length
    try {
      // Store every answer (MCQ letters + free text) so the teacher can
      // mark written responses later — see the Classrooms grading panel.
      const answerMap = {}
      questions.forEach((q, i) => {
        const v = answers[qKey(i)]
        if (v !== undefined && v !== '') answerMap[`${i}`] = String(v).slice(0, 4000)
      })
      await addDoc(collection(db, 'quiz_attempts'), {
        quizId: quiz.id,
        classroomId: quiz.classroomId,
        teacherId: quiz.authorId,
        studentId: user.uid,
        studentName: profile?.name || 'Student',
        schoolId: profile?.schoolId ?? null,
        score,
        total,
        answered: Object.keys(answers).length,
        answers: answerMap,
        completedAt: serverTimestamp(),
      })
      setResult({ score, total })
    } catch {
      toast.error('Could not save your result — ask your teacher to check the connection.')
    } finally {
      setBusy(false)
    }
  }

  // ── Result screen ──────────────────────────────────────────────────────
  if (result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : null
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Quiz finished
          </p>
          {pct !== null ? (
            <>
              <p className="mt-2 text-4xl font-extrabold text-slate-900">
                {result.score}/{result.total}
              </p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-brand-ring' : 'text-amber-600'
                }`}
              >
                {pct}% {pct >= 80 ? '— excellent!' : pct >= 50 ? '— well done!' : '— keep practising!'}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              This quiz had no auto-marked questions — your teacher will check your answers.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Your answers have been saved for your teacher.
          </p>
        </div>

        {/* Instant feedback per MCQ */}
        {mcqs.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Check your answers
            </h2>
            {questions.map((q, i) => {
              if (q.type !== 'mcq') return null
              const mine = answers[qKey(i)]
              const right = mine === q.answer
              return (
                <div key={i} className={`card border-l-4 p-4 ${right ? 'border-l-emerald-400' : 'border-l-red-400'}`}>
                  <p className="text-sm text-slate-700">
                    {i + 1}. {q.question}
                  </p>
                  <p className="mt-1.5 text-xs">
                    <span className={right ? 'text-emerald-600' : 'text-red-600'}>
                      Your answer: {mine ?? '—'}
                      {mine && ` (${q.options?.[LETTERS.indexOf(mine)] ?? ''})`}
                    </span>
                    {!right && (
                      <span className="ml-3 text-emerald-600">
                        Correct: {q.answer}
                        {` (${q.options?.[LETTERS.indexOf(q.answer)] ?? ''})`}
                      </span>
                    )}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" to="/portal/learn">
            Back to my quizzes
          </Button>
          <Button
            onClick={() => {
              setAnswers({})
              setIdx(0)
              setResult(null)
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  // ── Player ─────────────────────────────────────────────────────────────
  const answered = Object.keys(answers).length
  const last = idx === questions.length - 1

  return (
    <div className="mx-auto max-w-xl">
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/learn" className="text-indigo-600 hover:underline">
          My quizzes
        </Link>{' '}
        / {quiz.title}
      </nav>

      {/* Progress */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${((idx + 1) / Math.max(1, questions.length)) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">
          {idx + 1} / {questions.length}
        </span>
      </div>

      {questions.length === 0 ? (
        <p className="text-slate-500">This quiz has no questions yet.</p>
      ) : (
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Question {idx + 1}
            {current?.type === 'mcq'
              ? ' · multiple choice'
              : current?.type === 'essay'
                ? ' · essay (teacher will mark)'
                : ' · short answer (teacher will mark)'}
            {current?.marks ? ` · ${current.marks} mark${current.marks === 1 ? '' : 's'}` : ''}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-base font-medium text-slate-800">
            {current?.question}
          </p>

          {current?.type === 'mcq' ? (
            <div className="mt-4 space-y-2">
              {(current.options ?? []).map((opt, oi) => {
                const letter = LETTERS[oi]
                const active = answers[qKey(idx)] === letter
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => choose(letter)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      active
                        ? 'border-brand bg-brand/10 font-semibold text-slate-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {letter}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
          ) : (
            <textarea
              value={answers[qKey(idx)] ?? ''}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [qKey(idx)]: e.target.value }))
              }
              rows={4}
              placeholder="Write your answer here…"
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          )}
        </div>
      )}

      {/* Nav buttons */}
      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
          ← Back
        </Button>
        {last ? (
          <Button onClick={submit} disabled={busy || questions.length === 0}>
            {busy ? 'Saving…' : `Finish${answered < questions.length ? ` (${answered}/${questions.length} answered)` : ''}`}
          </Button>
        ) : (
          <Button onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}>
            Next →
          </Button>
        )}
      </div>
    </div>
  )
}
