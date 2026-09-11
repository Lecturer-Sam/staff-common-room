import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { Download, Target, Clock, ChartLine } from 'lucide-react'
import db from '../db/db'
import useDrilldownStore from '../stores/drilldownStore'
import {
  masteryMapForClass,
  currentStreak,
  recentAttempts,
  subjectRadarData,
} from '../lib/analytics'

/* ── Mastery colour helpers ─────────────────────────────────────────── */
function masteryColour(pct) {
  if (pct === null)  return 'bg-slate-100 border-slate-200'
  if (pct >= 70)     return 'bg-emerald-100 border-emerald-300'
  if (pct >= 40)     return 'bg-amber-100 border-amber-300'
  return                    'bg-red-100 border-red-300'
}
function masteryText(pct) {
  if (pct === null) return 'text-slate-300'
  if (pct >= 70)    return 'text-emerald-700'
  if (pct >= 40)    return 'text-amber-700'
  return                   'text-red-600'
}

/* ── Mastery grid ───────────────────────────────────────────────────── */
function MasteryGrid({ classId }) {
  const standards = useLiveQuery(
    () => db.contentStandards.where('classId').equals(classId).sortBy('code'),
    [classId],
  )
  const masteryMap = useLiveQuery(
    () => masteryMapForClass(classId),
    [classId],
  )

  if (!standards || !masteryMap) {
    return <div className="h-32 rounded-[14px] bg-slate-100 animate-pulse" />
  }

  if (!standards.length) {
    return <p className="text-[12px] text-slate-400 text-center py-6">No standards found.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {standards.map((cs) => {
        const pct = masteryMap[cs.id] ?? null
        return (
          <div
            key={cs.id}
            title={`${cs.code}: ${cs.title}\n${pct !== null ? pct + '% mastery' : 'Not attempted'}`}
            className={`relative h-10 w-10 rounded-lg border-2 flex items-center
                        justify-center text-[9px] font-extrabold cursor-default
                        ${masteryColour(pct)} ${masteryText(pct)}`}
          >
            {pct !== null ? `${pct}` : '—'}
          </div>
        )
      })}
    </div>
  )
}

/* ── Attempt history row ────────────────────────────────────────────── */
function AttemptRow({ attempt }) {
  const fmt = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })
  }
  const mm = String(Math.floor(attempt.timeSeconds / 60)).padStart(2, '0')
  const ss = String(attempt.timeSeconds % 60).padStart(2, '0')
  const pctColour =
    attempt.pct >= 70 ? 'text-emerald-600' :
    attempt.pct >= 40 ? 'text-amber-600'   : 'text-red-500'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {/* Score ring mini */}
      <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center
                       shrink-0 font-extrabold text-[11px]
                       ${attempt.pct >= 70
                         ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                         : attempt.pct >= 40
                         ? 'border-amber-400 bg-amber-50 text-amber-700'
                         : 'border-red-400 bg-red-50 text-red-600'}`}>
        {attempt.pct}%
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-navy truncate">
          {attempt.standard?.code ?? attempt.csId}
        </p>
        <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
          {attempt.standard?.title ?? ''}
        </p>
      </div>

      <div className="text-right shrink-0 space-y-0.5">
        <p className={`text-[12px] font-bold ${pctColour}`}>
          {attempt.score}/{attempt.total}
        </p>
        <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
          <Clock size={10} />{mm}:{ss} · {fmt(attempt.date)}
        </p>
      </div>
    </div>
  )
}

/* ── CSV export for attempts ────────────────────────────────────────── */
async function exportAttempts() {
  const all = await db.attempts.toArray()
  const rows = all.map((a) => ({
    date: a.date, csId: a.csId, classId: a.classId, subjectId: a.subjectId,
    score: a.score, total: a.total,
    pct: Math.round((a.score / a.total) * 100),
    timeSeconds: a.timeSeconds,
  }))
  const header = Object.keys(rows[0] ?? {}).join(',')
  const body   = rows.map((r) => Object.values(r).join(',')).join('\n')
  const blob   = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href = url
  a.download = `nacca_results_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Main Results & Insights screen ──────────────────────────────────── */
