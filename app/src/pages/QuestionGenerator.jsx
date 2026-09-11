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

const TYPE_META = {
  mcq: {
    label: 'Multiple choice',
    instructions: 'Choose the correct answer from the options A to D.',
  },
  short: {
    label: 'Short answer',
    instructions: 'Answer the following questions briefly in the space provided.',
  },
  essay: {
    label: 'Essay',
    instructions: 'Answer the following questions in detail.',
  },
}
const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E']
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

export default function QuestionGenerator() {
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
  const [sections, setSections] = useState([
    { type: 'mcq', count: 5, marks: '' },
  ])
  const [schoolName, setSchoolName] = useState(profile?.school ?? '')
  const [title, setTitle] = useState('End of Term Assessment')
  const [duration, setDuration] = useState('1 hour')
  const [instructions, setInstructions] = useState(
    'Answer all questions. Write your name and index number on the answer sheet.',
  )
  const [includeAnswers, setIncludeAnswers] = useState(false)
  const [paper, setPaper] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [downloading, setDownloading] = useState('')

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
  const filtered = useMemo(
    () =>
      subjectQuestions.filter(
        (q) =>
          (!strandName || q.strandName === strandName) &&
          (!subStrandName || q.subStrandName === subStrandName),
      ),
    [subjectQuestions, strandName, subStrandName],
  )
  const availableByType = useMemo(() => {
    const c = { mcq: 0, short: 0, essay: 0 }
    for (const q of filtered) c[q.type] = (c[q.type] ?? 0) + 1
    return c
  }, [filtered])

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? ''

  function updateSection(i, patch) {
    setSections((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  function generate() {
    const warns = []
    if (bankTruncated) {
      warns.push(
        `The question bank for this scope exceeds ${SCOPE_LIMIT} questions; only the first ${SCOPE_LIMIT} were loaded.`,
      )
    }
    let number = 1
    const paperSections = []
    let totalMarks = 0
    sections.forEach((cfg, i) => {
      const pool = shuffle(filtered.filter((q) => q.type === cfg.type))
      const count = Math.max(1, Number(cfg.count) || 1)
      if (pool.length < count) {
        warns.push(
          `Only ${pool.length} ${TYPE_META[cfg.type].label} question(s) available (requested ${count}).`,
        )
      }
      const picked = pool.slice(0, count).map((q) => {
        const marks = cfg.marks ? Number(cfg.marks) : (q.marks ?? 1)
        totalMarks += marks
        return { ...q, number: number++, marks }
      })
      if (picked.length > 0) {
        paperSections.push({
          label: `SECTION ${SECTION_LETTERS[i]} — ${TYPE_META[cfg.type].label.toUpperCase()}`,
          instructions: TYPE_META[cfg.type].instructions,
          questions: picked,
        })
      }
    })
    setWarnings(warns)
    setPaper(
      paperSections.length
        ? {
            schoolName,
            title,
            subtitle: `${subjectName} · ${gradeLabel(grade)}`,
            duration,
            instructions,
            sections: paperSections,
            totalMarks,
          }
        : null,
    )
    if (!paperSections.length)
      setWarnings([...warns, 'No matching questions in the bank yet.'])
  }

  async function handleDownload(format) {
    if (!paper) return
    setDownloading(format)
    try {
      // Exam papers count against the free-tier export quota.
      await gate(async () => {
        const { downloadPaperPdf, downloadPaperDocx } = await import(
          '../lib/questionPaper'
        )
        if (format === 'docx') await downloadPaperDocx(paper, { includeAnswers })
        else await downloadPaperPdf(paper, { includeAnswers })
      })
    } finally {
      setDownloading('')
    }
  }

  return (
    <div>
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/questions" className="text-indigo-600 hover:underline">
          Question Bank
        </Link>{' '}
        / Generator
      </nav>
      <h1 className="page-title">
        Questions Generator
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Assemble an exam paper from the Question Bank — pick the scope, the
        sections, and download as PDF or Word.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Criteria panel */}
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
                  setPaper(null)
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
                  setPaper(null)
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
                  setPaper(null)
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
                  setPaper(null)
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
            {subjectId && bank && (
              <p className="text-xs text-slate-500">
                Available here: {availableByType.mcq} MCQ ·{' '}
                {availableByType.short} short answer · {availableByType.essay}{' '}
                essay
                {bankTruncated && (
                  <span className="ml-1 text-amber-600">
                    · bank truncated at {SCOPE_LIMIT} — narrow the scope
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className={labelCls}>Sections</p>
            {sections.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-xs font-bold text-slate-400">
                  {SECTION_LETTERS[i]}
                </span>
                <select
                  value={s.type}
                  onChange={(e) => updateSection(i, { type: e.target.value })}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="mcq">MCQ</option>
                  <option value="short">Short answer</option>
                  <option value="essay">Essay</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={s.count}
                  onChange={(e) => updateSection(i, { count: e.target.value })}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  title="Number of questions"
                />
                <input
                  type="number"
                  min="1"
                  max="50"
                  placeholder="marks"
                  value={s.marks}
                  onChange={(e) => updateSection(i, { marks: e.target.value })}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  title="Marks per question (blank = use each question's own marks)"
                />
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSections((ss) => ss.filter((_, j) => j !== i))
                    }
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-400">
              count · marks per question (leave marks blank to use each
              question's own)
            </p>
            {sections.length < SECTION_LETTERS.length && (
              <button
                type="button"
                onClick={() =>
                  setSections((ss) => [...ss, { type: 'short', count: 5, marks: '' }])
                }
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                + Add section
              </button>
            )}
          </div>

          {/* Paper details */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <span className={labelCls}>School name (on the paper)</span>
              <input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <span className={labelCls}>Paper title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className={labelCls}>Duration</span>
                <input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={inputCls}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={includeAnswers}
                  onChange={(e) => setIncludeAnswers(e.target.checked)}
                  className="accent-indigo-600"
                />
                Include marking scheme
              </label>
            </div>
            <div>
              <span className={labelCls}>General instructions</span>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!subjectId || !bank}
            onClick={generate}
            className="w-full rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {paper ? 'Regenerate (reshuffle)' : 'Generate paper'}
          </button>
          {warnings.map((w, i) => (
            <p
              key={i}
              className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700"
            >
              {w}
            </p>
          ))}
        </div>

        {/* Preview */}
        <div>
          {!paper ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
              The generated paper will preview here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  Preview · {paper.totalMarks} marks
                </p>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload('pdf')}
                    disabled={!!downloading}
                    className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload('docx')}
                    disabled={!!downloading}
                    className="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                  >
                    {downloading === 'docx' ? 'Preparing…' : 'Download Word'}
                  </button>
                </span>
              </div>
              <div className="p-6">
                <div className="mb-4 text-center">
                  <img
                    src="/beaconlogo.png"
                    alt=""
                    className="mx-auto mb-2 h-12 w-12 object-contain"
                  />
                  <p className="font-bold text-slate-900 uppercase">
                    {paper.schoolName || 'Beacon Educational Consult'}
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {paper.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {paper.subtitle}
                    {paper.duration && ` · Duration: ${paper.duration}`} ·{' '}
                    {paper.totalMarks} marks
                  </p>
                </div>
                {paper.instructions && (
                  <p className="mb-4 text-xs text-slate-500 italic">
                    {paper.instructions}
                  </p>
                )}
                {paper.sections.map((section) => (
                  <div key={section.label} className="mb-5">
                    <p className="text-sm font-bold text-slate-800">
                      {section.label}
                    </p>
                    {section.instructions && (
                      <p className="mb-2 text-xs text-slate-500 italic">
                        {section.instructions}
                      </p>
                    )}
                    <ol className="space-y-2">
                      {section.questions.map((q) => (
                        <li key={q.id} className="text-sm text-slate-700">
                          <span className="font-medium">{q.number}.</span>{' '}
                          <span className="whitespace-pre-wrap">
                            {q.question}
                          </span>{' '}
                          <span className="text-xs text-slate-400">
                            [{q.marks} {q.marks === 1 ? 'mark' : 'marks'}]
                          </span>
                          {q.type === 'mcq' && (
                            <ul className="mt-1 ml-5 space-y-0.5 text-xs text-slate-600">
                              {q.options.map((o, i) =>
                                o ? (
                                  <li key={i}>
                                    {LETTERS[i]}. {o}
                                    {includeAnswers &&
                                      q.answer === LETTERS[i] && (
                                        <span className="ml-1 font-semibold text-emerald-600">
                                          ✓
                                        </span>
                                      )}
                                  </li>
                                ) : null,
                              )}
                            </ul>
                          )}
                          {includeAnswers && q.type !== 'mcq' && q.answer && (
                            <p className="mt-1 ml-5 text-xs text-emerald-700">
                              Answer: {q.answer}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
