const LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export default function StrandBreakdown({ byDifficulty }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-500">By difficulty</h2>
      <div className="mt-3 space-y-3">
        {byDifficulty.map((d) => (
          <div key={d.key}>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{LABEL[d.key]}</span>
              <span>{d.score}/{d.total}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-brand" style={{ width: `${(d.score / d.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}