import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Play, ChevronRight, Flame, Target, BookOpen } from 'lucide-react'
import db from '../db/db'
import useDrilldownStore from '../stores/drilldownStore'
import useQuizStore from '../stores/quizStore'
import BreadcrumbStepper from '../components/layout/BreadcrumbStepper'
import ClassGrid           from './drilldown/ClassGrid'
import SubjectGrid         from './drilldown/SubjectGrid'
import StrandList          from './drilldown/StrandList'
import SubStrandList       from './drilldown/SubStrandList'
import ContentStandardList from './drilldown/ContentStandardList'
import { currentStreak, weakStandards } from '../lib/analytics'

/* ── Continue Learning card ─────────────────────────────────────────── */
function ContinueCard({ item, onStart }) {
  const pctColour =
    item.pct >= 70 ? 'text-emerald-600' :
    item.pct >= 40 ? 'text-amber-600'   : 'text-red-500'

  const barColour =
    item.pct >= 70 ? 'bg-emerald-500' :
    item.pct >= 40 ? 'bg-pending'     : 'bg-wrong'

  return (
    <div className="shrink-0 w-[220px] rounded-[18px] bg-white border border-slate-200
                    p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-extrabold font-mono px-2 py-0.5
                         rounded-full bg-navy text-accent">
          {item.standard?.code ?? item.csId}
        </span>
        <span className={`text-[11px] font-bold ${pctColour}`}>{item.pct}%</span>
      </div>

      <p className="text-[12px] font-semibold text-navy leading-snug line-clamp-2 flex-1">
        {item.standard?.title ?? item.csId}
      </p>

      {/* Mastery bar */}
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColour}`}
             style={{ width: `${item.pct}%` }} />
      </div>

      <button
        onClick={() => onStart(item)}
        className="w-full h-9 rounded-full bg-navy text-accent font-bold
                   text-[12px] flex items-center justify-center gap-1.5
                   active:scale-95 transition-transform"
      >
        <Play size={11} fill="currentColor" /> Practice
      </button>
    </div>
  )
}

/* ── Learner Path screen (drill-down + dashboard) ───────────────────── */
export default function LearnerPath() {
  const navigate   = useNavigate()
  const startQuiz  = useQuizStore((s) => s.startQuiz)
  const drilldown  = useDrilldownStore()
  const { classId, subjectId, strandId, subStrandId } = drilldown

  // Breadcrumb labels
  const classLabel = useLiveQuery(
    () => classId   ? db.classes.get(classId).then((r)   => r?.code)  : null, [classId],
  )
  const subjectLabel = useLiveQuery(
    () => subjectId ? db.subjects.get(subjectId).then((r) => r?.name)  : null, [subjectId],
  )
  const strandLabel = useLiveQuery(
    () => strandId  ? db.strands.get(strandId).then((r)  => r?.name)   : null, [strandId],
  )
  const subStrandLabel = useLiveQuery(
    () => subStrandId ? db.subStrands.get(subStrandId).then((r) => r?.name) : null, [subStrandId],
  )

  const breadcrumbs = [
    classId      && { label: classLabel      ?? classId,      level: 'class'     },
    subjectId    && { label: subjectLabel    ?? subjectId,    level: 'subject'   },
    strandId     && { label: strandLabel     ?? strandId,     level: 'strand'    },
    subStrandId  && { label: subStrandLabel  ?? subStrandId,  level: 'subStrand' },
  ].filter(Boolean)

  // Analytics — only load when we have a class selected
  const activeClass = classId ?? 'jhs1'
  const streak = useLiveQuery(() => currentStreak(),             [])
  const weak   = useLiveQuery(() => weakStandards(activeClass),  [activeClass])
  const totalQ = useLiveQuery(() => db.questions.count(),        [])

  const handleContinue = async (item) => {
    const questions = await db.questions.where('csId').equals(item.csId).toArray()
    startQuiz(questions, item.csId, item.standard?.classId ?? activeClass, item.standard?.subjectId ?? '')
    navigate('/quiz-player')
  }

  const renderLevel = () => {
    if (!classId)      return <ClassGrid />
    if (!subjectId)    return <SubjectGrid />
    if (!strandId)     return <StrandList />
    if (!subStrandId)  return <SubStrandList />
    return                    <ContentStandardList />
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Dashboard (only on root level, no class selected yet) ─────── */}
      {!classId && (
        <div className="px-4 pt-5 pb-2 space-y-4">

          {/* Greeting + stats */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-extrabold text-navy leading-tight">
                NACCA QuizBank
              </h2>
              <p className="text-[12px] text-slate-400 mt-0.5">
                Ghana · B7-B9 · {totalQ ?? '…'} questions offline
              </p>
            </div>
            {streak !== undefined && streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              bg-amber-50 border border-amber-200">
                <Flame size={14} className="text-amber-500" />
                <span className="text-[12px] font-bold text-amber-700">
                  {streak} day{streak !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Continue Learning cards */}
          {weak?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-navy flex items-center gap-1.5">
                  <Target size={13} /> Continue Learning
                </p>
                <span className="text-[10px] text-slate-400">Lowest mastery first</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {weak.map((item) => (
                  <ContinueCard key={item.csId} item={item} onStart={handleContinue} />
                ))}
              </div>
            </div>
          )}

          {/* Start fresh nudge when no attempts yet */}
          {weak?.length === 0 && (
            <div className="rounded-[16px] bg-navy/5 border border-navy/10 p-4
                            flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-navy flex items-center
                              justify-center shrink-0">
                <BookOpen size={18} className="text-accent" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-navy">Start your first quiz</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pick a class below to browse the curriculum.
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Browse Curriculum
            </p>
          </div>
        </div>
      )}

      {/* ── Breadcrumb (sticky once drilling down) ───────────────────── */}
      {breadcrumbs.length > 0 && (
        <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm
                        border-b border-slate-200">
          <BreadcrumbStepper items={breadcrumbs} />
        </div>
      )}

      {/* ── Drill-down level ─────────────────────────────────────────── */}
      {renderLevel()}
    </div>
  )
}
