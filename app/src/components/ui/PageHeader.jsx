import { cn } from './cn'

export default function PageHeader({ title, subtitle, action, eyebrow = 'Teacher workspace', className }) {
  return (
    <header className={cn('ui-page-header', className)}>
      <div className="ui-page-header__copy">
        <p className="ui-page-header__eyebrow">{eyebrow}</p>
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
      </div>
      {action && <div className="ui-page-header__action">{action}</div>}
    </header>
  )
}
