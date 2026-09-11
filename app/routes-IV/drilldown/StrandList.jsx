import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import db from '../../db/db'
import useDrilldownStore from '../../stores/drilldownStore'

export default function StrandList() {
  const classId   = useDrilldownStore((s) => s.classId)
  const subjectId = useDrilldownStore((s) => s.subjectId)
  const setStrand = useDrilldownStore((s) => s.setStrand)

  const strands = useLiveQuery(
    () => db.strands
      .where('[classId+subjectId]')
      .equals([classId, subjectId])
      .sortBy('num'),
    [classId, subjectId],
  )

  // Sub-strand + question counts per strand
  const meta = useLiveQuery(async () => {
    if (!strands?.length) return {}
    const result = {}
    await Promise.all(
      strands.map(async (st) => {
        const ssCount = await db.subStrands.where('strandId').equals(st.id).count()
        const qCount  = await db.questions
          .where('[classId+subjectId]')
          .equals([classId, subjectId])
          .filter((q) => {
            // questions don't have strandId — resolve via contentStandard
            return true // we'll count at the substrand level for perf
          })
          .count()
        result[st.id] = { ssCount, qCount }
      }),
    )
    return result
  }, [strands, classId, subjectId])

  if (!strands) return <StrandSkeleton />

  return (
    <div className="p-4 space-y-2.5">
      <div className="px-1">
        <h2 className="text-[18px] font-bold text-navy">Strands</h2>
        <p className="text-[12px] text-slate-400 mt-0.5">
          {strands.length} strand{strands.length !== 1 ? 's' : ''}
        </p>
      </div>

      {strands.map((strand) => (
        <button
          key={strand.id}
          onClick={() => setStrand(strand.id)}
          className="w-full text-left rounded-[16px] bg-white border border-slate-200
                     p-4 flex items-center gap-3
                     hover:border-navy/20 hover:shadow-sm
                     active:scale-[0.98] transition-all"
        >
          {/* Strand number badge */}
          <div className="h-10 w-10 rounded-full bg-navy text-accent flex items-center
                          justify-center font-extrabold text-[13px] shrink-0">
            {strand.num}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-[14px] text-navy leading-tight">{strand.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{strand.code}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {meta?.[strand.id]?.ssCount ?? '…'} sub-strands
            </p>
          </div>

          <ChevronRight size={16} className="text-slate-300 shrink-0" />
        </button>
      ))}
    </div>
  )
}

function StrandSkeleton() {
  return (
    <div className="p-4 space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-[16px] bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}
