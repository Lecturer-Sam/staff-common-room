/**
 * EmptyState — a clean illustrated placeholder for empty lists.
 *
 * Props:
 *   icon      – SVG element (optional, defaults to a generic inbox icon)
 *   title     – short heading (required)
 *   body      – supporting sentence (optional)
 *   action    – { label, to } for a Link button  OR  { label, onClick } for a button
 */
import { Button } from './ui'

const icons = {
  feed: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-slate-300">
      <rect x="6" y="10" width="36" height="28" rx="4" />
      <line x1="14" y1="19" x2="34" y2="19" />
      <line x1="14" y1="26" x2="28" y2="26" />
      <line x1="14" y1="33" x2="22" y2="33" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-slate-300">
      <path d="M28 6H12a4 4 0 0 0-4 4v28a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V18L28 6z" />
      <polyline points="28 6 28 18 40 18" />
      <line x1="16" y1="26" x2="32" y2="26" />
      <line x1="16" y1="32" x2="24" y2="32" />
    </svg>
  ),
  question: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-slate-300">
      <circle cx="24" cy="24" r="18" />
      <path d="M18 18a6 6 0 0 1 11.66 2c0 4-6 6-6 6" />
      <line x1="24" y1="34" x2="24.02" y2="34" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-slate-300">
      <path d="M12 6h20a4 4 0 0 1 4 4v32l-7-4-7 4V6z" opacity="0" />
      <path d="M10 8a2 2 0 0 1 2-2h26v34H12a2 2 0 0 0-2 2V8z" />
      <path d="M10 40a2 2 0 0 0 2 2h26" />
      <line x1="18" y1="16" x2="30" y2="16" />
      <line x1="18" y1="22" x2="30" y2="22" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-slate-300">
      <circle cx="22" cy="22" r="14" />
      <line x1="42" y1="42" x2="32" y2="32" />
    </svg>
  ),
  vacancies: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-slate-300">
      <rect x="6" y="14" width="36" height="28" rx="3" />
      <path d="M32 14V10a4 4 0 0 0-4-4h-8a4 4 0 0 0-4 4v4" />
      <line x1="24" y1="24" x2="24" y2="34" />
      <line x1="19" y1="29" x2="29" y2="29" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-slate-300">
      <path d="M42 32V14L24 6 6 14v18l18 8 18-8z" />
      <polyline points="6 14 24 22 42 14" />
      <line x1="24" y1="22" x2="24" y2="42" />
    </svg>
  ),
}

export default function EmptyState({ icon = 'default', title, body, action }) {
  const illustration = typeof icon === 'string' ? (icons[icon] ?? icons.default) : icon

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-surface/60 px-6 py-14 text-center">
      <div className="mb-4">{illustration}</div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {body && (
        <p className="mt-1 max-w-xs text-sm text-slate-400">{body}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.to ? (
            <Button to={action.to}>{action.label}</Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  )
}
