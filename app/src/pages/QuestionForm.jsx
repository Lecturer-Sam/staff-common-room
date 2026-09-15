import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum, useGrades } from '../hooks/useCurriculum'
import { isoWeekKey } from '../lib/week'

const TYPES = [
  { id: 'mcq', label: 'Multiple choice (MCQ)' },
  { id: 'short', label: 'Short answer' },
  { id: 'essay', label: 'Essay' },
]
const LETTERS = ['A', 'B', 'C', 'D']

const uniq = (arr) => [...new Set(arr.filter(Boolean))]
const inputCls =
  'w-full rounded-lg border border-frame bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'
const labelCls =
  'mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase'

function Field({ label, children }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  )
}

export default function QuestionForm() {
  const { questionId } = useParams() // present in edit mode
  const { user, profile } = useAuth()
  const grades = useGrades()
  const [grade, setGrade] = useState('B1')
  const { subjects, indicators } = useCurriculum(grade)
  const navigate = useNavigate()

  const [subjectId, setSubjectId] = useState('')
  const [strandName, setStrandName] = useState('')
  const [subStrandName, setSubStrandName] = useState('')
  const [indicatorId, setIndicatorId] = useState('')
  const [type, setType] = useState('mcq')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [answer, setAnswer] = useState('')
  const [marks, setMarks] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!questionId) return
    getDoc(doc(db, 'questions', questionId)).then((snap) => {
      if (!snap.exists()) return setNotFound(true)
      const q = snap.data()
      setGrade(q.grade ?? 'B1')
      setSubjectId(q.subjectId ?? '')
      setStrandName(q.strandName ?? '')
      setSubStrandName(q.subStrandName ?? '')
      setIndicatorId(q.indicatorId ?? '')
      setType(q.type ?? 'mcq')
      setQuestion(q.question ?? '')
      setOptions(q.options?.length ? q.options : ['', '', '', ''])
      setAnswer(q.answer ?? '')
      setMarks(q.marks ?? 1)
    })
  }, [questionId])

  const subjectIndicators = useMemo(
    () => indicators.filter((i) => i.subjectId === subjectId),
    [indicators, subjectId],
  )
  const strands = useMemo(
    () => uniq(subjectIndicators.map((i) => i.strandName)),
    [subjectIndicators],
  )
  const subStrands = useMemo(
    () =>
      uniq(
        subjectIndicators
          .filter((i) => !strandName || i.strandName === strandName)
          .map((i) => i.subStrandName),
      ),
    [subjectIndicators, strandName],
  )
  const subStrandIndicators = useMemo(
    () =>
      subjectIndicators.filter(
        (i) =>
          (!strandName || i.strandName === strandName) &&
          (!subStrandName || i.subStrandName === subStrandName),
      ),
    [subjectIndicators, strandName, subStrandName],
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (type === 'mcq') {
      if (options.filter((o) => o.trim()).length < 2)
        return setError('Provide at least two MCQ options.')
      if (!answer) return setError('Select the correct option.')
    }
    setBusy(true)
    const ind = indicators.find((i) => i.id === indicatorId)
    const payload = {
      grade,
      subjectId,
      strandName,
      subStrandName,
      indicatorId: indicatorId || null,
      indicatorCode: ind?.code ?? null,
      type,
      question,
      options: type === 'mcq' ? options.map((o) => o.trim()) : [],
      answer,
      marks: Number(marks) || 1,
      updatedAt: serverTimestamp(),
    }
    try {
      if (questionId) {
        await updateDoc(doc(db, 'questions', questionId), payload)
      } else {
        await addDoc(collection(db, 'questions'), {
          ...payload,
          authorId: user.uid,
          authorName: profile?.name || user.displayName || 'Teacher',
          weekKey: isoWeekKey(),
          createdAt: serverTimestamp(),
        })
      }
      navigate('/portal/questions')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (notFound) return <p className="text-slate-500">Question not found.</p>

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/questions" className="text-indigo-600 hover:underline">
          Question Bank
        </Link>{' '}
        / {questionId ? 'Edit' : 'New'}
      </nav>
      <h1 className="page-title">
        {questionId ? 'Edit question' : 'Add a question'}
      </h1>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class">
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value)
                setSubjectId('')
                setStrandName('')
                setSubStrandName('')
                setIndicatorId('')
              }}
              className={inputCls}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <select
              required
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value)
                setStrandName('')
                setSubStrandName('')
                setIndicatorId('')
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
          </Field>
          <Field label="Strand">
            <select
              required
              value={strandName}
              onChange={(e) => {
                setStrandName(e.target.value)
                setSubStrandName('')
                setIndicatorId('')
              }}
              className={inputCls}
            >
              <option value="">Select strand…</option>
              {strands.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sub-strand">
            <select
              required
              value={subStrandName}
              onChange={(e) => {
                setSubStrandName(e.target.value)
                setIndicatorId('')
              }}
              className={inputCls}
            >
              <option value="">Select sub-strand…</option>
              {subStrands.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Indicator (optional)">
          <select
            value={indicatorId}
            onChange={(e) => setIndicatorId(e.target.value)}
            className={inputCls}
          >
            <option value="">— none —</option>
            {subStrandIndicators.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.code} —{' '}
                {ind.description.length > 80
                  ? ind.description.slice(0, 80) + '…'
                  : ind.description}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Question type">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setAnswer('')
              }}
              className={inputCls}
            >
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marks">
            <input
              type="number"
              min="1"
              max="100"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Question">
          <textarea
            required
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Write the question…"
            className={inputCls}
          />
        </Field>

        {type === 'mcq' ? (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
            <p className={labelCls}>Options (tick the correct one)</p>
            {LETTERS.map((letter, i) => (
              <label key={letter} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={answer === letter}
                  onChange={() => setAnswer(letter)}
                  className="accent-indigo-600"
                />
                <span className="w-4 text-xs font-bold text-slate-500">
                  {letter}
                </span>
                <input
                  value={options[i] ?? ''}
                  onChange={(e) =>
                    setOptions((os) =>
                      os.map((o, j) => (j === i ? e.target.value : o)),
                    )
                  }
                  placeholder={`Option ${letter}`}
                  className={inputCls}
                />
              </label>
            ))}
          </div>
        ) : (
          <Field
            label={type === 'essay' ? 'Marking guide / model answer' : 'Answer'}
          >
            <textarea
              rows={type === 'essay' ? 4 : 2}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Expected answer…"
              className={inputCls}
            />
          </Field>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : questionId ? 'Save changes' : 'Add question'}
          </button>
          <Link
            to="/portal/questions"
            className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
