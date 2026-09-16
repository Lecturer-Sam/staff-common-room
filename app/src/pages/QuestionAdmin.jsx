import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, limit, query, updateDoc, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const STATUS_COLOR = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-red-50 text-red-600',
}

export default function QuestionAdmin() {
  const { profile } = useAuth()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'
  const [questions, setQuestions] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    getDocs(query(collection(db, 'questions'), where('status', '==', filter), limit(200))).then((snap) => {
      if (!active) return
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setQuestions(list)
    })
    return () => { active = false }
  }, [isAdmin, filter])

  const stats = useMemo(() => {
    if (!questions) return null
    const byCS = {}
    questions.forEach((q) => {
      byCS[q.contentStandardCode || 'missing'] = (byCS[q.contentStandardCode || 'missing'] || 0) + 1
    })
    return { total: questions.length, byCS, missingCS: byCS['missing'] || 0 }
  }, [questions])

  async function setStatus(q, newStatus) {
    setBusy(q.id)
    try {
      await updateDoc(doc(db, 'questions', q.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        auditLog: [
          ...(q.auditLog || []).slice(-20),
          { action: `status:${newStatus}`, by: profile?.uid || 'admin', at: new Date().toISOString() },
        ],
      })
      setQuestions((qs) => qs.filter((x) => x.id !== q.id))
      toast.success(`Question ${newStatus}`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  if (!isAdmin) {
    return <p className="text-sm text-slate-500">Admin only.</p>
  }

  return (
    <div>
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/questions" className="text-indigo-600 hover:underline">Question Bank</Link> / Admin
      </nav>
      <h1 className="page-title">Question Review Queue</h1>
      <p className="mb-4 text-sm text-slate-500">Review teacher-contributed questions. Every question must map to one content standard (PRD critical rule).</p>

      <div className="mb-4 flex gap-2">
        {['pending', 'draft', 'published', 'archived'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{s}</button>
        ))}
      </div>

      {stats && (
        <div className="mb-4 flex gap-4 text-xs text-slate-500">
          <span>Total: {stats.total}</span>
          <span>Content standards: {Object.keys(stats.byCS).length}</span>
          {stats.missingCS > 0 && <span className="text-red-600">Missing CS: {stats.missingCS} — must fix before publish</span>}
        </div>
      )}

      {!questions ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-slate-500">No {filter} questions.</p>
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{q.text || q.question}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {q.grade} · {q.subjectId} · {q.contentStandardCode || <span className="text-red-600">MISSING CS</span>} · {q.indicatorCode || 'no indicator'} · {q.difficulty} · {q.bloomLevel} · {q.marks}m · by {q.authorName}
                  </p>
                  {q.type === 'objective' && q.options?.length > 0 && (
                    <ul className="mt-2 text-xs text-slate-600">
                      {q.options.map((o, i) => o ? <li key={i}>{String.fromCharCode(65 + i)}. {o} {q.correctAnswer === String.fromCharCode(65 + i) ? '✓' : ''}</li> : null)}
                    </ul>
                  )}
                  {q.type === 'essay' && q.markingGuide && (
                    <p className="mt-2 text-xs text-slate-600">Guide: {q.markingGuide.slice(0, 200)}</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">Source: {q.source || '—'} · {q.bloomLevel} · v{q.version || 1}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[q.status] || ''}`}>{q.status}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button disabled={busy === q.id} onClick={() => setStatus(q, 'published')} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Publish</button>
                <button disabled={busy === q.id} onClick={() => setStatus(q, 'archived')} className="rounded-md bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50">Archive</button>
                <Link to={`/portal/questions/${q.id}/edit`} className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">Edit</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
