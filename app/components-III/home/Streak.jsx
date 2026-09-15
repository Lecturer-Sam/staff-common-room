import { Flame } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useAttempts } from '../../lib/attemptsService'
import { getStreak } from '../../lib/progress'

export default function Streak() {
  const { user } = useAuth()
  const { attempts } = useAttempts(user?.uid)
  const days = getStreak(attempts)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Flame size={12} /> Streak
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {days > 0 ? `${days} day${days > 1 ? 's' : ''} in a row` : 'Quiz today to start a streak.'}
      </p>
    </div>
  )
}