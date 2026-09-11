import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum } from '../hooks/useCurriculum'
import { isoWeekKey, WEEKLY_QUOTA } from '../lib/week'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../context/ToastContext'
import { Button, Badge, Select, PageHeader } from '../components/ui'

const TYPE_LABEL = { mcq: 'MCQ', short: 'Short answer', essay: 'Essay' }
const LETTERS = ['A', 'B', 'C', 'D']

// Hard ceiling for the bank read (matches the other question fetches) and
// the batch size used to render the list incrementally.
const BANK_LIMIT = 1000
const PAGE_SIZE = 50

export default function QuestionBank() {
  const { user, profile } = useAuth()
  const { subjects } = useCurriculum()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'
  const [questions, setQuestions] = useState(null)
  const [members, setMembers] = useState(null)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [reloadKey, setReloadKey] = useState(0)
  const [confirm, setConfirm] = useState(null)
  const [truncated, setTruncated] = useState(false)
  // Render the list in batches — the bank can hold hundreds of cards and
  // painting them all at once hurts low-end phones.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const weekKey = isoWeekKey()

  // Changing scope reshapes the visible set — restart the render window.
  function resetWindow() {
    setVisibleCount(PAGE_SIZE)
  }

  useEffect(() => {
    if (!user) return
    let active = true
    getDocs(query(collection(db, 'questions'), limit(BANK_LIMIT))).then((snap) => {
      if (!active) return
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setQuestions(list)
      // Firestore returns no total count — a full page means "may be more".
      setTruncated(snap.size >= BANK_LIMIT)
    })
    return () => { active = false }
  }, [user, reloadKey])

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    getDocs(collection(db, 'users')).then((snap) => {
      if (!active) return
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      setMembers(list.filter((m) => (m.status ?? 'pending') === 'approved' || m.role === 'admin'))
    })
    return () => { active = false }
  }, [isAdmin])

  const myWeekCount = useMemo(
    () => (questions ?? []).filter((q) => q.authorId === user?.uid && q.weekKey === weekKey).length,
    [questions, user, weekKey],
  )

  const overview = useMemo(() => {
    if (!isAdmin || !members || !questions) return null
    return members
      .map((m) => {
        const mine = questions.filter((q) => q.authorId === m.uid || q.authorId === m.id)
        return {
          id: m.id,
          name: m.name || m.email || m.id,
          thisWeek: mine.filter((q) => q.weekKey === weekKey).length,
          total: mine.length,
        }
      })
      .sort((a, b) => a.thisWeek - b.thisWeek || a.name.localeCompare(b.name))
  }, [isAdmin, members, questions, weekKey])

  const visible = useMemo(
    () =>
      (questions ?? []).filter(
        (q) =>
          (!subjectFilter || q.subjectId === subjectFilter) &&
          (!typeFilter || q.type === typeFilter) &&
          (!mineOnly || q.authorId === user?.uid),
      ),
    [questions, subjectFilter, typeFilter, mineOnly, user],
  )

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id

  function confirmDelete(q) {
    setConfirm({
      title: 'Delete this question?',
      body: 'This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'questions', q.id))
          setReloadKey((k) => k + 1)
          resetWindow()
          toast.success('Question deleted.')
        } catch {
          toast.error('Failed to delete question.')
        }
      },
    })
  }

  return (
    <div>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />

      <PageHeader
        title="Question Bank"
        subtitle={`Every teacher adds ${WEEKLY_QUOTA} questions each week, tagged to the curriculum.`}
        action={
          <span className="flex flex-wrap gap-2">
            <Button to="/portal/questions/quiz" variant="secondary">Quiz maker</Button>
            <Button to="/portal/questions/generate" variant="secondary">Generate paper</Button>
            <Button to="/portal/questions/new">+ Add question</Button>
          </span>
        }
      />

      {questions &&
        (myWeekCount >= WEEKLY_QUOTA ? (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Well done — you have submitted {myWeekCount} of {WEEKLY_QUOTA} questions this week ({weekKey}).
          </p>
        ) : (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Reminder: you have submitted {myWeekCount} of {WEEKLY_QUOTA} questions this week ({weekKey}).{' '}
            <Link to="/portal/questions/new" className="font-semibold underline">
              Add {WEEKLY_QUOTA - myWeekCount} more
            </Link>.
          </p>
        ))}

      {isAdmin && overview && (
        <div className="card mb-6 overflow-hidden">
          <p className="border-b border-frame px-4 py-2.5 text-sm font-semibold text-slate-800">
            Weekly submissions — {weekKey}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-slate-400 uppercase">
                  <th className="px-4 py-2">Member</th>
                  <th className="px-4 py-2">This week</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-700">{m.name}</td>
                    <td className="px-4 py-2">{m.thisWeek}</td>
                    <td className="px-4 py-2">{m.total}</td>
                    <td className="px-4 py-2">
                      {m.thisWeek >= WEEKLY_QUOTA ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Complete</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{WEEKLY_QUOTA - m.thisWeek} outstanding</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); resetWindow() }} className="w-auto py-1.5">
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); resetWindow() }} className="w-auto py-1.5">
          <option value="">All types</option>
          <option value="mcq">MCQ</option>
          <option value="short">Short answer</option>
          <option value="essay">Essay</option>
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); resetWindow() }} className="accent-brand" />
          My questions only
        </label>
      </div>

      {!questions ? (
        <SkeletonList count={5} />
      ) : visible.length === 0 ? (
        <EmptyState icon="question" title="No questions yet" body="Questions tagged to the curriculum will appear here once added." action={{ label: '+ Add question', to: '/portal/questions/new' }} />
      ) : (
        <>
        {truncated && (
          <p className="mb-2 text-xs text-amber-600">
            Showing the {BANK_LIMIT} most recent questions — the bank is larger, so narrow
            the filters if a question seems missing.
          </p>
        )}
        <ul className="space-y-3">
          {visible.slice(0, visibleCount).map((q) => {
            const own = q.authorId === user?.uid
            return (
              <li key={q.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium whitespace-pre-wrap text-slate-800">{q.question}</p>
                  <Badge className="shrink-0">
                    {TYPE_LABEL[q.type] ?? q.type} · {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                  </Badge>
                </div>
                {q.type === 'mcq' && q.options?.length > 0 && (
                  <>
                    {expanded[q.id] && (
                      <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
                        {q.options.map((o, i) =>
                          o ? (
                            <li key={i}>
                              <span className={q.answer === LETTERS[i] ? 'font-semibold text-emerald-700' : ''}>
                                {LETTERS[i]}. {o}{q.answer === LETTERS[i] && ' ✓'}
                              </span>
                            </li>
                          ) : null,
                        )}
                      </ul>
                    )}
                    <button type="button" onClick={() => setExpanded((x) => ({ ...x, [q.id]: !x[q.id] }))} className="mt-1 text-xs text-indigo-600 hover:underline">
                      {expanded[q.id] ? 'Hide options' : 'Show options & answer'}
                    </button>
                  </>
                )}
                {q.type !== 'mcq' && q.answer && expanded[q.id] && (
                  <p className="mt-2 text-sm text-slate-600"><span className="font-semibold">Answer:</span> {q.answer}</p>
                )}
                {q.type !== 'mcq' && q.answer && (
                  <button type="button" onClick={() => setExpanded((x) => ({ ...x, [q.id]: !x[q.id] }))} className="mt-1 text-xs text-indigo-600 hover:underline">
                    {expanded[q.id] ? 'Hide answer' : 'Show answer'}
                  </button>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="card-meta">
                    {subjectName(q.subjectId)} · {q.strandName} › {q.subStrandName}
                    {q.indicatorCode && <span className="ml-1 font-mono text-indigo-600">{q.indicatorCode}</span>}
                    {' '}· by <span className="font-medium text-slate-600">{q.authorName}</span> · {q.weekKey}
                  </p>
                  {(own || isAdmin) && (
                    <span className="flex gap-2">
                      <Link to={`/portal/questions/${q.id}/edit`} className="text-xs text-slate-500 hover:text-indigo-600 hover:underline">Edit</Link>
                      <button type="button" onClick={() => confirmDelete(q)} className="text-xs text-slate-500 hover:text-red-600 hover:underline">Delete</button>
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {visible.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Show {Math.min(PAGE_SIZE, visible.length - visibleCount)} more ({visible.length} total)
          </button>
        )}
        </>
      )}
    </div>
  )
}
