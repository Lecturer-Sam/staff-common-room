import { Link } from 'react-router-dom'
import { cn } from './cn'

const VARIANTS = {
  primary: 'ui-button--primary',
  secondary: 'ui-button--secondary',
  ghost: 'ui-button--ghost',
  danger: 'ui-button--danger',
}

const SIZES = {
  sm: 'ui-button--sm',
  md: 'ui-button--md',
  lg: 'ui-button--lg',
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
    'ui-button',
    VARIANTS[variant] ?? VARIANTS.primary,
    SIZES[size] ?? SIZES.md,
    className,
  )

  if (to) return <Link to={to} className={classes} {...rest}>{children}</Link>
  if (href) return <a href={href} className={classes} {...rest}>{children}</a>
  return <button type={type ?? 'button'} className={classes} {...rest}>{children}</button>
}
