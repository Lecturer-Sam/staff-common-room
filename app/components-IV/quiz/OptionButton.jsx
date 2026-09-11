import { Check, X } from 'lucide-react'

/**
 * Single selectable answer option.
 *
 * Visual states:
 *   default   — white bg, slate border
 *   selected  — navy bg, white text  (before reveal)
 *   correct   — emerald bg/border + check icon
 *   wrong     — red bg/border + X icon  (only when revealed AND this was chosen)
 *   missed    — emerald outline only  (correct answer user didn't pick, after reveal)
 *
 * Props:
 *   label     — 'A' | 'B' | 'C' | 'D'
 *   text      — option text string
 *   selected  — boolean, user chose this option
 *   revealed  — boolean, show correct/wrong state
 *   isCorrect — boolean, this option is the correct answer
 *   onClick   — () => void
 *   disabled  — boolean
 */
export default function OptionButton({
  label,
  text,
  selected,
  revealed,
  isCorrect,
  onClick,
  disabled,
}) {
  // Determine visual variant
  let variant = 'default'
  if (revealed) {
    if (isCorrect)          variant = 'correct'
    else if (selected)      variant = 'wrong'
    // else stays default (dimmed)
  } else if (selected) {
    variant = 'selected'
  }

  const styles = {
    default:  'bg-white border-slate-200 text-navy hover:border-navy/20',
    selected: 'bg-navy border-navy text-white shadow-md',
    correct:  'bg-emerald-50 border-correct text-navy',
    wrong:    'bg-red-50 border-wrong text-navy',
  }

  const badgeStyles = {
    default:  'bg-slate-100 border-slate-200 text-slate-500',
    selected: 'bg-white/20 border-white/30 text-white',
    correct:  'bg-correct text-white border-correct',
    wrong:    'bg-wrong text-white border-wrong',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left rounded-[14px] border-2 p-3.5
                  flex items-center gap-3 transition-all
                  active:scale-[0.98] disabled:cursor-default
                  ${revealed && !isCorrect && !selected ? 'opacity-40' : ''}
                  ${styles[variant]}`}
    >
      {/* Label badge */}
      <span className={`h-8 w-8 rounded-full flex items-center justify-center
                        text-[12px] font-extrabold border-2 shrink-0
                        ${badgeStyles[variant]}`}>
        {revealed && isCorrect  ? <Check size={14} strokeWidth={3} /> :
         revealed && selected   ? <X     size={14} strokeWidth={3} /> :
         label}
      </span>

      <span className="text-[13.5px] font-medium leading-snug flex-1">
        {text}
      </span>
    </button>
  )
}
