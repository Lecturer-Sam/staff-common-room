import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCurriculum, useGrades } from '../hooks/useCurriculum'
import useExportGate from '../hooks/useExportGate'
import { gradeLabel } from '../lib/grades'
import {
  SCOPE_LIMIT,
  fetchQuestionsByScope,
  fetchRecentQuestions,
} from '../lib/questionQueries'
import AssignQuizModal from '../components/AssignQuizModal'

const LETTERS = ['A', 'B', 'C', 'D']
const uniq = (arr) => [...new Set(arr.filter(Boolean))]
const inputCls =
  'w-full rounded-lg border border-frame bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'
const labelCls =
  'mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizMaker() {
  const { user, profile } = useAuth()
  const gate = useExportGate()
  const grades = useGrades()
  const [grade, setGrade] = useState('B1')
  const { subjects } = useCurriculum(grade)
  // Tagged with the scope it belongs to so a scope change reads as
  // "loading" without any synchronous setState in the effect below.
  const [bankState, setBankState] = useState(null)

  const [subjectId, setSubjectId] = useState('')
  const [strandName, setStrandName] = useState('')
  const [subStrandName, setSubStrandName] = useState('')
  const [types, setTypes] = useState({ mcq: true, short: false, essay: false })
  const [count, setCount] = useState(10)
  const [title, setTitle] = useState('Class Quiz')
  const [schoolName, setSchoolName] = useState(profile?.school ?? '')
  const [revealAnswers, setRevealAnswers] = useState('after-each')
  const [quiz, setQuiz] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const [warning, setWarning] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Fetch only the slice of the bank this scope needs (the chosen subject)
  // instead of the whole collection on mount. Grade is still filtered
  // client-side below (legacy docs may omit `grade`). Falls back to a
  // bounded full-bank read if the scoped query fails in this environment.
  useEffect(() => {
    if (!user || !subjectId) return
    let active = true
    const done = (items, truncated) => {
      if (active) setBankState({ subjectId, items, truncated })
    }
    fetchQuestionsByScope({ subjectId })
      .then(({ items, truncated }) => done(items, truncated))
      .catch((err) => {
        console.warn('Scoped question query failed, using bounded fallback:', err)
        return fetchRecentQuestions(1000).then(({ items, truncated }) =>
          done(items, truncated),
        )
      })
      .catch(() => done([], false))
    return () => {
      active = false
    }
  }, [user, subjectId])

  const scopeMatch = !!bankState && bankState.subjectId === subjectId
  // null → still loading (or no scope chosen); [] → loaded, empty
  const bank = subjectId && scopeMatch ? bankState.items : null
  const bankTruncated = subjectId && scopeMatch && !!bankState?.truncated

  const subjectQuestions = useMemo(
    () =>
      (bank ?? []).filter(
        (q) => q.subjectId === subjectId && (q.grade ?? 'B1') === grade,
      ),
    [bank, subjectId, grade],
  )
  const strands = useMemo(
    () => uniq(subjectQuestions.map((q) => q.strandName)),
    [subjectQuestions],
  )
  const subStrands = useMemo(
    () =>
      uniq(
        subjectQuestions
          .filter((q) => !strandName || q.strandName === strandName)
          .map((q) => q.subStrandName),
      ),
    [subjectQuestions, strandName],
  )
  const pool = useMemo(
    () =>
      subjectQuestions.filter(
        (q) =>
          (!strandName || q.strandName === strandName) &&
          (!subStrandName || q.subStrandName === subStrandName) &&
          types[q.type],
      ),
    [subjectQuestions, strandName, subStrandName, types],
  )

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? ''

  function generate() {
    const n = Math.max(1, Number(count) || 1)
    if (pool.length === 0) {
      setQuiz(null)
      setWarning('No matching questions in the bank for this scope.')
      return
    }
    setWarning(
      pool.length < n
        ? `Only ${pool.length} matching question(s) available (requested ${n}).`
        : '',
    )
    const picked = shuffle(pool)
      .slice(0, n)
      .map((q, i) => ({ ...q, number: i + 1 }))
    setQuiz({
      schoolName,
      title,
      subtitle: `${subjectName} · ${gradeLabel(grade)}`,
      questions: picked,
    })
  }

  async function handleDownload() {
    if (!quiz) return
    setDownloading(true)
    try {
      // Quiz slides count against the free-tier export quota.
      await gate(async () => {
        const { downloadQuizPptx } = await import('../lib/quizPptx')
        await downloadQuizPptx(quiz, { revealAnswers })
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      {assigning && quiz && (
        <AssignQuizModal
          quiz={quiz}
          subjectId={subjectId}
          grade={grade}
          onClose={() => setAssigning(false)}
        />
      )}
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/questions" className="text-indigo-600 hover:underline">
          Question Bank
        </Link>{' '}
        / Quiz Maker
      </nav>
      <h1 className="page-title">Quiz Maker</h1>
      <p className="mb-6 text-sm text-slate-500">
        Turn Question Bank questions into a classroom slideshow — downloadable
        as PowerPoint (.pptx).
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Criteria */}
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <span className={labelCls}>Class</span>
              <select
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value)
                  setSubjectId('')
                  setStrandName('')
                  setSubStrandName('')
                  setQuiz(null)
                }}
                className={inputCls}
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelCls}>Subject</span>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value)
                  setStrandName('')
                  setSubStrandName('')
                  setQuiz(null)
                }}
                className={inputCls}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelCls}>Strand</span>
              <select
                value={strandName}
                onChange={(e) => {
                  setStrandName(e.target.value)
                  setSubStrandName('')
                  setQuiz(null)
                }}
                className={inputCls}
              >
                <option value="">All strands</option>
                {strands.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelCls}>Sub-strand</span>
              <select
                value={subStrandName}
                onChange={(e) => {
                  setSubStrandName(e.target.value)
                  setQuiz(null)
                }}
                className={inputCls}
              >
                <option value="">All sub-strands</option>
                {subStrands.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={labelCls}>Question types</span>
              <div className="flex gap-4 text-sm text-slate-600">
                {[
                  ['mcq', 'MCQ'],
                  ['short', 'Short answer'],
                  ['essay', 'Essay'],
                ].map(([id, label]) => (
                  <label key={id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={types[id]}
                      onChange={(e) =>
                        setTypes((t) => ({ ...t, [id]: e.target.checked }))
                      }
                      className="accent-indigo-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className={labelCls}>Number of questions</span>
              <input
                type="number"
                min="1"
                max="50"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className={inputCls}
              />
            </div>
            {subjectId && bank && (
              <p className="text-xs text-slate-500">
                {pool.length} matching question(s) in the bank.
                {bankTruncated && (
                  <span className="ml-1 text-amber-600">
                    Bank truncated at {SCOPE_LIMIT} — narrow the scope.
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <span className={labelCls}>Quiz title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <span className={labelCls}>School name</span>
              <input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <span className={labelCls}>Answers in the slideshow</span>
              <select
                value={revealAnswers}
                onChange={(e) => setRevealAnswers(e.target.value)}
                className={inputCls}
              >
                <option value="after-each">
                  Reveal after each question (classroom play)
                </option>
                <option value="end">Answer key slide at the end</option>
                <option value="none">No answers</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!subjectId || !bank}
            onClick={generate}
            className="w-full rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {quiz ? 'Regenerate (reshuffle)' : 'Build quiz'}
          </button>
          {warning && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {warning}
            </p>
          )}
        </div>

        {/* Preview */}
        <div>
          {!quiz ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
              The quiz will preview here — one slide per question.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  {quiz.title} · {quiz.questions.length} question
                  {quiz.questions.length === 1 ? '' : 's'}
                </p>
                <span className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAssigning(true)}
                    className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
                  >
                    Assign to classroom
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {downloading ? 'Preparing…' : 'Download PowerPoint'}
                  </button>
                </span>
              </div>
              <ol className="divide-y divide-slate-100">
                {quiz.questions.map((q) => (
                  <li key={q.id} className="px-4 py-3">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{q.number}.</span>{' '}
                      <span className="whitespace-pre-wrap">{q.question}</span>
                    </p>
                    {q.type === 'mcq' && (
                      <p className="mt-1 text-xs text-slate-500">
                        {q.options
                          .map((o, i) => (o ? `${LETTERS[i]}. ${o}` : null))
                          .filter(Boolean)
                          .join('   ')}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {q.type.toUpperCase()} · {q.marks}{' '}
                      {q.marks === 1 ? 'mark' : 'marks'} · by {q.authorName}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
