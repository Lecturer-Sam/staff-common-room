// ContinueLearning.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { db } from '../../db/dexie'
import { useDrilldownStore } from '../../stores/drilldownStore'

export default function ContinueLearning() {
  const last = useDrilldownStore((s) => s.lastStandard)
  const [std, setStd] = useState(null)

  useEffect(() => {
    if (last) db.contentStandards.get(last.standardId).then(setStd)
  }, [last])

  if (!last) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
        Pick a class below to start — your last topic will appear here.
      </div>
    )
  }
  if (!std) return null
  return (
    <Link to={last.to} className="block rounded-2xl border border-brand/30 bg-brand/5 p-4 transition hover:bg-brand/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">Continue learning</p>
      <p className="mt-1 font-semibold text-slate-900">{std.title}</p>
      <p className="text-sm text-slate-500">{std.code}</p>
    </Link>
  )
}