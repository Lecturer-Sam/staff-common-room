import { cn } from './cn'

/**
 * Chip — a toggleable filter pill (e.g. category filters).
 * Renders a <button>; pass `active` for the selected state.
 */
export default function Chip({ active = false, className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-brand text-white'
          : 'border border-frame text-slate-600 hover:bg-slate-100',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
