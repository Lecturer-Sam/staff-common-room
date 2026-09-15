const level = (avg) =>
  avg === null ? 'Not started' : avg >= 90 ? 'Mastered' : avg >= 75 ? 'Proficient'
  : avg >= 50 ? 'Developing' : 'Getting started'

export default function MasteryGrid({ perSubject }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-500">Subject mastery</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {perSubject.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-100 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.colour }} />
                {s.name}
              </span>
              <span className="text-xs text-slate-400">{s.avgPercent === null ? '—' : `${s.avgPercent}%`}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full" style={{ width: `${s.avgPercent ?? 0}%`, backgroundColor: s.colour }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {level(s.avgPercent)}{s.count ? ` · ${s.count} quiz${s.count > 1 ? 'es' : ''}` : ''}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}