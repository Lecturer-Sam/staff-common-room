import { cn } from './cn'

export default function IconButton({ variant = 'ghost', className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cn('ui-icon-button', variant === 'danger' && 'ui-icon-button--danger', className)}
      {...rest}
    >
      {children}
    </button>
  )
}
