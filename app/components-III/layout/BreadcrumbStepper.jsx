import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'

export default function BreadcrumbStepper({ trail }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
      {trail.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="text-slate-300" />}
          {crumb.to
            ? <Link to={crumb.to} className="hover:text-brand">{crumb.label}</Link>
            : <span className="font-semibold text-slate-800">{crumb.label}</span>}
        </span>
      ))}
    </nav>
  )
}