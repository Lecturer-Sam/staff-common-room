import { GraduationCap } from 'lucide-react'
import { db } from '../db/dexie'
import { getClasses } from '../lib/aggregate'
import { useLoader } from '../lib/useLoader'
import { Card, Loading, ErrorCard } from '../components/ui'
import ContinueLearning from '../components/home/ContinueLearning'
import Streak from '../components/home/Streak'
import WeakSubjects from '../components/home/WeakSubjects'

export default function Home() {
  const { data, error, reload } = useLoader(async () => {
    const classes = await getClasses()
    return Promise.all(classes.map(async (c) => ({
      ...c,
      count: await db.questions.filter((q) => q.classId === c.id).count(),
    })))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Practice the JHS curriculum</h1>
        <p className="text-sm text-slate-500">NaCCA-aligned questions for Basic 7–9. Works offline.</p>
      </div>

      <ContinueLearning />
      <div className="grid grid-cols-2 gap-3">
        <Streak /><WeakSubjects />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Choose your class</h2>
        {error && <ErrorCard error={error} onRetry={reload} />}
        {!data && !error && <Loading />}
        {data && (
          <div className="grid gap-3 sm:grid-cols-3">
            {data.map((c) => (
              <Card key={c.id} to={`/subjects/${c.id}`} accent="#4F46E5"
                lead={<GraduationCap size={20} />}
                title={c.name} subtitle={c.label} meta={`${c.count} Qs`} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}