export default function ResultsInsights() {
  const classId    = useDrilldownStore((s) => s.classId) ?? 'jhs1'
  const [tab, setTab] = useState('grid') // 'grid' | 'history' | 'radar'

  // Live data
  const streak   = useLiveQuery(() => currentStreak(), [])
  const attempts = useLiveQuery(() => recentAttempts(50), [])
  const radar    = useLiveQuery(() => subjectRadarData(classId), [classId])
  const total    = useLiveQuery(() => db.attempts.count(), [])
  const avgPct   = useLiveQuery(async () => {
    const all = await db.attempts.toArray()
    if (!all.length) return null
    return Math.round(all.reduce((s, a) => s + (a.score / a.total) * 100, 0) / all.length)
  }, [])

  // Classes for switcher
  const classes = useLiveQuery(() => db.classes.orderBy('order').toArray(), [])
  const setClass = useDrilldownStore((s) => s.setClass)

  const TABS = [
    { id: 'grid',    label: 'Mastery Grid', icon: Target    },
    { id: 'history', label: 'History',      icon: Clock     },
    { id: 'radar',   label: 'Radar',        icon: ChartLine },
  ]

  return (
    <div className="min-h-full bg-surface">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5 pb-10">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-navy">Results & Insights</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">Your learning journey</p>
          </div>
          <button
            onClick={exportAttempts}
            disabled={!total}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       border border-slate-200 text-[11px] font-semibold text-slate-600
                       hover:border-navy/30 disabled:opacity-40 transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: 'Streak',   v: streak  !== undefined ? `${streak}🔥` : '…' },
            { k: 'Quizzes',  v: total   ?? '…' },
            { k: 'Avg Score',v: avgPct  !== null && avgPct !== undefined ? `${avgPct}%` : '—' },
          ].map(({ k, v }) => (
            <div key={k} className="rounded-[14px] bg-white border border-slate-200 p-3 text-center">
              <p className="text-[20px] font-extrabold text-navy leading-none">{v}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{k}</p>
            </div>
          ))}
        </div>

        {/* Class switcher */}
        {classes && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setClass(cls.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold
                            border transition-all
                            ${classId === cls.id
                              ? 'bg-navy text-accent border-navy'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {cls.code}
              </button>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-100 rounded-full p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5
                          py-2 rounded-full text-[12px] font-semibold transition-all
                          ${tab === id
                            ? 'bg-white text-navy shadow-sm'
                            : 'text-slate-500 hover:text-navy'}`}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* ── Mastery Grid ─────────────────────────────────────────────── */}
        {tab === 'grid' && (
          <div className="space-y-3">
            <div className="rounded-[20px] bg-white border border-slate-200 p-5">
              <p className="text-[12px] font-bold text-navy mb-3">
                All Content Standards · {classId.toUpperCase()}
              </p>
              <MasteryGrid classId={classId} />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[11px] font-medium px-1">
              {[
                { label: '≥70% Mastered',     cls: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
                { label: '40–69% Progressing', cls: 'bg-amber-100   border-amber-300   text-amber-700'  },
                { label: '<40% Needs work',    cls: 'bg-red-100     border-red-300     text-red-600'    },
                { label: 'Not attempted',      cls: 'bg-slate-100   border-slate-200   text-slate-400'  },
              ].map(({ label, cls }) => (
                <span key={label} className={`flex items-center gap-1.5 px-2.5 py-1
                                              rounded-full border ${cls}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── History ─────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="rounded-[20px] bg-white border border-slate-200 px-4">
            {!attempts?.length ? (
              <p className="text-[12px] text-slate-400 text-center py-8">
                No attempts yet. Complete a quiz to see your history.
              </p>
            ) : (
              attempts.map((a) => <AttemptRow key={a.id} attempt={a} />)
            )}
          </div>
        )}

        {/* ── Radar chart ──────────────────────────────────────────────── */}
        {tab === 'radar' && (
          <div className="rounded-[20px] bg-white border border-slate-200 p-5">
            <p className="text-[12px] font-bold text-navy mb-4">
              Subject Mastery · {classId.toUpperCase()}
            </p>
            {!radar?.length ? (
              <p className="text-[12px] text-slate-400 text-center py-8">
                Complete quizzes across subjects to see the radar.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radar} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                  />
                  <Radar
                    name="Mastery"
                    dataKey="pct"
                    stroke="#0F172A"
                    fill="#FACC15"
                    fillOpacity={0.35}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Mastery']}
                    contentStyle={{
                      fontSize: 12, borderRadius: 10,
                      border: '1px solid #E2E8F0',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
