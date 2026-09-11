import { useMemo } from 'react'
import { Link } from 'react-router'
import { Flame } from 'lucide-react'
import { db } from '../db/dexie'
import { useLoader } from '../lib/useLoader'
import { useAttempts } from '../lib/attemptsService'
import { useAuth } from '../contexts/AuthContext'
import { buildAnalytics } from '../lib/progress'
import { Loading, ErrorCard } from '../components/ui'
import MasteryGrid from '../components/progress/MasteryGrid'
import AttemptHistory from '../components/progress/AttemptHistory'
import RadarChart from '../components/progress/RadarChart'

export default function Progress() {
  const { user } = useAuth()
  const { attempts, loading, error } = useAttempts(user?.uid)
  const analytics = useMemo(() => buildAnalytics(attempts), [attempts])

  const { data: curriculum, error: curriculumError, reload } = useLoader(async () => {
    const [subjects, standards] = await Promise.all([
      db.subjects.toArray(),
      db.contentStandards.toArray(),
    ])
    return { stdMap: Object.fromEntries(standards.map((s) => [s.id, s])) }
  }, [])

  if (error) return <ErrorCard title="Couldn't load your progress" detail={error.message} />
  if (loading) return <Loading />
  if (curriculumError) return <ErrorCard error={curriculumError} onRetry={reload} />
  if (!curriculum) return <Loading />

  const { stdMap } = curriculum

  if (attempts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Progress</h1>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No quizzes yet.</p>
          <Link to="/" className="mt-3 inline-block font-semibold text-brand underline">Start practising</Link>
        </div>
      </div>
    )
  }

  const t = analytics.totals
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Progress</h1>

      <div className="grid grid-cols-4 gap-2">
        {[
          ['Quizzes', t.count],
          ['Average', `${t.avgPercent}%`],
          ['Best', `${t.bestPercent}%`],
          ['Streak', <span key="s" className="flex items-center gap-0.5"><Flame size={12} className="text-orange-500" />{analytics.streak}d</span>],
        ].map(([label, value], i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-lg font-extrabold text-slate-900">{value}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <RadarChart data={analytics.radar} />
      <MasteryGrid perSubject={analytics.perSubject} />
      <AttemptHistory attempts={attempts} stdMap={stdMap} />
    </div>
  )
}