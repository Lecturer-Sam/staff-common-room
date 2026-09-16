import { cn } from './cn'

export default function Grid({ as: Tag = 'div', className, children, ...rest }) {
  return <Tag className={cn('ui-grid', className)} {...rest}>{children}</Tag>
}
