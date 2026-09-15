import { cn } from './cn'

/**
 * Card — light surface (#f5f5f5) with a gray frame and 12px radius.
 *
 * Props:
 *   as        element/component to render as (default 'div')
 *   hover     add a subtle lift on hover (for clickable cards)
 *   padding   Tailwind padding classes for the body (default 'p-5')
 *   banner    optional ReactNode rendered as a full-bleed emerald header
 *             (white text) above the body — used for card titles
 *   bannerClassName  extra classes for the banner strip
 */
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
  const hoverCls = hover && 'transition-shadow hover:shadow-md'

  if (banner) {
    return (
      <Tag
        className={cn('card flex flex-col overflow-hidden', hoverCls, className)}
        {...rest}
      >
        <div className={cn('bg-brand px-4 py-3 text-white sm:px-5', bannerClassName)}>
          {banner}
        </div>
        <div className={cn('flex flex-1 flex-col', padding)}>{children}</div>
      </Tag>
    )
  }

  return (
    <Tag className={cn('card', padding, hoverCls, className)} {...rest}>
      {children}
    </Tag>
  )
}
