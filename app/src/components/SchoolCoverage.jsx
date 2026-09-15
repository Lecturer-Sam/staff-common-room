import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAllSubjects } from '../hooks/useCurriculum'
import { TERMS } from '../lib/academicCalendar'

const GRADE_RE = /^(KG[12]|B[1-9])$/

/** Which term are we in right now? */
function currentTermNumber() {
  const now = new Date()
  const term = TERMS.find((t) => now >= t.opens && now <= t.closes) ?? TERMS[0]
  return Number(term.id.replace('term', ''))
}

/** Extract the subjectId from a progress key (B1 keys have no grade prefix). */
function subjectFromKey(key) {
  const parts = key.split('_')
  if (parts.length < 2) return null
  const body = GRADE_RE.test(parts[0]) ? parts.slice(1, -1) : parts.slice(0, -1)
  return body.join('_') || null
}

/**
 * School-wide curriculum coverage for the current term (Phase 2.5).
 * Aggregates members' `progress` docs (same-school reads allowed by rules):
 * which subjects teachers are tracking and how many weeks they've taught.
 */
export default function SchoolCoverage({ members }) {
  const subjects = useAllSubjects()
  const [progressByUid, setProgressByUid] = useState(null)

  const term = currentTermNumber()

  useEffect(() => {
    if (!members?.length) return
    let active = true
    Promise.all(
      members.map((m) =>
        getDoc(doc(db, 'progress', m.id))
          .then((snap) => [m.id, snap.exists() ? snap.data().weeks ?? {} : {}])
          .catch(() => [m.id, {}]),
      ),
    ).then((entries) => active && setProgressByUid(Object.fromEntries(entries)))
    return () => {
      active = false
    }
  }, [members])

  const stats = useMemo(() => {
    if (!progressByUid) return null
    const perSubject = {} // subjectId → { teachers, weeks }
    let trackingMembers = 0
    for (const weeks of Object.values(progressByUid)) {
      let memberHasTerm = false
      for (const [key, list] of Object.entries(weeks)) {
        if (!key.endsWith(`_T${term}`) || !Array.isArray(list) || list.length === 0) continue
        const subjectId = subjectFromKey(key)
        if (!subjectId) continue
        memberHasTerm = true
        const s = (perSubject[subjectId] ??= { teachers: 0, weeks: 0 })
        s.teachers += 1
        s.weeks += list.length
      }
      if (memberHasTerm) trackingMembers += 1
    }
    return { perSubject, trackingMembers }
  }, [progressByUid, term])

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id

  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        Curriculum coverage — Term {term}
      </h2>
      {!stats ? (
        <p className="text-sm text-slate-400">Loading coverage…</p>
      ) : stats.trackingMembers === 0 ? (
        <p className="text-sm text-slate-500">
          No one in the school has ticked weeks in the Progress tracker for this term yet.
        </p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5">Subject</th>
                <th className="px-4 py-2.5">Teachers tracking</th>
                <th className="px-4 py-2.5">Weeks taught (total)</th>
                <th className="px-4 py-2.5">Avg / teacher</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.perSubject)
                .sort(([, a], [, b]) => b.weeks - a.weeks)
                .map(([id, s]) => (
                  <tr key={id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 font-medium text-slate-700">{subjectName(id)}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {s.teachers} of {members.length}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{s.weeks}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {(s.weeks / s.teachers).toFixed(1)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="px-4 py-2.5 text-xs text-slate-400">
            {stats.trackingMembers} of {members.length} member
            {stats.trackingMembers === 1 ? '' : 's'} used the Progress tracker this term.
          </p>
        </div>
      )}
    </section>
  )
}
