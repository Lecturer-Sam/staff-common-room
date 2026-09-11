import { cn } from './cn'

/**
 * PageHeader — the standard top-of-page title block.
 *
 * Props:
 *   title      required heading text
 *   subtitle   optional supporting sentence
 *   action     optional right-aligned node (e.g. a Button)
 */
export default function PageHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
