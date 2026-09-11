import { useLiveQuery } from 'dexie-react-hooks'
import { Play, Target } from 'lucide-react'
import db from '../../db/db'
import useDrilldownStore from '../../stores/drilldownStore'
import useQuizStore from '../../stores/quizStore'
import { useNavigate } from 'react-router-dom'

export default function ContentStandardList() {
  const subStrandId  = useDrilldownStore((s) => s.subStrandId)
  const setStandard  = useDrilldownStore((s) => s.setStandard)
  const classId      = useDrilldownStore((s) => s.classId)
  const subjectId    = useDrilldownStore((s) => s.subjectId)
  const startQuiz    = useQuizStore((s) => s.startQuiz)
  const navigate     = useNavigate()

  const standards = useLiveQuery(
    () => db.contentStandards
      .where('subStrandId').equals(subStrandId ?? '')
      .sortBy('code'),
    [subStrandId],
  )

  // Question counts + mastery per standard
  const meta = useLiveQuery(async () => {
    if (!standards?.length) return {}
    const result = {}
    await Promise.all(
      standards.map(async (cs) => {
        const qCount = await db.questions.where('csId').equals(cs.id).count()

        // Mastery: average score across all attempts for this standard
        const attempts = await db.attempts.where('csId').equals(cs.id).toArray()
        const mastery = attempts.length
          ? Math.round(
              (attempts.reduce((sum, a) => sum + a.score / a.total, 0) / attempts.length) * 100,
            )
          : null

        result[cs.id] = { qCount, mastery, attemptCount: attempts.length }
      }),
    )
    return result
  }, [standards])

  const handleStartQuiz = async (cs) => {
    setStandard(cs.id)
    // Load all questions for this standard from Dexie
    const questions = await db.questions.where('csId').equals(cs.id).toArray()
    startQuiz(questions, cs.id, classId, subjectId)
    navigate('/quiz-player')
  }

  if (!standards) return <ContentStandardSkeleton />

  return (
    <div className="p-4 space-y-3">
      <div className="px-1">
        <h2 className="text-[18px] font-bold text-navy">Content Standards</h2>
        <p className="text-[12px] text-slate-400 mt-0.5">
          {standards.length} standard{standards.length !== 1 ? 's' : ''}
        </p>
      </div>

      {standards.map((cs) => {
        const m = meta?.[cs.id]
        const mastery = m?.mastery   // null = never attempted
        return (
          <div
            key={cs.id}
            className="rounded-[18px] bg-white border border-slate-200 p-4 shadow-sm"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-extrabold font-mono px-2 py-0.5
                               rounded-full bg-navy text-accent">
                {cs.code}
              </span>
              {mastery != null && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full
                  ${mastery >= 70
                    ? 'bg-emerald-50 text-emerald-700'
                    : mastery >= 40
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-600'}`}>
                  {mastery}% mastery
                </span>
              )}
            </div>

            {/* Title */}
            <p className="mt-2.5 text-[13px] font-medium text-navy leading-snug">
              {cs.title}
            </p>

            {/* Core competencies */}
            {cs.coreCompetencies?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {cs.coreCompetencies.map((comp) => (
                  <span
                    key={comp}
                    className="text-[10px] px-2 py-0.5 rounded-full
                               bg-slate-100 text-slate-500 font-medium"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            )}

            {/* Mastery bar */}
            {mastery != null && (
              <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500
                    ${mastery >= 70 ? 'bg-correct' : mastery >= 40 ? 'bg-pending' : 'bg-wrong'}`}
                  style={{ width: `${mastery}%` }}
                />
              </div>
            )}

            {/* Footer row */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Target size={12} />
                <span>
                  {m?.qCount ?? '…'} question{m?.qCount !== 1 ? 's' : ''}
                  {m?.attemptCount
                    ? ` · ${m.attemptCount} attempt${m.attemptCount !== 1 ? 's' : ''}`
                    : ' · not yet attempted'}
                </span>
              </div>

              <button
                onClick={() => handleStartQuiz(cs)}
                disabled={!m?.qCount}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                           bg-navy text-accent text-[12px] font-bold
                           hover:bg-slate-800 active:scale-95
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all"
              >
                <Play size={11} fill="currentColor" />
                Start Quiz
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContentStandardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 rounded-[18px] bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}
