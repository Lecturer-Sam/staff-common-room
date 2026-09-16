import { cn } from './cn'

export default function Chip({ active = false, className, children, ...rest }) {
  return (
    <button type="button" className={cn('ui-chip', active && 'is-active', className)} {...rest}>
      {children}
    </button>
  )
}
