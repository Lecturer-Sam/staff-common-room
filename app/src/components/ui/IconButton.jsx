import { cn } from './cn'

/**
 * IconButton — square icon-only action (edit / delete / menu).
 * variant: 'ghost' (default) | 'danger'
 */
const VARIANTS = {
  ghost:  'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
  danger: 'text-slate-500 hover:bg-red-50 hover:text-red-600',
}

export default function IconButton({ variant = 'ghost', className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-2 transition-colors',
        VARIANTS[variant] ?? VARIANTS.ghost,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
