import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { useCurriculum, useSchedules, useGrades } from '../hooks/useCurriculum'
import { useToast } from '../context/ToastContext'
import Stepper from '../components/Stepper'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TERMS = [1, 2, 3]
const WEEKS = Array.from({ length: 14 }, (_, i) => i + 1)
const PLAN_STEPS = [
  { label: 'Scope' },
  { label: 'Details' },
  { label: 'Daily phases' },
  { label: 'Review' },
]

const uniq = (arr) => [...new Set(arr.filter(Boolean))]
const mergeLines = (text, extra) =>
  uniq((text ? text.split('\n') : []).concat(extra)).join('\n')
// Schedule phase fields may be arrays of steps or plain strings.
const asText = (v) => (Array.isArray(v) ? v.filter(Boolean).join('\n') : (v ?? ''))

function emptyDay(day) {
  return { day, starter: '', main: '', plenary: '' }
}

const HEADER_BLANKS = {
  weekEnding: '',
  classSize: '',
  duration: '60mins per lesson',
  lessonLabel: '1 OF 1',
  strand: '',
  subStrand: '',
  contentStandard: '',
  indicator: '',
  performanceIndicator: '',
  competencies: '',
  resources: '',
  newWords: '',
  references: '',
}

const inputCls =
  'w-full rounded-lg border border-frame bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15'

function Field({ label, children }) {
  return (
    <div>
      <span className="label-caps">{label}</span>
      {children}
    </div>
  )
}

