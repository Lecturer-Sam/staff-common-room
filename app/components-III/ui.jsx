import { Link } from 'react-router'
import BreadcrumbStepper from './layout/BreadcrumbStepper'

export function Card({ to, accent, lead, title, subtitle, meta }) {
  return (
    <Link to={to}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow">
      {lead && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: accent }}>{lead}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-900">{title}</span>
        {subtitle && <span className="block truncate text-sm text-slate-500">{subtitle}</span>}
      </span>
      {meta && <span className="shrink-0 text-xs font-medium text-slate-400">{meta}</span>}
    </Link>
  )
}

export function PageShell({ trail, title, children }) {
  return (
    <div className="space-y-4">
      <BreadcrumbStepper trail={trail} />
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {children}
    </div>
  )
}

export function Loading() {
  return <p className="animate-pulse py-8 text-sm text-slate-400">Loading…</p>
}

export function ErrorCard({ error, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>Something went wrong: {error?.message ?? String(error)}</p>
      <button onClick={onRetry} className="mt-2 font-semibold underline">Try again</button>
    </div>
  )
}

export function Chip({ children }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{children}</span>
}