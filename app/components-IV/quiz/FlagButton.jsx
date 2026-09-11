import { Flag } from 'lucide-react'

/**
 * Toggles the flag on the current question.
 *
 * Props:
 *   flagged  — boolean, current flag state
 *   onToggle — () => void
 */
export default function FlagButton({ flagged, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={flagged ? 'Remove flag' : 'Flag for review'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  text-[12px] font-semibold border transition-all
                  active:scale-95
                  ${flagged
                    ? 'bg-pending/10 border-pending/30 text-pending'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
    >
      <Flag size={12} fill={flagged ? 'currentColor' : 'none'} />
      {flagged ? 'Flagged' : 'Flag'}
    </button>
  )
}
