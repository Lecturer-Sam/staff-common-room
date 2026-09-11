import { ChevronRight } from 'lucide-react'
import useDrilldownStore from '../../stores/drilldownStore'

/**
 * Horizontal breadcrumb strip.
 * Shows the current drill-down path as pill chips.
 * Clicking any chip navigates back to that level by calling resetBelow.
 *
 * Props:
 *   items  — array of { label, level }
 *            level is the key passed to resetBelow()
 *            e.g. [{ label:'B7', level:'class' }, { label:'Mathematics', level:'subject' }]
 */
export default function BreadcrumbStepper({ items = [] }) {
  const resetBelow = useDrilldownStore((s) => s.resetBelow)
  const resetAll   = useDrilldownStore((s) => s.resetAll)

  if (items.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap px-4 py-2 text-[12px]">
      {/* "All" root chip */}
      <button
        onClick={resetAll}
        className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500
                   font-semibold hover:bg-slate-200 transition-colors"
      >
        All
      </button>

      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={item.level} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-slate-300 shrink-0" />
            <button
              onClick={() => !isLast && resetBelow(item.level)}
              disabled={isLast}
              className={`px-2.5 py-1 rounded-full font-semibold transition-colors
                ${isLast
                  ? 'bg-navy text-accent cursor-default'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {item.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}
