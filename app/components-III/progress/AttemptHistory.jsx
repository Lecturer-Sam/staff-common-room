import { Link } from 'react-router'

export default function AttemptHistory({ attempts, stdMap }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-500">Recent attempts</h2>
      <ul className="mt-1 divide-y divide-slate-100">
        {attempts.slice(0, 10).map((a) => {
          const std = stdMap[a.standardId]
          const p = Math.round((a.score / a.total) * 100)
          return (
            <li key={a.id}>
              <Link to={`/results/${a.id}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">{std?.title ?? a.standardId}</span>
                  <span className="text-xs text-slate-400">{new Date(a.date).toLocaleString()}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  p >= 75 ? 'bg-green-100 text-green-700' : p >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {a.score}/{a.total}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}