export default function LessonPlanForm() {
  const { planId } = useParams() // present in edit mode
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const grades = useGrades()
  const [grade, setGrade] = useState(searchParams.get('grade') || 'B1')
  const { subjects, indicators } = useCurriculum(grade)
  const { lessons } = useSchedules(grade)
  const navigate = useNavigate()

  const paramIndicator = searchParams.get('indicator') || ''
  const fromId = searchParams.get('from') // present when cloning a template

  const [subjectId, setSubjectId] = useState(searchParams.get('subject') || '')
  const [term, setTerm] = useState(Number(searchParams.get('term')) || 1)
  const [week, setWeek] = useState(Number(searchParams.get('week')) || 1)
  const [header, setHeader] = useState(HEADER_BLANKS)
  const [days, setDays] = useState(DAYS.map(emptyDay))
  const [indicatorIds, setIndicatorIds] = useState([])
  const [visibility, setVisibility] = useState('public')
  const [prefilled, setPrefilled] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [legacy, setLegacy] = useState(false)
  const [step, setStep] = useState(0)
  const toast = useToast()

  // Clone an existing plan as a starting template
  useEffect(() => {
    if (planId || !fromId) return
    getDoc(doc(db, 'lesson_plans', fromId)).then((snap) => {
      if (!snap.exists()) return
      const p = snap.data()
      if (p.kind !== 'plan-v2') return
      setGrade(p.grade ?? 'B1')
      setSubjectId(p.subjectId)
      setTerm(p.term ?? 1)
      setWeek(p.week ?? 1)
      setHeader({ ...HEADER_BLANKS, ...p.header })
      setDays(p.days ?? DAYS.map(emptyDay))
      setIndicatorIds(p.indicatorIds ?? [])
      setPrefilled(true)
    })
  }, [planId, fromId])

  // Load existing plan in edit mode
  useEffect(() => {
    if (!planId) return
    getDoc(doc(db, 'lesson_plans', planId)).then((snap) => {
      if (!snap.exists()) return setNotFound(true)
      const p = snap.data()
      if (p.kind !== 'plan-v2') return setLegacy(true)
      setGrade(p.grade ?? 'B1')
      setSubjectId(p.subjectId)
      setTerm(p.term ?? 1)
      setWeek(p.week ?? 1)
      setHeader({ ...HEADER_BLANKS, ...p.header })
      setDays(p.days ?? DAYS.map(emptyDay))
      setIndicatorIds(p.indicatorIds ?? [])
      setVisibility(p.visibility)
      setPrefilled(true)
    })
  }, [planId])

  const subject = subjects.find((s) => s.id === subjectId)
  const subjectName = subject?.name ?? ''
  const weekLessons = useMemo(
    () =>
      lessons.filter(
        (l) => l.subjectId === subjectId && l.term === term && l.week === week,
      ),
    [lessons, subjectId, term, week],
  )
  const subjectIndicators = useMemo(
    () => indicators.filter((i) => i.subjectId === subjectId),
    [indicators, subjectId],
  )

  // Pre-fill from schedule / indicator (new plans only).
  // "Adjust state during render" pattern — react.dev/learn/you-might-not-need-an-effect
  const [lastPrefill, setLastPrefill] = useState(null)
  const prefillKey = `${subjectId}|${term}|${week}|${weekLessons.length}|${paramIndicator}|${indicators.length}`
  if (!planId && !prefilled && subjectId && prefillKey !== lastPrefill) {
    setLastPrefill(prefillKey)
    if (weekLessons.length > 0) {
      // Fully generated from the extracted scheme of learning
      setHeader({
        ...HEADER_BLANKS,
        strand: uniq(weekLessons.map((l) => l.strandName)).join('\n'),
        subStrand: uniq(weekLessons.map((l) => l.subStrandName)).join('\n'),
        contentStandard: uniq(
          weekLessons.map(
            (l) =>
              `${l.contentStandardCode ?? ''} ${l.contentStandardDescription ?? ''}`.trim(),
          ),
        ).join('\n'),
        indicator: uniq(
          weekLessons.map(
            (l) => `${l.indicatorCode ?? ''} ${l.indicatorDescription ?? ''}`.trim(),
          ),
        ).join('\n'),
        performanceIndicator: uniq(
          weekLessons.map((l) => l.performanceIndicator),
        ).join('\n'),
        competencies: uniq(weekLessons.map((l) => l.competencies)).join('\n'),
        resources: uniq(weekLessons.map((l) => l.resources)).join('\n'),
        newWords: uniq(
          weekLessons.flatMap((l) => (l.keywords ?? '').split(/,\s*/)),
        ).join(', '),
        references: subjectName ? `${subjectName} Curriculum Pg. ` : '',
      })
      setDays(
        DAYS.map((day) => {
          const l = weekLessons.find((x) => x.day === day)
          return l
            ? {
                day,
                starter: [l.rpk ? `RPK: ${l.rpk}` : '', asText(l.starter)]
                  .filter(Boolean)
                  .join('\n\n'),
                main: asText(l.main),
                plenary: [
                  asText(l.plenary),
                  l.assessment ? `Assessment: ${l.assessment}` : '',
                ]
                  .filter(Boolean)
                  .join('\n\n'),
              }
            : emptyDay(day)
        }),
      )
      setIndicatorIds(uniq(weekLessons.map((l) => l.indicatorId)))
    } else {
      const ind = subjectIndicators.find((x) => x.id === paramIndicator)
      setHeader({
        ...HEADER_BLANKS,
        strand: ind?.strandName ?? '',
        subStrand: ind?.subStrandName ?? '',
        contentStandard: ind
          ? `${ind.contentStandardCode ?? ''} ${ind.contentStandardDescription ?? ''}`.trim()
          : '',
        indicator: ind ? `${ind.code} ${ind.description}`.trim() : '',
        performanceIndicator: ind ? `Learners can ${ind.description}` : '',
        competencies: ind?.competencies ?? '',
        resources: ind?.resources ?? '',
        newWords: ind?.keywords ?? '',
        references: subjectName ? `${subjectName} Curriculum Pg. ` : '',
      })
      setDays(DAYS.map(emptyDay))
      setIndicatorIds(ind ? [ind.id] : [])
    }
  }

  const setH = (patch) => setHeader((h) => ({ ...h, ...patch }))

  function applyIndicator(indicatorId) {
    const ind = subjectIndicators.find((x) => x.id === indicatorId)
    if (!ind) return
    setHeader((h) => ({
      ...h,
      strand: mergeLines(h.strand, ind.strandName),
      subStrand: mergeLines(h.subStrand, ind.subStrandName),
      contentStandard: mergeLines(
        h.contentStandard,
        `${ind.contentStandardCode ?? ''} ${ind.contentStandardDescription ?? ''}`.trim(),
      ),
      indicator: mergeLines(h.indicator, `${ind.code} ${ind.description}`.trim()),
      performanceIndicator: mergeLines(
        h.performanceIndicator,
        `Learners can ${ind.description}`,
      ),
      competencies: mergeLines(h.competencies, ind.competencies),
      resources: mergeLines(h.resources, ind.resources),
      newWords: h.newWords
        ? uniq(h.newWords.split(/,\s*/).concat((ind.keywords ?? '').split(/,\s*/))).join(', ')
        : (ind.keywords ?? ''),
    }))
    setIndicatorIds((ids) => uniq([...ids, ind.id]))
  }

  function updateDay(i, patch) {
    setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Only publish from the final (review) step; earlier steps just advance.
    if (step < PLAN_STEPS.length - 1) return
    setError('')
    setBusy(true)
    const firstCode = header.indicator.split(/\s/)[0] || ''
    const payload = {
      kind: 'plan-v2',
      title: `${subjectName} — Term ${term}, Week ${week}${firstCode ? ` (${firstCode})` : ''}`,
      subjectId,
      grade,
      term,
      week,
      header,
      days,
      indicatorIds,
      visibility,
      // School-shared plans carry the author's school for rules + queries.
      ...(visibility === 'school' && profile?.schoolId
        ? { schoolId: profile.schoolId }
        : {}),
      updatedAt: serverTimestamp(),
    }
    try {
      if (planId) {
        await updateDoc(doc(db, 'lesson_plans', planId), payload)
        toast.success('Lesson plan saved.')
        navigate(`/portal/plans/${planId}`)
      } else {
        const ref = await addDoc(collection(db, 'lesson_plans'), {
          ...payload,
          authorId: user.uid,
          authorName: profile?.name || user.displayName || 'Teacher',
          contentStandardCode: null,
          attachmentURLs: [],
          createdAt: serverTimestamp(),
        })
        toast.success('Lesson plan published.')
        navigate(`/portal/plans/${ref.id}`)
      }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to save lesson plan.')
      setBusy(false)
    }
  }

  if (notFound) return <p className="text-slate-500">Lesson plan not found.</p>
  if (legacy)
    return (
      <p className="text-slate-500">
        This lesson plan was created with an older version of the app and can
        no longer be edited. Please create a new plan.
      </p>
    )

  const gradeName = grades.find((g) => g.id === grade)?.name ?? grade
  const filledDays = days.filter(
    (d) => d.starter.trim() || d.main.trim() || d.plenary.trim(),
  ).length

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/plans" className="text-indigo-600 hover:underline">
          Lesson Plans
        </Link>{' '}
        / {planId ? 'Edit' : 'New'}
      </nav>
      <h1 className="page-title">
        {planId ? 'Edit lesson plan' : 'New lesson plan'}
      </h1>
      <p className="page-subtitle mb-6">
        Build the national weekly plan in four steps.
      </p>

      <Stepper steps={PLAN_STEPS} current={step} onStepClick={setStep} />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Step 1: Scope ── */}
        {step === 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <select
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value)
                  setSubjectId('')
                  setPrefilled(false)
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value)
                  setPrefilled(false)
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={term}
                onChange={(e) => {
                  setTerm(Number(e.target.value))
                  setPrefilled(false)
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    Term {t}
                  </option>
                ))}
              </select>
              <select
                value={week}
                onChange={(e) => {
                  setWeek(Number(e.target.value))
                  setPrefilled(false)
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {WEEKS.map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2 md:col-span-1"
              >
                <option value="public">Public — visible to all teachers</option>
                <option value="private">Private — only me</option>
                {(profile?.schoolId || visibility === 'school') && (
                  <option value="school">My school only</option>
                )}
              </select>
            </div>

            {!subjectId && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Choose a subject to continue.
              </p>
            )}
            {fromId && prefilled && (
              <p className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                Copied from another member's lesson plan — adapt it and publish
                as your own.
              </p>
            )}
            {!fromId && subjectId && weekLessons.length > 0 && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Generated from the {subjectName} scheme of learning for Term{' '}
                {term}, Week {week} — including the daily phases. Fill in the
                blanks (week ending, class size…) and adjust anything before
                saving.
              </p>
            )}
            {!fromId && subjectId && weekLessons.length === 0 && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                No extracted schedule for this subject/week — the indicator
                picker in the next step fills the header, and the daily phases
                are left blank for you to complete.
              </p>
            )}
          </>
        )}

        {/* ── Step 2: Lesson details ── */}
        {step === 1 &&
          (subjectId ? (
            <>
              <select
                value=""
                onChange={(e) => applyIndicator(e.target.value)}
                className="w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 py-2 text-xs text-slate-500"
              >
                <option value="">
                  + Fill from indicator (strand, standard, competencies,
                  resources)…
                </option>
                {subjectIndicators.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.code} —{' '}
                    {ind.description.length > 90
                      ? ind.description.slice(0, 90) + '…'
                      : ind.description}
                  </option>
                ))}
              </select>

              {/* Header block, mirroring the national template */}
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 md:grid-cols-4">
                <Field label="Week ending">
                  <input
                    type="date"
                    value={header.weekEnding}
                    onChange={(e) => setH({ weekEnding: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Class size">
                  <input
                    value={header.classSize}
                    onChange={(e) => setH({ classSize: e.target.value })}
                    placeholder="e.g. 35"
                    className={inputCls}
                  />
                </Field>
                <Field label="Duration">
                  <input
                    value={header.duration}
                    onChange={(e) => setH({ duration: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Lesson">
                  <input
                    value={header.lessonLabel}
                    onChange={(e) => setH({ lessonLabel: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Strand">
                  <textarea
                    rows={2}
                    value={header.strand}
                    onChange={(e) => setH({ strand: e.target.value })}
                    className={`${inputCls} sm:col-span-1`}
                  />
                </Field>
                <Field label="Sub-strand">
                  <textarea
                    rows={2}
                    value={header.subStrand}
                    onChange={(e) => setH({ subStrand: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Content standard">
                    <textarea
                      rows={2}
                      value={header.contentStandard}
                      onChange={(e) => setH({ contentStandard: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Indicator">
                    <textarea
                      rows={2}
                      value={header.indicator}
                      onChange={(e) => setH({ indicator: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Performance indicator">
                    <textarea
                      rows={2}
                      value={header.performanceIndicator}
                      onChange={(e) =>
                        setH({ performanceIndicator: e.target.value })
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Core competencies">
                    <textarea
                      rows={2}
                      value={header.competencies}
                      onChange={(e) => setH({ competencies: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Teaching / learning resources">
                    <textarea
                      rows={2}
                      value={header.resources}
                      onChange={(e) => setH({ resources: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="New words">
                  <textarea
                    rows={2}
                    value={header.newWords}
                    onChange={(e) => setH({ newWords: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="References">
                  <textarea
                    rows={2}
                    value={header.references}
                    onChange={(e) => setH({ references: e.target.value })}
                    placeholder="e.g. Mathematics Curriculum Pg. 33"
                    className={inputCls}
                  />
                </Field>
              </div>
            </>
          ) : (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Go back to Step 1 and choose a subject first.
            </p>
          ))}

        {/* ── Step 3: Daily phases ── */}
        {step === 2 &&
          (subjectId ? (
            <div className="space-y-3">
              {days.map((d, i) => (
                <div
                  key={d.day}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    {d.day}
                  </h3>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Field label="Phase 1: Starter">
                      <textarea
                        rows={4}
                        value={d.starter}
                        onChange={(e) => updateDay(i, { starter: e.target.value })}
                        placeholder="Recap / opening activity…"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Phase 2: Main">
                      <textarea
                        rows={4}
                        value={d.main}
                        onChange={(e) => updateDay(i, { main: e.target.value })}
                        placeholder="New learning including assessment…"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Phase 3: Plenary / Reflection">
                      <textarea
                        rows={4}
                        value={d.plenary}
                        onChange={(e) => updateDay(i, { plenary: e.target.value })}
                        placeholder="Wrap-up, review, remedial…"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Go back to Step 1 and choose a subject first.
            </p>
          ))}

        {/* ── Step 4: Review & publish ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
              <div>
                <span className="label-caps">Class &amp; subject</span>
                <p className="text-sm text-slate-700">
                  {gradeName} · {subjectName || '—'}
                </p>
              </div>
              <div>
                <span className="label-caps">Term &amp; week</span>
                <p className="text-sm text-slate-700">
                  Term {term}, Week {week}
                </p>
              </div>
              <div>
                <span className="label-caps">Visibility</span>
                <p className="text-sm text-slate-700 capitalize">{visibility}</p>
              </div>
              <div>
                <span className="label-caps">Daily phases filled</span>
                <p className="text-sm text-slate-700">{filledDays} of 5 days</p>
              </div>
              <div className="sm:col-span-2">
                <span className="label-caps">Indicator</span>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {header.indicator || '—'}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Review the details above, then publish. You can go back to any step
              to make changes.
            </p>
          </div>
        )}

        {/* ── Step navigation ── */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              ← Back
            </button>
            <Link
              to="/portal/plans"
              className="rounded-md px-5 py-2 text-sm text-slate-500 hover:text-slate-800"
            >
              Cancel
            </Link>
          </div>
          {step < PLAN_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(PLAN_STEPS.length - 1, s + 1))}
              disabled={!subjectId}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy || !subjectId}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? 'Saving…' : planId ? 'Save changes' : 'Publish plan'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
