import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import db from '../../db/db'
import useDrilldownStore from '../../stores/drilldownStore'

/** Accent colours cycled across class cards */
const CARD_ACCENTS = ['bg-indigo-50', 'bg-violet-50', 'bg-amber-50']

export default function ClassGrid() {
  const setClass = useDrilldownStore((s) => s.setClass)

  const classes = useLiveQuery(
    () => db.classes.orderBy('order').toArray(),
    [],
  )

  // For each class get a live question count
  const counts = useLiveQuery(async () => {
    if (!classes) return {}
    const result = {}
    await Promise.all(
      classes.map(async (cls) => {
        result[cls.id] = await db.questions.where('classId').equals(cls.id).count()
      }),
    )
    return result
  }, [classes])

  if (!classes) {
    return <ClassGridSkeleton />
  }

  return (
    <div className="p-4 space-y-3">
      <div className="px-1">
        <h2 className="text-[18px] font-bold text-navy">Select Your Class</h2>
        <p className="text-[12px] text-slate-400 mt-0.5">
          Junior High School · Ghana NaCCA curriculum
        </p>
      </div>

      {classes.map((cls, i) => (
        <button
          key={cls.id}
          onClick={() => setClass(cls.id)}
          className={`w-full text-left rounded-[20px] border-2 border-transparent
                      ${CARD_ACCENTS[i % CARD_ACCENTS.length]}
                      p-5 flex items-center gap-4
                      active:scale-[0.98] transition-transform
                      hover:border-navy/10 shadow-sm`}
        >
          {/* Class badge */}
          <div className="h-14 w-14 rounded-2xl bg-navy flex items-center justify-center shrink-0">
            <span className="text-accent font-extrabold text-[18px] leading-none">
              {cls.code}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[16px] text-navy leading-tight">{cls.label}</p>
            <p className="text-[12px] text-slate-500 mt-0.5">{cls.name}</p>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              {counts?.[cls.id] != null
                ? `${counts[cls.id].toLocaleString()} questions available`
                : '…'}
            </p>
          </div>

          <ChevronRight size={18} className="text-slate-300 shrink-0" />
        </button>
      ))}
    </div>
  )
}

function ClassGridSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-[20px] bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}
