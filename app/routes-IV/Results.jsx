import { useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { RotateCcw, Home, ChevronRight, Trophy } from 'lucide-react'
import db from '../db/db'
import useDrilldownStore from '../stores/drilldownStore'
import useQuizStore from '../stores/quizStore'

/* ── Score ring (SVG conic-gradient via stroke-dasharray) ──────────────── */
function ScoreRing({ score, total }) {
  const pct        = total > 0 ? score / total : 0
  const radius     = 52
  const circumference = 2 * Math.PI * radius
  const dash       = circumference * pct

  const ringColour =
    pct >= 0.7 ? '#10B981' :   // correct
    pct >= 0.4 ? '#F59E0B' :   // pending
                 '#EF4444'     // wrong

  return (
    <div className="relative h-36 w-36 mx-auto">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r={radius} fill="none"
                stroke="#E2E8F0" strokeWidth="10" />
        {/* Progress */}
        <circle cx="60" cy="60" r={radius} fill="none"
                stroke={ringColour} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                className="transition-all duration-700" />
      </svg>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[32px] font-extrabold text-navy leading-none">
          {Math.round(pct * 100)}%
        </span>
        <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
          {score} / {total}
        </span>
      </div>
      {/* Trophy badge */}
      {pct >= 0.7 && (
        <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full
                        bg-accent flex items-center justify-center">
          <Trophy size={14} className="text-navy" />
        </div>
      )}
    </div>
  )
}

/* ── Breakdown bar for a single strand / sub-strand ─────────────────────── */
function BreakdownBar({ label, score, total }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const colour =
    pct >= 70 ? 'bg-correct' :
    pct >= 40 ? 'bg-pending' :
                'bg-wrong'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[12px] font-semibold">
        <span className="text-navy truncate max-w-[65%]">{label}</span>
        <span className="text-slate-400">{score}/{total} · {pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${colour} transition-all duration-500`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ── Main Results screen ─────────────────────────────────────────────────── */
export default function Results() {
  const location    = useLocation()
  const navigate    = useNavigate()
  const startQuiz   = useQuizStore((s) => s.startQuiz)
  const drilldown   = useDrilldownStore()

  // Attempt passed via navigation state from QuizPlayer
  const attempt = location.state?.attempt

  // Re-load the content standard metadata for context
  const standard = useLiveQuery(
    () => attempt?.csId ? db.contentStandards.get(attempt.csId) : null,
    [attempt?.csId],
  )

  // Group answers by difficulty for breakdown
  const questionMeta = useLiveQuery(async () => {
    if (!attempt?.answers?.length) return {}
    const ids = attempt.answers.map((a) => a.questionId)
    const qs  = await db.questions.bulkGet(ids)
    const map = {}
    qs.forEach((q, i) => { if (q) map[q.id] = { ...q, ...attempt.answers[i] } })
    return map
  }, [attempt])

  if (!attempt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-4 p-6">
        <p className="text-slate-400 text-[14px]">No results to show yet.</p>
        <button onClick={() => navigate('/')}
                className="px-5 py-2.5 rounded-full bg-navy text-accent font-bold text-[13px]">
          Browse Curriculum
        </button>
      </div>
    )
  }

  const { score, total, timeSeconds, answers: answerLog } = attempt
  const mm = String(Math.floor(timeSeconds / 60)).padStart(2, '0')
  const ss = String(timeSeconds % 60).padStart(2, '0')

  // Difficulty breakdown
  const diffBreakdown = { easy: [0, 0], medium: [0, 0], hard: [0, 0] }
  answerLog.forEach((a) => {
    const q = questionMeta?.[a.questionId]
    if (!q) return
    const diff = q.difficulty ?? 'medium'
    diffBreakdown[diff][1]++
    if (a.correct) diffBreakdown[diff][0]++
  })

  // Weak questions (answered wrong)
  const weakOnes = answerLog.filter((a) => !a.correct)

  const handleRetry = async () => {
    const questions = await db.questions.where('csId').equals(attempt.csId).toArray()
    startQuiz(questions, attempt.csId, attempt.classId, attempt.subjectId)
    navigate('/quiz-player')
  }

  return (
    <div className="min-h-full bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-10">

        {/* Header */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Quiz Complete
          </p>
          <h1 className="text-[22px] font-extrabold text-navy mt-0.5 leading-tight">
            {standard?.code ?? '…'} Results
          </h1>
          {standard && (
            <p className="text-[12px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
              {standard.title}
            </p>
          )}
        </div>

        {/* Score ring */}
        <div className="rounded-[20px] bg-white border border-slate-200 p-6">
          <ScoreRing score={score} total={total} />

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { k: 'Correct',  v: score },
              { k: 'Time',     v: `${mm}:${ss}` },
              { k: 'Accuracy', v: `${Math.round((score / total) * 100)}%` },
            ].map(({ k, v }) => (
              <div key={k} className="rounded-[12px] bg-slate-50 border border-slate-100
                                      p-3 text-center">
                <p className="text-[18px] font-extrabold text-navy leading-none">{v}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{k}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty breakdown */}
        <div className="rounded-[20px] bg-white border border-slate-200 p-5 space-y-3">
          <h3 className="text-[13px] font-bold text-navy">Breakdown by Difficulty</h3>
          {Object.entries(diffBreakdown).map(([diff, [sc, tot]]) =>
            tot > 0 ? (
              <BreakdownBar
                key={diff}
                label={diff.charAt(0).toUpperCase() + diff.slice(1)}
                score={sc}
                total={tot}
              />
            ) : null,
          )}
        </div>

        {/* Weak areas */}
        {weakOnes.length > 0 && (
          <div className="rounded-[20px] bg-amber-50 border border-amber-200 p-5 space-y-2.5">
            <h3 className="text-[13px] font-bold text-amber-800">
              Review These ({weakOnes.length})
            </h3>
            {weakOnes.slice(0, 5).map((a) => {
              const q = questionMeta?.[a.questionId]
              return q ? (
                <div key={a.questionId}
                     className="rounded-[10px] bg-white border border-amber-200 p-3">
                  <p className="text-[12px] font-medium text-navy leading-snug line-clamp-2">
                    {q.stem}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                    {q.difficulty} · {q.tags?.join(', ')}
                  </p>
                </div>
              ) : null
            })}
            {weakOnes.length > 5 && (
              <p className="text-[11px] text-amber-600 font-medium text-center">
                + {weakOnes.length - 5} more
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 h-12 rounded-full bg-navy text-accent
                       font-bold text-[14px] flex items-center justify-center gap-2
                       active:scale-[0.98] transition-transform"
          >
            <RotateCcw size={16} /> Retry
          </button>
          <button
            onClick={() => { drilldown.resetAll(); navigate('/') }}
            className="flex-1 h-12 rounded-full border-2 border-navy text-navy
                       font-bold text-[14px] flex items-center justify-center gap-2
                       active:scale-[0.98] transition-transform"
          >
            <Home size={16} /> New Quiz
          </button>
        </div>

        {/* Next standard nudge */}
        {standard && (
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-between
                       rounded-[16px] bg-white border border-slate-200
                       p-4 text-left hover:border-navy/20 transition-colors"
          >
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Continue learning</p>
              <p className="text-[13px] font-bold text-navy mt-0.5">
                Browse more standards
              </p>
            </div>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </button>
        )}
      </div>
    </div>
  )
}
