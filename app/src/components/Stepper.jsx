/**
 * Stepper — a horizontal progress map for multi-step forms.
 *
 * Props:
 *   steps        – array of { label } (required)
 *   current      – index of the active step (0-based)
 *   onStepClick  – optional (i) => void; when provided, completed steps (and the
 *                  current one) become clickable so users can jump back.
 *
 * Scrolls horizontally on narrow screens so it never breaks the mobile layout.
 */
export default function Stepper({ steps, current, onStepClick }) {
  return (
    <ol className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < current
        const active = i === current
        const clickable = onStepClick && i <= current
        const circle = (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              active
                ? 'bg-indigo-600 text-white'
                : done
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-400'
            }`}
          >
            {done ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <polyline points="3 8.5 6.5 12 13 4.5" />
              </svg>
            ) : (
              i + 1
            )}
          </span>
        )
        return (
          <li key={s.label} className="flex shrink-0 items-center gap-2">
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick(i)}
                className="flex items-center gap-2 rounded-md focus:outline-none"
              >
                {circle}
                <span
                  className={`text-xs font-medium sm:text-sm ${
                    active ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </button>
            ) : (
              <span className="flex items-center gap-2">
                {circle}
                <span
                  className={`text-xs font-medium sm:text-sm ${
                    active ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </span>
            )}
            {i < steps.length - 1 && (
              <span
                className={`h-px w-6 shrink-0 sm:w-10 ${
                  done ? 'bg-indigo-300' : 'bg-slate-200'
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
