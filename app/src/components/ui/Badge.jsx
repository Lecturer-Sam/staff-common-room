import { cn } from './cn'

const VARIANTS = {
  neutral: 'ui-badge--neutral',
  success: 'ui-badge--success',
  warn: 'ui-badge--warn',
  danger: 'ui-badge--danger',
  info: 'ui-badge--info',
}

export default function Badge({ variant = 'neutral', className, children, ...rest }) {
  return (
    <span className={cn('ui-badge', VARIANTS[variant] ?? VARIANTS.neutral, className)} {...rest}>
      {children}
    </span>
  )
}
