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
import { useSchemes } from '../hooks/useSchemes'
import { buildAutoScheme } from '../lib/schemeAuto'
import ConfirmModal from '../components/ConfirmModal'

const TERMS = [1, 2, 3]
const SPECIAL_LABELS = ['REVISION', 'EXAMINATION', 'VACATION']

const uniq = (arr) => [...new Set(arr.filter(Boolean))]
const mergeLines = (text, extra) =>
  uniq((text ? text.split('\n') : []).concat(extra)).join('\n')

function lessonRow(week = '') {
  return {
    week: String(week),
    kind: 'lesson',
    strand: '',
    subStrand: '',
    contentStandards: '',
    indicators: '',
    resources: '',
    indicatorIds: [],
  }
}

function specialRow(week, label) {
  return { ...lessonRow(week), kind: 'special', label }
}

/** Aggregate day-by-day scheduled lessons into one scheme row per week. */
function rowsFromSchedule(lessons) {
  const byWeek = new Map()
  for (const l of lessons) {
    if (!byWeek.has(l.week)) byWeek.set(l.week, [])
    byWeek.get(l.week).push(l)
  }
  const rows = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, ls]) => ({
      ...lessonRow(week),
      strand: uniq(ls.map((l) => l.strandName)).join('\n'),
      subStrand: uniq(ls.map((l) => l.subStrandName)).join('\n'),
      contentStandards: uniq(ls.map((l) => l.contentStandardCode)).join('\n'),
      indicators: uniq(ls.map((l) => l.indicatorCode)).join('\n'),
      resources: uniq(ls.map((l) => l.resources)).join('\n'),
      indicatorIds: uniq(ls.map((l) => l.indicatorId)),
    }))
  const next = rows.length
    ? Math.max(...rows.map((r) => Number(r.week) || 0)) + 1
    : 1
  rows.push(
    specialRow(next, 'REVISION'),
    specialRow(next + 1, 'EXAMINATION'),
    specialRow(next + 2, 'VACATION'),
  )
  return rows
}

/** Blank scheme skeleton matching the printed sample (no schedule extracted yet). */
function emptyTermRows(term) {
  const teaching = term === 1 ? 10 : 11
  const rows = Array.from({ length: teaching }, (_, i) => lessonRow(i + 1))
  if (term === 1) {
    rows.push(specialRow(11, 'REVISION'), specialRow('12 & 13', 'EXAMINATION'))
  } else {
    rows.push(
      specialRow(12, 'REVISION'),
      specialRow(13, 'EXAMINATION'),
      specialRow(14, 'VACATION'),
    )
  }
  return rows
}

const cellCls =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none'

