import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { getLocalAnalytics } from '../lib/analytics'

export default function GeneratedTests() {
  const { user, profile } = useAuth()
  const [tests, setTests] = useState(null)
  const schoolId = profile?.schoolId || null
  const localAnalytics = useMemo(() => getLocalAnalytics(), [])

  useEffect(() => {
    if (!user) return
    let active = true
    const q = schoolId
      ? query(collection(db, 'generated_tests'), where('schoolId', '==', schoolId), limit(100))
      : query(collection(db, 'generated_tests'), where('authorId', '==', user.uid), limit(100))

    getDocs(q).then((snap) => {
      if (!active) return
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setTests(list)
    })
    return () => { active = false }
  }, [user, schoolId])

  const firestoreStats = useMemo(() => {
    if (!tests) return null
    const total = tests.length
    const withSchool = tests.filter((t) => t.schoolId).length
    const totalQs = tests.reduce((a, t) => a + (t.questions?.length || 0), 0)
    const totalMarks = tests.reduce((a, t) => a + (t.totalMarks || 0), 0)
    const avgQs = total ? Math.round(totalQs / total) : 0
    const byTemplate = {}
    const byGrade = {}
    tests.forEach((t) => {
      byTemplate[t.templateId || 'unknown'] = (byTemplate[t.templateId || 'unknown'] || 0) + 1
      const g = t.filters?.grade || 'unknown'
      byGrade[g] = (byGrade[g] || 0) + 1
    })
    return { total, withSchool, totalQs, totalMarks, avgQs, byTemplate, byGrade }
  }, [tests])

  return (
    <div>
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/questions" className="text-indigo-600 hover:underline">Question Bank</Link> / Generated Tests
      </nav>
      <h1 className="page-title">Generated Tests — History & Analytics</h1>
      <p className="mb-6 text-sm text-slate-500">Phase 4: Snapshot of every test generated — saved for reuse and auditing. Questions are snapshotted at generation time. Includes time to generate, success rate, coverage.</p>

      {/* Local analytics — PRD §11 */}
      <div className="card mb-6 p-4">
        <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Local Analytics (this browser) — PRD §11</p>
        <div className="grid gap-3 sm:grid-cols-4 text-sm">
          <div><p className="text-xs text-slate-500">Total generations</p><p className="font-bold text-slate-800">{localAnalytics.totalGenerations}</p></div>
          <div><p className="text-xs text-slate-500">Success rate</p><p className="font-bold text-slate-800">{(localAnalytics.successRate * 100).toFixed(1)}%</p></div>
          <div><p className="text-xs text-slate-500">Avg time</p><p className="font-bold text-slate-800">{localAnalytics.avgTimeMs}ms</p></div>
          <div><p className="text-xs text-slate-500">Fulfillment</p><p className="font-bold text-slate-800">{(localAnalytics.fulfillmentRate * 100).toFixed(1)}% ({localAnalytics.totalReturned}/{localAnalytics.totalRequested})</p></div>
        </div>
        <p className="mt-2 text-xs text-slate-400">Recent 7d: {localAnalytics.recentGenerations} generations · Time to generate target &lt;60s · Success without manual correction target &gt;90%</p>
      </div>

      {firestoreStats && (
        <div className="card mb-6 p-4">
          <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Firestore History — {schoolId ? `School ${schoolId.slice(0,6)}` : 'My tests'}</p>
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <div><p className="text-xs text-slate-500">Total papers</p><p className="font-bold text-slate-800">{firestoreStats.total}</p></div>
            <div><p className="text-xs text-slate-500">Total Qs generated</p><p className="font-bold text-slate-800">{firestoreStats.totalQs}</p></div>
            <div><p className="text-xs text-slate-500">Avg Qs/paper</p><p className="font-bold text-slate-800">{firestoreStats.avgQs}</p></div>
            <div><p className="text-xs text-slate-500">With school</p><p className="font-bold text-slate-800">{firestoreStats.withSchool}</p></div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            {Object.entries(firestoreStats.byTemplate).map(([t, c]) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5">{t}: {c}</span>)}
            {Object.entries(firestoreStats.byGrade).map(([g, c]) => <span key={g} className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">{g}: {c}</span>)}
          </div>
        </div>
      )}

      {!tests ? (
        <SkeletonList count={5} />
      ) : tests.length === 0 ? (
        <EmptyState icon="doc" title="No tests yet" body="Generate a test from the Question Bank and it will appear here with audit trail." action={{ label: 'Generate test', to: '/portal/questions/generate' }} />
      ) : (
        <ul className="space-y-3">
          {tests.map((t) => (
            <li key={t.id} className="card p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.title || `${t.filters?.grade || ''} ${t.filters?.subjectId || ''} Test`}</p>
                  <p className="text-xs text-slate-500">
                    {t.filters?.grade} · {t.filters?.subjectId} · {t.filters?.contentStandardCode || 'all standards'} · {t.filters?.type || 'mixed'} · {t.questions?.length || 0} Qs · {t.totalMarks || 0} marks
                    {t.genTimeMs ? ` · ${t.genTimeMs}ms` : ''} {t.templateId ? `· ${t.templateId}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">by {t.authorName} · {t.createdAt?.toDate?.()?.toLocaleString?.() || ''} {t.schoolId ? `· school ${t.schoolId.slice(0,6)}` : ''} · requested {t.filters?.requestedCount || t.filters?.count || 0} → got {t.questions?.length || 0}</p>
                  {t.filters?.contentStandardCode && <p className="mt-1 text-[11px]"><span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-indigo-700">{t.filters.contentStandardCode}</span></p>}
                </div>
                <div className="text-right">
                  {t.includeAnswerKey && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">with answer key</span>}
                  {t.filters?.requestedCount && t.questions?.length < t.filters.requestedCount && <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">partial</span>}
                  {t.filters?.requestedCount && t.questions?.length >= t.filters.requestedCount && <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">fulfilled</span>}
                </div>
              </div>
              {t.questions?.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-indigo-600">Show snapshot ({t.questions.length} Qs) — audit trail, immutable</summary>
                  <ol className="mt-2 list-decimal pl-5 text-xs text-slate-600">
                    {t.questions.slice(0, 10).map((q, i) => (
                      <li key={i} className="mb-1">{(q.text || q.question || '').slice(0, 120)} {q.contentStandardCode ? <span className="font-mono text-[11px] text-indigo-600">[{q.contentStandardCode}]</span> : ''}</li>
                    ))}
                    {t.questions.length > 10 && <li>…and {t.questions.length - 10} more</li>}
                  </ol>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
