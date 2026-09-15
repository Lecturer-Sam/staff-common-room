import { cn } from './cn'

/**
 * Grid — mobile-first responsive card grid.
 * 1 column · 2 @640px · 3 @1024px · 4 @1280px  (see `.grid-responsive` in index.css)
 */
export default function Grid({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag className={cn('grid-responsive', className)} {...rest}>
      {children}
    </Tag>
  )
}
