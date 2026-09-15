import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import {
  Sigma, BookOpen, FlaskConical, Globe, Laptop,
  Wrench, HeartHandshake, Palette,
} from 'lucide-react'
import db from '../../db/db'
import useDrilldownStore from '../../stores/drilldownStore'

/** Map the icon string from curriculum.json to a Lucide component */
const ICON_MAP = {
  sigma:        Sigma,
  'book-open':  BookOpen,
  flask:        FlaskConical,
  globe:        Globe,
  laptop:       Laptop,
  wrench:       Wrench,
  'heart-hands': HeartHandshake,
  palette:      Palette,
}

const DEFAULT_ICON = BookOpen

export default function SubjectGrid() {
  const classId    = useDrilldownStore((s) => s.classId)
  const setSubject = useDrilldownStore((s) => s.setSubject)

  // All subjects that have at least one strand in this class
  const subjects = useLiveQuery(async () => {
    if (!classId) return []
    // Get the unique subjectIds that appear in strands for this class
    const strands    = await db.strands.where('classId').equals(classId).toArray()
    const subjectIds = [...new Set(strands.map((s) => s.subjectId))]
    const all        = await db.subjects.toArray()
    return all.filter((s) => subjectIds.includes(s.id))
  }, [classId])

  // Question counts per subject
  const counts = useLiveQuery(async () => {
    if (!subjects?.length || !classId) return {}
    const result = {}
    await Promise.all(
      subjects.map(async (subj) => {
        result[subj.id] = await db.questions
          .where('[classId+subjectId]')
          .equals([classId, subj.id])
          .count()
      }),
    )
    return result
  }, [subjects, classId])

  if (!subjects) return <SubjectGridSkeleton />

  return (
    <div className="p-4 space-y-2.5">
      <div className="px-1">
        <h2 className="text-[18px] font-bold text-navy">Select a Subject</h2>
        <p className="text-[12px] text-slate-400 mt-0.5">
          {subjects.length} subjects available
        </p>
      </div>

      {subjects.map((subj) => {
        const Icon = ICON_MAP[subj.icon] ?? DEFAULT_ICON
        return (
          <button
            key={subj.id}
            onClick={() => setSubject(subj.id)}
            className="w-full text-left rounded-[18px] bg-white border border-slate-200
                       p-4 flex items-center gap-4
                       hover:border-navy/20 hover:shadow-sm
                       active:scale-[0.98] transition-all"
          >
            {/* Subject icon with subject colour */}
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: subj.colour + '22' }}
            >
              <Icon size={20} style={{ color: subj.colour }} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px] text-navy leading-tight">{subj.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-1">
                {subj.blurb}
              </p>
              <p className="text-[11px] font-semibold mt-1.5" style={{ color: subj.colour }}>
                {counts?.[subj.id] != null
                  ? `${counts[subj.id]} questions`
                  : '…'}
              </p>
            </div>

            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </button>
        )
      })}
    </div>
  )
}

function SubjectGridSkeleton() {
  return (
    <div className="p-4 space-y-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-[18px] bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}
