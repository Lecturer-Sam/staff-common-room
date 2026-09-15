import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Layers } from 'lucide-react'
import db from '../../db/db'
import useDrilldownStore from '../../stores/drilldownStore'

export default function SubStrandList() {
  const strandId    = useDrilldownStore((s) => s.strandId)
  const setSubStrand = useDrilldownStore((s) => s.setSubStrand)

  const subStrands = useLiveQuery(
    () => db.subStrands.where('strandId').equals(strandId ?? '').sortBy('num'),
    [strandId],
  )

  // Content standard + question counts per sub-strand
  const meta = useLiveQuery(async () => {
    if (!subStrands?.length) return {}
    const result = {}
    await Promise.all(
      subStrands.map(async (ss) => {
        const standards = await db.contentStandards
          .where('subStrandId').equals(ss.id).toArray()
        const csIds = standards.map((cs) => cs.id)
        const qCount = await db.questions
          .where('csId').anyOf(csIds).count()
        result[ss.id] = { csCount: standards.length, qCount }
      }),
    )
    return result
  }, [subStrands])

  if (!subStrands) return <SubStrandSkeleton />

  return (
    <div className="p-4 space-y-2.5">
      <div className="px-1">
        <h2 className="text-[18px] font-bold text-navy">Sub-strands</h2>
        <p className="text-[12px] text-slate-400 mt-0.5">
          {subStrands.length} sub-strand{subStrands.length !== 1 ? 's' : ''}
        </p>
      </div>

      {subStrands.map((ss) => {
        const m = meta?.[ss.id]
        return (
          <button
            key={ss.id}
            onClick={() => setSubStrand(ss.id)}
            className="w-full text-left rounded-[16px] bg-white border border-slate-200
                       p-4 flex items-center gap-3
                       hover:border-navy/20 hover:shadow-sm
                       active:scale-[0.98] transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-accent/20 text-navy flex items-center
                            justify-center shrink-0">
              <Layers size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px] text-navy leading-tight">{ss.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{ss.code}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                <span>{m?.csCount ?? '…'} standards</span>
                <span className="text-slate-300">·</span>
                <span>{m?.qCount ?? '…'} questions</span>
              </div>
            </div>

            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </button>
        )
      })}
    </div>
  )
}

function SubStrandSkeleton() {
  return (
    <div className="p-4 space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-[16px] bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}
