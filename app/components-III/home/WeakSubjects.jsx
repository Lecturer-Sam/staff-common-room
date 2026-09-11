import { Link } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import { useAttempts } from '../../lib/attemptsService'
import { buildAnalytics } from '../../lib/progress'

export default function WeakSubjects() {
  const { user } = useAuth()
  const { attempts } = useAttempts(user?.uid)
  const weak = buildAnalytics(attempts).weak.slice(0, 2)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Focus areas</p>
      {weak.length === 0
        ? <p className="mt-1 text-sm text-slate-500">Nothing flagged yet.</p>
        : (
          <Link to="/progress" className="mt-1 block text-sm font-medium text-brand underline">
            {weak.map((w) => `${w.name} ${w.avgPercent}%`).join(' · ')}
          </Link>
        )}
    </div>
  )
}