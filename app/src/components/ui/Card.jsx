import { cn } from './cn'

const PADDING = {
  'p-0': 'ui-card__body--none',
  'p-3': 'ui-card__body--xs',
  'p-4': 'ui-card__body--sm',
  'p-5': 'ui-card__body',
  'p-6': 'ui-card__body--lg',
  'p-6 sm:p-8': 'ui-card__body--lg',
  'p-5 sm:p-6': 'ui-card__body ui-card__body--form',
}

export default function Card({
  as: Tag = 'div',
  hover = false,
  padding = 'p-5',
  banner,
  bannerClassName,
  className,
  children,
  ...rest
}) {
  const bodyClass = PADDING[padding] ?? padding

  if (banner) {
    return (
      <Tag className={cn('ui-card ui-card--banner', hover && 'ui-card--interactive', className)} {...rest}>
        <div className={cn('ui-card__banner', bannerClassName)}>{banner}</div>
        <div className={bodyClass}>{children}</div>
      </Tag>
    )
  }

  return (
    <Tag className={cn('ui-card', bodyClass, hover && 'ui-card--interactive', className)} {...rest}>
      {children}
    </Tag>
  )
}
