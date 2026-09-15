import { Link } from 'react-router-dom'
import { cn } from './cn'

/**
 * Button — the app's primary action primitive.
 *
 * Props:
 *   variant  'primary' (charcoal) | 'secondary' | 'ghost' | 'danger'   (default 'primary')
 *   size     'sm' | 'md' | 'lg'                                          (default 'md')
 *   to       when set, renders a react-router <Link>
 *   href     when set, renders an <a>
 *   otherwise renders a <button type="button"> (override with type=)
 */
const VARIANTS = {
  primary:   'bg-brand text-white shadow-sm hover:bg-brand-hover',
  secondary: 'border border-frame bg-surface text-slate-700 hover:bg-slate-100',
  ghost:     'text-slate-600 hover:bg-slate-100',
  danger:    'bg-red-600 text-white shadow-sm hover:bg-red-700',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  type,
  className,
  children,
  ...rest
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    className,
  )

  if (to) {
    return <Link to={to} className={classes} {...rest}>{children}</Link>
  }
  if (href) {
    return <a href={href} className={classes} {...rest}>{children}</a>
  }
  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  )
}
