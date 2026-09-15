import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum, useGrades } from '../hooks/useCurriculum'

const TERMS = [1, 2, 3]
const TEACHING_WEEKS = 12

// B1 keeps its original key format so earlier ticks are preserved
const keyFor = (grade, subjectId, term) =>
  grade === 'B1' ? `${subjectId}_T${term}` : `${grade}_${subjectId}_T${term}`

export default function Progress() {
  const { user } = useAuth()
  const grades = useGrades()
  const [grade, setGrade] = useState('B1')
  const { subjects, loading } = useCurriculum(grade)
  const [term, setTerm] = useState(1)
  const [weeks, setWeeks] = useState(null) // { 'mathematics_T1': [1,2,…] }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'progress', user.uid)).then((snap) =>
      setWeeks(snap.exists() ? (snap.data().weeks ?? {}) : {}),
    )
  }, [user])

  async function toggle(subjectId, week) {
    const k = keyFor(grade, subjectId, term)
    const current = weeks[k] ?? []
    const next = current.includes(week)
      ? current.filter((w) => w !== week)
      : [...current, week].sort((a, b) => a - b)
    const updated = { ...weeks, [k]: next }
    setWeeks(updated)
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'progress', user.uid),
        { weeks: { [k]: next }, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading || weeks === null)
    return <p className="text-slate-400">Loading progress…</p>

  const totalTaught = subjects.reduce(
    (sum, s) => sum + (weeks[keyFor(grade, s.id, term)]?.length ?? 0),
    0,
  )
  const totalWeeks = subjects.length * TEACHING_WEEKS

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">
            Term Progress Tracker
          </h1>
          <p className="page-subtitle">
            Tick each week as you teach it, for any class.
            {saving && <span className="ml-2 text-slate-400">Saving…</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {TERMS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTerm(t)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                term === t
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Term {t}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-6 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
        Term {term}: {totalTaught} of {totalWeeks} subject-weeks taught (
        {Math.round((totalTaught / totalWeeks) * 100)}%).
      </p>

      <div className="space-y-4">
        {subjects.map((s) => {
          const taught = weeks[keyFor(grade, s.id, term)] ?? []
          const nextWeek =
            Array.from({ length: TEACHING_WEEKS }, (_, i) => i + 1).find(
              (w) => !taught.includes(w),
            ) ?? null
          const pct = Math.round((taught.length / TEACHING_WEEKS) * 100)
          return (
            <div key={s.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{s.name}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {taught.length}/{TEACHING_WEEKS} weeks · {pct}%
                  </span>
                  {nextWeek && (
                    <Link
                      to={`/portal/plans/new?subject=${s.id}&term=${term}&week=${nextWeek}&grade=${grade}`}
                      className="shrink-0 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                    >
                      Plan Week {nextWeek} →
                    </Link>
                  )}
                </div>
              </div>
              {/* progress bar */}
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {Array.from({ length: TEACHING_WEEKS }, (_, i) => i + 1).map(
                  (w) => {
                    const done = taught.includes(w)
                    const isNext = w === nextWeek
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => toggle(s.id, w)}
                        title={`Week ${w} — ${done ? 'taught' : 'not yet taught'}`}
                        className={`h-7 w-7 rounded-md text-[11px] font-semibold transition sm:h-8 sm:w-8 sm:text-xs ${
                          done
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : isNext
                              ? 'border-2 border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              : 'border border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {done ? '✓' : w}
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