export default function ForecastForm() {
  const { forecastId } = useParams() // present in edit mode
  const [searchParams] = useSearchParams()
  const fromId = searchParams.get('from') // present when cloning a template
  const { user, profile } = useAuth()
  const grades = useGrades()
  const [grade, setGrade] = useState('B1')
  const { subjects, indicators } = useCurriculum(grade)
  const { lessons } = useSchedules(grade)
  const navigate = useNavigate()

  const [subjectId, setSubjectId] = useState('')
  const [term, setTerm] = useState(1)
  const [rows, setRows] = useState([])
  const [notes, setNotes] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [prefilled, setPrefilled] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [legacy, setLegacy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // The pre-generated scheme for this subject/term, straight from the lesson
  // library. Unavailable for subjects with no scheduled lessons.
  const official = useSchemes(grade, subjectId, term)

  // Clone an existing scheme as a starting template
  useEffect(() => {
    if (forecastId || !fromId) return
    getDoc(doc(db, 'weekly_forecasts', fromId)).then((snap) => {
      if (!snap.exists()) return
      const f = snap.data()
      if (f.kind !== 'scheme') return
      setGrade(f.grade ?? 'B1')
      setSubjectId(f.subjectId)
      setTerm(f.term)
      setRows(f.rows ?? [])
      setNotes(f.notes ?? '')
      setPrefilled(true)
    })
  }, [forecastId, fromId])

  // Load existing scheme in edit mode
  useEffect(() => {
    if (!forecastId) return
    getDoc(doc(db, 'weekly_forecasts', forecastId)).then((snap) => {
      if (!snap.exists()) return setNotFound(true)
      const f = snap.data()
      if (f.kind !== 'scheme') return setLegacy(true)
      setGrade(f.grade ?? 'B1')
      setSubjectId(f.subjectId)
      setTerm(f.term)
      setRows(f.rows ?? [])
      setNotes(f.notes ?? '')
      setVisibility(f.visibility)
      setPrefilled(true)
    })
  }, [forecastId])

  const subject = subjects.find((s) => s.id === subjectId)
  const termLessons = useMemo(
    () => lessons.filter((l) => l.subjectId === subjectId && l.term === term),
    [lessons, subjectId, term],
  )
  const subjectIndicators = useMemo(
    () => indicators.filter((i) => i.subjectId === subjectId),
    [indicators, subjectId],
  )

  // Pre-fill from the curriculum schedule (new schemes only).
  // "Adjust state during render" pattern — see react.dev/learn/you-might-not-need-an-effect
  const [lastPrefill, setLastPrefill] = useState(null)
  const prefillKey = `${subjectId}|${term}|${termLessons.length}`
  if (!forecastId && !prefilled && subjectId && prefillKey !== lastPrefill) {
    setLastPrefill(prefillKey)
    setRows(
      termLessons.length > 0 ? rowsFromSchedule(termLessons) : emptyTermRows(term),
    )
  }

  function updateRow(i, patch) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function removeRow(i) {
    setRows((rs) => rs.filter((_, j) => j !== i))
  }

  function addWeekRow() {
    setRows((rs) => {
      const nums = rs.map((r) => Number(r.week)).filter((n) => !isNaN(n))
      return [...rs, lessonRow(nums.length ? Math.max(...nums) + 1 : 1)]
    })
  }

  function addSpecialRow() {
    setRows((rs) => [...rs, specialRow('', 'REVISION')])
  }

  function addIndicatorToRow(i, indicatorId) {
    const ind = subjectIndicators.find((x) => x.id === indicatorId)
    if (!ind) return
    setRows((rs) =>
      rs.map((r, j) =>
        j === i
          ? {
              ...r,
              strand: mergeLines(r.strand, ind.strandName),
              subStrand: mergeLines(r.subStrand, ind.subStrandName),
              contentStandards: mergeLines(
                r.contentStandards,
                ind.contentStandardCode,
              ),
              indicators: mergeLines(r.indicators, ind.code),
              resources: mergeLines(r.resources, ind.resources),
              indicatorIds: uniq([...(r.indicatorIds ?? []), ind.id]),
            }
          : r,
      ),
    )
  }

  function handleAutoFill() {
    const generated = buildAutoScheme({ indicators, subjectId, term })
    const apply = () => {
      setRows(generated)
      setPrefilled(true) // stop the schedule prefill from overwriting
    }
    const hasContent = rows.some(
      (r) =>
        r.kind === 'lesson' &&
        ((r.indicatorIds?.length ?? 0) > 0 || r.strand || r.indicators),
    )
    if (hasContent) {
      setConfirm({
        title: 'Replace the current weeks?',
        body: 'Auto-fill will overwrite the week rows with content standards spread across the term. Special rows are kept.',
        confirmLabel: 'Auto-fill',
        onConfirm: apply,
      })
    } else {
      apply()
    }
  }

  /** Load the pre-generated termly scheme instead of spreading standards evenly. */
  function handleLoadOfficial() {
    if (!official.available) return
    const apply = () => {
      // Copy so editing here never mutates the module-level cache.
      setRows(official.rows.map((r) => ({ ...r })))
      setPrefilled(true) // stop the schedule prefill from overwriting
    }
    const hasContent = rows.some(
      (r) =>
        r.kind === 'lesson' &&
        ((r.indicatorIds?.length ?? 0) > 0 || r.strand || r.indicators),
    )
    if (hasContent) {
      setConfirm({
        title: 'Replace the current weeks?',
        body: 'This loads the official scheme for this subject and term — the same weeks your lesson plans actually cover. Special rows are kept.',
        confirmLabel: 'Load official scheme',
        onConfirm: apply,
      })
    } else {
      apply()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const payload = {
      kind: 'scheme',
      subjectId,
      grade,
      term,
      rows,
      notes,
      visibility,
      // School-shared schemes carry the author's school for rules + queries.
      ...(visibility === 'school' && profile?.schoolId
        ? { schoolId: profile.schoolId }
        : {}),
      updatedAt: serverTimestamp(),
    }
    try {
      if (forecastId) {
        await updateDoc(doc(db, 'weekly_forecasts', forecastId), payload)
        navigate(`/portal/forecasts/${forecastId}`)
      } else {
        const ref = await addDoc(collection(db, 'weekly_forecasts'), {
          ...payload,
          authorId: user.uid,
          authorName: profile?.name || user.displayName || 'Teacher',
          createdAt: serverTimestamp(),
        })
        navigate(`/portal/forecasts/${ref.id}`)
      }
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (notFound) return <p className="text-slate-500">Scheme not found.</p>
  if (legacy)
    return (
      <p className="text-slate-500">
        This document was created with an older version of the app and can no
        longer be edited. Please create a new scheme of learning.
      </p>
    )

  return (
    <div className="mx-auto max-w-5xl">
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/forecasts" className="text-indigo-600 hover:underline">
          Schemes of Learning
        </Link>{' '}
        / {forecastId ? 'Edit' : 'New'}
      </nav>
      <h1 className="page-title">
        {forecastId ? 'Edit scheme of learning' : 'New scheme of learning'}
      </h1>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-wrap gap-3">
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
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="public">Public — visible to all teachers</option>
            <option value="private">Private — only me</option>
            {(profile?.schoolId || visibility === 'school') && (
              <option value="school">My school only</option>
            )}
          </select>
        </div>

        {subjectId && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
            <button
              type="button"
              onClick={handleAutoFill}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              ✨ Auto-fill weeks from curriculum
            </button>
            {official.available && (
              <button
                type="button"
                onClick={handleLoadOfficial}
                className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                📋 Load official scheme
              </button>
            )}
            <span className="text-xs text-slate-500">
              {official.available
                ? `An official scheme is available for ${subject?.name} Term ${term} — it matches the weeks your lesson plans actually cover. Auto-fill instead spreads content standards evenly across the term.`
                : `Spreads ${subject?.name} content standards for Term ${term} across the teaching weeks — adjust anything before saving.`}
            </span>
          </div>
        )}

        {fromId && prefilled && (
          <p className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
            Copied from another member's scheme — adapt it and publish as your
            own.
          </p>
        )}
        {!fromId && subjectId && subject?.hasSchedule && termLessons.length > 0 && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Pre-filled from the {subject.name} scheme of learning for Term{' '}
            {term}. Adjust anything before saving.
          </p>
        )}
        {!fromId && subjectId && !subject?.hasSchedule && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No extracted schedule for {subject?.name} yet — use the indicator
            picker on each week and the details will fill in automatically.
          </p>
        )}

        {subjectId && (
          <div className="space-y-3">
            <div className="hidden gap-2 px-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase md:grid md:grid-cols-[3rem_1fr_1fr_6rem_6rem_1fr_2rem]">
              <span>Week</span>
              <span>Strand</span>
              <span>Sub-strand</span>
              <span>Content std.</span>
              <span>Indicators</span>
              <span>Resources</span>
              <span />
            </div>
            {rows.map((row, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                {row.kind === 'special' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={row.week}
                      onChange={(e) => updateRow(i, { week: e.target.value })}
                      placeholder="Week"
                      className={`${cellCls} w-20`}
                      style={{ width: '5rem' }}
                    />
                    <select
                      value={row.label}
                      onChange={(e) => updateRow(i, { label: e.target.value })}
                      className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-semibold"
                    >
                      {SPECIAL_LABELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="ml-auto text-xs text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 md:grid-cols-[3rem_1fr_1fr_6rem_6rem_1fr_2rem]">
                      <input
                        value={row.week}
                        onChange={(e) => updateRow(i, { week: e.target.value })}
                        placeholder="Wk"
                        className={cellCls}
                      />
                      <textarea
                        rows={2}
                        value={row.strand}
                        onChange={(e) => updateRow(i, { strand: e.target.value })}
                        placeholder="Strand"
                        className={cellCls}
                      />
                      <textarea
                        rows={2}
                        value={row.subStrand}
                        onChange={(e) =>
                          updateRow(i, { subStrand: e.target.value })
                        }
                        placeholder="Sub-strand"
                        className={cellCls}
                      />
                      <textarea
                        rows={2}
                        value={row.contentStandards}
                        onChange={(e) =>
                          updateRow(i, { contentStandards: e.target.value })
                        }
                        placeholder="B1.…"
                        className={cellCls}
                      />
                      <textarea
                        rows={2}
                        value={row.indicators}
                        onChange={(e) =>
                          updateRow(i, { indicators: e.target.value })
                        }
                        placeholder="B1.…"
                        className={cellCls}
                      />
                      <textarea
                        rows={2}
                        value={row.resources}
                        onChange={(e) =>
                          updateRow(i, { resources: e.target.value })
                        }
                        placeholder="Resources"
                        className={cellCls}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        title="Remove week"
                        className="text-xs text-slate-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                    <select
                      value=""
                      onChange={(e) => addIndicatorToRow(i, e.target.value)}
                      className="mt-2 w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-500"
                    >
                      <option value="">
                        + Add indicator (fills strand, standard &amp; resources)…
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
                  </>
                )}
              </div>
            ))}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={addWeekRow}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                + Add week
              </button>
              <button
                type="button"
                onClick={addSpecialRow}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                + Add revision / exam / vacation row
              </button>
            </div>
          </div>
        )}

        <textarea
          rows={3}
          placeholder="Notes for the term (optional)…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy || !subjectId}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : forecastId ? 'Save changes' : 'Publish scheme'}
          </button>
          <Link
            to="/portal/forecasts"
            className="rounded-md border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
