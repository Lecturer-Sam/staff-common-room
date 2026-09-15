import { cn } from './cn'

/**
 * Badge — small status/category pill.
 * variant: 'neutral' (default) | 'success' | 'warn' | 'danger' | 'info'
 */
const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-50 text-emerald-700',
  warn:    'bg-amber-50 text-amber-700',
  danger:  'bg-red-50 text-red-600',
  info:    'bg-sky-50 text-sky-700',
}

export default function Badge({ variant = 'neutral', className, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        VARIANTS[variant] ?? VARIANTS.neutral,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
