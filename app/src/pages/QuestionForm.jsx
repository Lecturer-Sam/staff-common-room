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
  { id: 'objective', label: 'Objective (MCQ / True-False)' },
  { id: 'essay', label: 'Essay / Structured / Short' },
]
const OBJECTIVE_SUBTYPES = [
  { id: 'mcq', label: 'Multiple choice (A-D)' },
  { id: 'true_false', label: 'True / False' },
  { id: 'fill_blank', label: 'Fill in blank' },
]
const ESSAY_SUBTYPES = [
  { id: 'short', label: 'Short answer' },
  { id: 'structured', label: 'Structured' },
  { id: 'long', label: 'Long essay' },
]
const DIFFICULTIES = ['easy', 'medium', 'hard']
const BLOOM = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
const STATUSES = [
  { id: 'draft', label: 'Draft (only you)' },
  { id: 'pending', label: 'Pending review' },
  { id: 'published', label: 'Published (admin only)' },
]
const LETTERS = ['A', 'B', 'C', 'D']

const uniq = (arr) => [...new Set(arr.filter(Boolean))]
const inputCls =
  'w-full rounded-lg border border-frame bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'
const labelCls =
  'mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase'

function Field({ label, children, hint }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export default function QuestionForm() {
  const { questionId } = useParams()
  const { user, profile } = useAuth()
  const grades = useGrades()
  const [grade, setGrade] = useState('B4')
  const { subjects, indicators } = useCurriculum(grade)
  const navigate = useNavigate()

  const isAdmin = profile?.role === 'admin'

  // Curriculum hierarchy
  const [subjectId, setSubjectId] = useState('')
  const [strandName, setStrandName] = useState('')
  const [subStrandName, setSubStrandName] = useState('')
  const [contentStandardCode, setContentStandardCode] = useState('')
  const [indicatorId, setIndicatorId] = useState('')

  // Question core
  const [type, setType] = useState('objective')
  const [objectiveType, setObjectiveType] = useState('mcq')
  const [essayType, setEssayType] = useState('short')
  const [text, setText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [markingGuide, setMarkingGuide] = useState('')
  const [marks, setMarks] = useState(2)
  const [difficulty, setDifficulty] = useState('medium')
  const [bloomLevel, setBloomLevel] = useState('understand')
  const [source, setSource] = useState('')
  const [status, setStatus] = useState('pending')

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Load existing for edit
  useEffect(() => {
    if (!questionId) return
    getDoc(doc(db, 'questions', questionId)).then((snap) => {
      if (!snap.exists()) return setNotFound(true)
      const q = snap.data()
      setGrade(q.grade ?? 'B4')
      setSubjectId(q.subjectId ?? '')
      setStrandName(q.strandName ?? '')
      setSubStrandName(q.subStrandName ?? '')
      setContentStandardCode(q.contentStandardCode ?? q.contentStandard ?? '')
      setIndicatorId(q.indicatorId ?? '')
      // Map legacy types
      const legacy = q.type
      if (legacy === 'mcq') {
        setType('objective')
        setObjectiveType('mcq')
      } else if (legacy === 'short') {
        setType('essay')
        setEssayType('short')
      } else if (legacy === 'essay') {
        setType('essay')
        setEssayType(q.essayType ?? 'structured')
      } else {
        setType(q.type ?? 'objective')
      }
      setObjectiveType(q.objectiveType ?? 'mcq')
      setEssayType(q.essayType ?? q.type === 'short' ? 'short' : 'structured')
      setText(q.text ?? q.question ?? '')
      setOptions(q.options?.length ? q.options : ['', '', '', ''])
      setCorrectAnswer(q.correctAnswer ?? q.answer ?? '')
      setMarkingGuide(q.markingGuide ?? (q.type !== 'mcq' ? q.answer ?? '' : ''))
      setMarks(q.marks ?? 2)
      setDifficulty(q.difficulty ?? 'medium')
      setBloomLevel(q.bloomLevel ?? 'understand')
      setSource(q.source ?? '')
      setStatus(q.status ?? 'pending')
    })
  }, [questionId])

  // Derived curriculum lists
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
  // Content standards are uniq by code, filtered by strand/sub-strand
  const contentStandards = useMemo(() => {
    const map = new Map()
    subjectIndicators
      .filter(
        (i) =>
          (!strandName || i.strandName === strandName) &&
          (!subStrandName || i.subStrandName === subStrandName),
      )
      .forEach((i) => {
        if (!map.has(i.contentStandardCode)) {
          map.set(i.contentStandardCode, {
            code: i.contentStandardCode,
            desc: i.contentStandardDescription || i.contentStandardCode,
            strand: i.strandName,
            subStrand: i.subStrandName,
          })
        }
      })
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [subjectIndicators, strandName, subStrandName])

  const subStrandIndicators = useMemo(
    () =>
      subjectIndicators.filter(
        (i) =>
          (!strandName || i.strandName === strandName) &&
          (!subStrandName || i.subStrandName === subStrandName) &&
          (!contentStandardCode || i.contentStandardCode === contentStandardCode),
      ),
    [subjectIndicators, strandName, subStrandName, contentStandardCode],
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!subjectId) return setError('Subject is required.')
    if (!contentStandardCode) return setError('Content Standard is required — every question must map to one content standard (PRD critical rule).')
    if (!text.trim()) return setError('Question text is required.')

    if (type === 'objective') {
      if (objectiveType === 'mcq') {
        if (options.filter((o) => o.trim()).length < 2)
          return setError('Provide at least two MCQ options.')
        if (!correctAnswer) return setError('Select the correct option.')
      }
      if (objectiveType === 'true_false' && !['True', 'False', 'A', 'B'].includes(correctAnswer)) {
        // allow True/False or A/B
      }
    }

    setBusy(true)
    const ind = indicators.find((i) => i.id === indicatorId)
    const cs = contentStandards.find((c) => c.code === contentStandardCode)

    const payload = {
      grade,
      subjectId,
      strandName: strandName || cs?.strand || '',
      subStrandName: subStrandName || cs?.subStrand || '',
      strandCode: ind?.strandNumber ? `${grade}.${ind.strandNumber}` : '',
      subStrandCode: ind?.subStrandNumber ? `${grade}.${ind.strandNumber}.${ind.subStrandNumber}` : '',
      contentStandardCode,
      contentStandardDesc: cs?.desc || '',
      indicatorId: indicatorId || null,
      indicatorCode: ind?.code || null,
      indicatorDesc: ind?.description || null,

      type, // objective | essay (new)
      objectiveType: type === 'objective' ? objectiveType : null,
      essayType: type === 'essay' ? essayType : null,
      // legacy compat
      legacyType: type === 'objective' ? 'mcq' : essayType,

      text: text.trim(),
      question: text.trim(), // keep legacy field for old generators
      options: type === 'objective' && objectiveType === 'mcq' ? options.map((o) => o.trim()) : [],
      correctAnswer: correctAnswer.trim(),
      answer: type === 'objective' ? correctAnswer.trim() : markingGuide.trim(), // legacy
      markingGuide: markingGuide.trim(),
      marks: Number(marks) || 1,
      difficulty,
      bloomLevel,
      source: source.trim(),
      status: isAdmin ? status : 'pending', // non-admins always pending review
      version: 1,
      schoolId: profile?.schoolId || null,
      updatedAt: serverTimestamp(),
    }

    try {
      if (questionId) {
        // version bump + audit
        const prevSnap = await getDoc(doc(db, 'questions', questionId))
        const prev = prevSnap.exists() ? prevSnap.data() : {}
        await updateDoc(doc(db, 'questions', questionId), {
          ...payload,
          version: (prev.version || 1) + 1,
          auditLog: [
            ...(prev.auditLog || []).slice(-20),
            {
              action: 'update',
              by: user.uid,
              at: new Date().toISOString(),
              diff: `edited by ${profile?.name || user.uid}`,
            },
          ],
        })
      } else {
        await addDoc(collection(db, 'questions'), {
          ...payload,
          authorId: user.uid,
          authorName: profile?.name || user.displayName || 'Teacher',
          weekKey: isoWeekKey(),
          createdAt: serverTimestamp(),
          auditLog: [
            { action: 'create', by: user.uid, at: new Date().toISOString() },
          ],
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
    <div className="mx-auto max-w-3xl">
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/questions" className="text-indigo-600 hover:underline">
          Question Bank
        </Link>{' '}
        / {questionId ? 'Edit' : 'New'}
      </nav>
      <h1 className="page-title">
        {questionId ? 'Edit question' : 'Add a question'}
      </h1>
      <p className="mb-4 text-xs text-slate-500">
        Every question <span className="font-semibold">must</span> map to one Content Standard — this is the PRD critical rule for precise generation.
      </p>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Curriculum hierarchy */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-bold tracking-wide text-slate-500 uppercase">Curriculum alignment (required)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Class">
              <select
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value)
                  setSubjectId('')
                  setStrandName('')
                  setSubStrandName('')
                  setContentStandardCode('')
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
                  setContentStandardCode('')
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
                value={strandName}
                onChange={(e) => {
                  setStrandName(e.target.value)
                  setSubStrandName('')
                  setContentStandardCode('')
                  setIndicatorId('')
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
            </Field>
            <Field label="Sub-strand">
              <select
                value={subStrandName}
                onChange={(e) => {
                  setSubStrandName(e.target.value)
                  setContentStandardCode('')
                  setIndicatorId('')
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
            </Field>
          </div>

          <div className="mt-4 grid gap-4">
            <Field label="Content Standard *" hint="Required — every question must map to one content standard. This drives precise test generation.">
              <select
                required
                value={contentStandardCode}
                onChange={(e) => {
                  setContentStandardCode(e.target.value)
                  setIndicatorId('')
                }}
                className={inputCls}
              >
                <option value="">Select content standard…</option>
                {contentStandards.map((cs) => (
                  <option key={cs.code} value={cs.code}>
                    {cs.code} — {cs.desc.length > 90 ? cs.desc.slice(0, 90) + '…' : cs.desc}
                  </option>
                ))}
              </select>
              {contentStandards.length === 0 && subjectId && (
                <p className="mt-1 text-xs text-amber-600">No content standards found for this filter — try clearing strand/sub-strand or pick another subject. The curriculum bundle may be missing.</p>
              )}
            </Field>

            <Field label="Indicator (optional but preferred)" hint="Precise indicator makes generation and coverage analytics stronger.">
              <select
                value={indicatorId}
                onChange={(e) => setIndicatorId(e.target.value)}
                className={inputCls}
              >
                <option value="">— none —</option>
                {subStrandIndicators.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.code} — {ind.description.length > 80 ? ind.description.slice(0, 80) + '…' : ind.description}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Question type + meta */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-bold tracking-wide text-slate-500 uppercase">Question details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select value={type} onChange={(e) => { setType(e.target.value); setCorrectAnswer('') }} className={inputCls}>
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            {type === 'objective' ? (
              <Field label="Objective subtype">
                <select value={objectiveType} onChange={(e) => { setObjectiveType(e.target.value); setCorrectAnswer('') }} className={inputCls}>
                  {OBJECTIVE_SUBTYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Essay subtype">
                <select value={essayType} onChange={(e) => setEssayType(e.target.value)} className={inputCls}>
                  {ESSAY_SUBTYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
            )}
            <Field label="Difficulty">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputCls}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Bloom level">
              <select value={bloomLevel} onChange={(e) => setBloomLevel(e.target.value)} className={inputCls}>
                {BLOOM.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Marks">
              <input type="number" min="1" max="100" value={marks} onChange={(e) => setMarks(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Source" hint="e.g. BECE 2023, NaCCA exemplar, curated">
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source..." className={inputCls} />
            </Field>
            {isAdmin && (
              <Field label="Status (admin)">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
            )}
          </div>
        </div>

        {/* Question text */}
        <Field label="Question text *">
          <textarea required rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write the question… e.g. What is the place value of 5 in 45,000?" className={inputCls} />
        </Field>

        {type === 'objective' ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            {objectiveType === 'mcq' && (
              <>
                <p className={labelCls}>Options (tick the correct one) *</p>
                {LETTERS.map((letter, i) => (
                  <label key={letter} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={correctAnswer === letter} onChange={() => setCorrectAnswer(letter)} className="accent-indigo-600" />
                    <span className="w-4 text-xs font-bold text-slate-500">{letter}</span>
                    <input value={options[i] ?? ''} onChange={(e) => setOptions((os) => os.map((o, j) => (j === i ? e.target.value : o)))} placeholder={`Option ${letter}`} className={inputCls} />
                  </label>
                ))}
              </>
            )}
            {objectiveType === 'true_false' && (
              <Field label="Correct answer *">
                <select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="True">True</option>
                  <option value="False">False</option>
                  <option value="A">A (True)</option>
                  <option value="B">B (False)</option>
                </select>
              </Field>
            )}
            {objectiveType === 'fill_blank' && (
              <Field label="Correct answer(s) *">
                <input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder="e.g. 5,000" className={inputCls} />
              </Field>
            )}
          </div>
        ) : (
          <Field label={essayType === 'short' ? 'Expected answer' : 'Marking guide / model answer *'} hint={essayType === 'long' ? 'Teacher-only: detailed guide, points, rubric' : 'Teacher-only'}>
            <textarea rows={essayType === 'long' ? 6 : 4} value={markingGuide} onChange={(e) => setMarkingGuide(e.target.value)} placeholder={essayType === 'short' ? 'Brief expected answer…' : 'Detailed marking guide…'} className={inputCls} />
          </Field>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? 'Saving…' : questionId ? 'Save changes' : 'Add question'}
          </button>
          <Link to="/portal/questions" className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
