import { Chip } from '../ui'

export default function WeakAreas({ weakTags }) {
  if (!weakTags.length) return null
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-500">Focus on</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {weakTags.map((t) => <Chip key={t.tag}>{t.tag} · {t.score}/{t.total}</Chip>)}
      </div>
    </section>
  )
}