import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum, useGrades } from '../hooks/useCurriculum'
import { isoWeekKey, WEEKLY_QUOTA } from '../lib/week'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../context/ToastContext'
import { Button, Badge, Select, PageHeader } from '../components/ui'

const TYPE_LABEL = {
  objective: 'Objective',
  mcq: 'MCQ',
  true_false: 'True/False',
  fill_blank: 'Fill blank',
  essay: 'Essay',
  short: 'Short',
  structured: 'Structured',
  long: 'Long essay',
}
const LETTERS = ['A', 'B', 'C', 'D']
const BANK_LIMIT = 1000
const PAGE_SIZE = 50

const DIFFICULTY_COLOR = {
  easy: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-red-50 text-red-700',
}
const STATUS_COLOR = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-red-50 text-red-600',
}

const uniq = (arr) => [...new Set(arr.filter(Boolean))]

export default function QuestionBank() {
  const { user, profile } = useAuth()
  const grades = useGrades()
  const [gradeFilter, setGradeFilter] = useState('')
  const { subjects, indicators } = useCurriculum(gradeFilter || 'B4')
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'

  const [questions, setQuestions] = useState(null)
  const [members, setMembers] = useState(null)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [strandFilter, setStrandFilter] = useState('')
  const [subStrandFilter, setSubStrandFilter] = useState('')
  const [contentStandardFilter, setContentStandardFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [bloomFilter, setBloomFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // admin only
  const [mineOnly, setMineOnly] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [reloadKey, setReloadKey] = useState(0)
  const [confirm, setConfirm] = useState(null)
  const [truncated, setTruncated] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showCoverage, setShowCoverage] = useState(false)

  const weekKey = isoWeekKey()

  function resetWindow() {
    setVisibleCount(PAGE_SIZE)
  }

  // Fetch bank — try status-aware if admin filtering, else all published + own
  useEffect(() => {
    if (!user) return
    let active = true
    const fetchBank = async () => {
      try {
        let q
        if (isAdmin && statusFilter) {
          q = query(collection(db, 'questions'), where('status', '==', statusFilter), limit(BANK_LIMIT))
        } else if (subjectFilter) {
          // Use subject filter server-side to reduce reads (new PRD)
          q = query(collection(db, 'questions'), where('subjectId', '==', subjectFilter), limit(BANK_LIMIT))
        } else {
          q = query(collection(db, 'questions'), limit(BANK_LIMIT))
        }
        const snap = await getDocs(q)
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setQuestions(list)
        setTruncated(snap.size >= BANK_LIMIT)
      } catch (e) {
        console.warn('QuestionBank fetch failed, fallback to unfiltered:', e)
        const snap = await getDocs(query(collection(db, 'questions'), limit(BANK_LIMIT)))
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        setQuestions(list)
        setTruncated(snap.size >= BANK_LIMIT)
      }
    }
    fetchBank()
    return () => { active = false }
  }, [user, reloadKey, subjectFilter, statusFilter, isAdmin])

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

  // Derived filter options from current bank (not just curriculum)
  const strands = useMemo(() => uniq((questions ?? []).filter((q) => !subjectFilter || q.subjectId === subjectFilter).map((q) => q.strandName)), [questions, subjectFilter])
  const subStrands = useMemo(
    () => uniq((questions ?? []).filter((q) => (!subjectFilter || q.subjectId === subjectFilter) && (!strandFilter || q.strandName === strandFilter)).map((q) => q.subStrandName)),
    [questions, subjectFilter, strandFilter],
  )
  const contentStandards = useMemo(() => {
    const map = new Map()
    ;(questions ?? [])
      .filter((q) => (!subjectFilter || q.subjectId === subjectFilter) && (!strandFilter || q.strandName === strandFilter) && (!subStrandFilter || q.subStrandName === subStrandFilter))
      .forEach((q) => {
        if (q.contentStandardCode && !map.has(q.contentStandardCode)) {
          map.set(q.contentStandardCode, { code: q.contentStandardCode, desc: q.contentStandardDesc || q.contentStandardCode })
        }
      })
    // Also merge from curriculum indicators for completeness
    indicators
      .filter((i) => !subjectFilter || i.subjectId === subjectFilter)
      .forEach((i) => {
        if (i.contentStandardCode && !map.has(i.contentStandardCode)) {
          map.set(i.contentStandardCode, { code: i.contentStandardCode, desc: i.contentStandardDescription || i.contentStandardCode })
        }
      })
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [questions, indicators, subjectFilter, strandFilter, subStrandFilter])

  // Curriculum-based strands if bank empty
  const curriculumStrands = useMemo(() => uniq(indicators.filter((i) => !subjectFilter || i.subjectId === subjectFilter).map((i) => i.strandName)), [indicators, subjectFilter])

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

  // Coverage dashboard data — PRD §11 metric: coverage ratio across content standards
  const coverage = useMemo(() => {
    if (!questions) return null
    const byCS = {}
    const byGrade = {}
    const bySubject = {}
    const byDifficulty = { easy: 0, medium: 0, hard: 0 }
    const byType = {}
    const byBloom = {}
    const byStatus = {}

    questions.forEach((q) => {
      const cs = q.contentStandardCode || 'missing'
      byCS[cs] = (byCS[cs] || 0) + 1
      byGrade[q.grade || 'unknown'] = (byGrade[q.grade || 'unknown'] || 0) + 1
      bySubject[q.subjectId || 'unknown'] = (bySubject[q.subjectId || 'unknown'] || 0) + 1
      if (q.difficulty) byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1
      byType[q.type || 'unknown'] = (byType[q.type || 'unknown'] || 0) + 1
      if (q.bloomLevel) byBloom[q.bloomLevel] = (byBloom[q.bloomLevel] || 0) + 1
      byStatus[q.status || 'published'] = (byStatus[q.status || 'published'] || 0) + 1
    })

    const totalCS = Object.keys(byCS).filter((k) => k !== 'missing').length
    const missingCS = byCS['missing'] || 0
    const publishedCount = byStatus['published'] || 0
    const pendingCount = byStatus['pending'] || 0

    // Coverage ratio: how many content standards have >=5 questions (PRD target)
    const wellCovered = Object.values(byCS).filter((count) => count >= 5).length

    return { byCS, byGrade, bySubject, byDifficulty, byType, byBloom, byStatus, totalCS, missingCS, publishedCount, pendingCount, wellCovered, total: questions.length }
  }, [questions])

  const visible = useMemo(
    () =>
      (questions ?? []).filter((q) => {
        if (gradeFilter && q.grade !== gradeFilter) return false
        if (subjectFilter && q.subjectId !== subjectFilter) return false
        if (strandFilter && q.strandName !== strandFilter) return false
        if (subStrandFilter && q.subStrandName !== subStrandFilter) return false
        if (contentStandardFilter && q.contentStandardCode !== contentStandardFilter) return false
        if (typeFilter) {
          if (typeFilter === 'objective') {
            if (!['objective', 'mcq', 'true_false', 'fill_blank'].includes(q.type)) return false
          } else if (typeFilter === 'essay') {
            if (!['essay', 'short', 'structured', 'long', 'essay_legacy'].includes(q.type) && !q.essayType) return false
          } else if (q.type !== typeFilter) return false
        }
        if (difficultyFilter && q.difficulty !== difficultyFilter) return false
        if (bloomFilter && q.bloomLevel !== bloomFilter) return false
        if (statusFilter && q.status !== statusFilter) return false
        if (mineOnly && q.authorId !== user?.uid) return false
        return true
      }),
    [questions, gradeFilter, subjectFilter, strandFilter, subStrandFilter, contentStandardFilter, typeFilter, difficultyFilter, bloomFilter, statusFilter, mineOnly, user],
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
        subtitle={`Every teacher adds ${WEEKLY_QUOTA} questions each week, tagged to content standard (PRD critical rule). ${coverage ? `${coverage.total} total, ${coverage.publishedCount} published, ${coverage.totalCS} standards covered.` : ''}`}
        action={
          <span className="flex flex-wrap gap-2">
            <Button to="/portal/questions/history" variant="secondary">History</Button>
            <Button to="/portal/questions/quiz" variant="secondary">Quiz maker</Button>
            <Button to="/portal/questions/generate" variant="secondary">Generate paper</Button>
            {isAdmin && <Button to="/portal/questions/admin" variant="secondary">Admin queue</Button>}
            <Button to="/portal/questions/new">+ Add question</Button>
          </span>
        }
      />

      {questions && (
        myWeekCount >= WEEKLY_QUOTA ? (
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
        )
      )}

      {/* Coverage Dashboard — PRD §11 */}
      {coverage && (
        <div className="card mb-6 overflow-hidden">
          <button type="button" onClick={() => setShowCoverage(!showCoverage)} className="flex w-full items-center justify-between border-b border-frame px-4 py-2.5 text-left">
            <span className="text-sm font-semibold text-slate-800">Coverage Dashboard — {coverage.total} Qs, {coverage.totalCS} standards, {coverage.wellCovered} well-covered (≥5 Qs)</span>
            <span className="text-xs text-slate-500">{showCoverage ? 'Hide' : 'Show'} details</span>
          </button>
          {showCoverage && (
            <div className="p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">By grade</p>
                  <ul className="space-y-0.5 text-xs text-slate-600">
                    {Object.entries(coverage.byGrade).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g, c]) => <li key={g} className="flex justify-between"><span>{g}</span><span className="font-medium">{c}</span></li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">By subject</p>
                  <ul className="space-y-0.5 text-xs text-slate-600">
                    {Object.entries(coverage.bySubject).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, c]) => <li key={s} className="flex justify-between"><span>{subjectName(s)}</span><span className="font-medium">{c}</span></li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">By difficulty</p>
                  <ul className="space-y-1 text-xs">
                    {Object.entries(coverage.byDifficulty).map(([d, c]) => <li key={d} className="flex justify-between"><span className={`rounded-full px-2 py-0.5 text-[11px] ${DIFFICULTY_COLOR[d] || 'bg-slate-100'}`}>{d}</span><span className="font-medium text-slate-600">{c}</span></li>)}
                  </ul>
                  <p className="mt-3 mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">By status</p>
                  <ul className="space-y-1 text-xs">
                    {Object.entries(coverage.byStatus).map(([s, c]) => <li key={s} className="flex justify-between"><span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_COLOR[s] || 'bg-slate-100'}`}>{s}</span><span className="font-medium text-slate-600">{c}</span></li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">By content standard (top)</p>
                  <ul className="space-y-0.5 text-xs text-slate-600 max-h-32 overflow-auto">
                    {Object.entries(coverage.byCS).filter(([k]) => k !== 'missing').sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cs, c]) => <li key={cs} className="flex justify-between"><span className="font-mono text-[11px]">{cs}</span><span className={`font-medium ${c >= 5 ? 'text-emerald-700' : 'text-amber-700'}`}>{c}</span></li>)}
                  </ul>
                  {coverage.missingCS > 0 && <p className="mt-2 text-xs text-red-600">⚠️ {coverage.missingCS} Qs missing contentStandardCode — must fix (PRD critical rule)</p>}
                </div>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">By type</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(coverage.byType).map(([t, c]) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{TYPE_LABEL[t] || t}: {c}</span>)}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">By Bloom</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(coverage.byBloom).map(([b, c]) => <span key={b} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{b}: {c}</span>)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isAdmin && overview && (
        <div className="card mb-6 overflow-hidden">
          <p className="border-b border-frame px-4 py-2.5 text-sm font-semibold text-slate-800">Weekly submissions — {weekKey}</p>
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

      {/* Filters — PRD: class, subject, strand, sub-strand, content standard, type, difficulty */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); resetWindow() }} className="w-auto py-1.5">
            <option value="">All classes</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
          <Select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setStrandFilter(''); setSubStrandFilter(''); setContentStandardFilter(''); resetWindow() }} className="w-auto py-1.5">
            <option value="">All subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={strandFilter} onChange={(e) => { setStrandFilter(e.target.value); setSubStrandFilter(''); setContentStandardFilter(''); resetWindow() }} className="w-auto py-1.5">
            <option value="">All strands</option>
            {uniq([...strands, ...curriculumStrands]).map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={subStrandFilter} onChange={(e) => { setSubStrandFilter(e.target.value); setContentStandardFilter(''); resetWindow() }} className="w-auto py-1.5">
            <option value="">All sub-strands</option>
            {subStrands.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={contentStandardFilter} onChange={(e) => { setContentStandardFilter(e.target.value); resetWindow() }} className="w-auto py-1.5">
            <option value="">All content standards</option>
            {contentStandards.map((cs) => <option key={cs.code} value={cs.code}>{cs.code}</option>)}
          </Select>
          <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); resetWindow() }} className="w-auto py-1.5">
            <option value="">All types</option>
            <option value="objective">Objective</option>
            <option value="mcq">MCQ</option>
            <option value="true_false">True/False</option>
            <option value="essay">Essay</option>
            <option value="short">Short</option>
            <option value="structured">Structured</option>
          </Select>
          <Select value={difficultyFilter} onChange={(e) => { setDifficultyFilter(e.target.value); resetWindow() }} className="w-auto py-1.5">
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Select value={bloomFilter} onChange={(e) => { setBloomFilter(e.target.value); resetWindow() }} className="w-auto py-1.5">
            <option value="">All Bloom</option>
            <option value="remember">Remember</option>
            <option value="understand">Understand</option>
            <option value="apply">Apply</option>
            <option value="analyze">Analyze</option>
            <option value="evaluate">Evaluate</option>
            <option value="create">Create</option>
          </Select>
          {isAdmin && (
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetWindow() }} className="w-auto py-1.5">
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
          )}
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); resetWindow() }} className="accent-brand" />
            Mine only
          </label>
          <button type="button" onClick={() => { setGradeFilter(''); setSubjectFilter(''); setStrandFilter(''); setSubStrandFilter(''); setContentStandardFilter(''); setTypeFilter(''); setDifficultyFilter(''); setBloomFilter(''); setStatusFilter(''); setMineOnly(false); resetWindow() }} className="ml-auto text-xs text-slate-500 hover:text-slate-700">Clear filters</button>
        </div>
        {contentStandardFilter && (
          <p className="mt-2 text-xs text-slate-500">
            Filtering by <span className="font-mono font-medium text-indigo-600">{contentStandardFilter}</span> — {contentStandards.find((c) => c.code === contentStandardFilter)?.desc?.slice(0, 120) || ''}
          </p>
        )}
      </div>

      {!questions ? (
        <SkeletonList count={5} />
      ) : visible.length === 0 ? (
        <EmptyState icon="question" title="No questions match" body={`No questions found for the selected filters. Try clearing filters or add questions tagged to ${contentStandardFilter || 'this scope'}.`} action={{ label: '+ Add question', to: '/portal/questions/new' }} />
      ) : (
        <>
          {truncated && (
            <p className="mb-2 text-xs text-amber-600">
              Showing {BANK_LIMIT} most recent — bank larger, narrow filters (content standard is most precise).
            </p>
          )}
          <p className="mb-2 text-xs text-slate-500">{visible.length} questions match (showing {Math.min(visibleCount, visible.length)})</p>
          <ul className="space-y-3">
            {visible.slice(0, visibleCount).map((q) => {
              const own = q.authorId === user?.uid
              return (
                <li key={q.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium whitespace-pre-wrap text-slate-800">{q.text || q.question}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="shrink-0">{TYPE_LABEL[q.type] ?? q.type} · {q.marks} {q.marks === 1 ? 'mark' : 'marks'}</Badge>
                      {q.difficulty && <span className={`rounded-full px-2 py-0.5 text-xs ${DIFFICULTY_COLOR[q.difficulty] || 'bg-slate-100'}`}>{q.difficulty}</span>}
                      {q.status && q.status !== 'published' && <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[q.status]}`}>{q.status}</span>}
                    </div>
                  </div>
                  {q.type === 'mcq' || q.type === 'objective' ? (
                    q.options?.length > 0 && (
                      <>
                        {expanded[q.id] && (
                          <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
                            {q.options.map((o, i) =>
                              o ? (
                                <li key={i}>
                                  <span className={(q.correctAnswer === LETTERS[i] || q.answer === LETTERS[i]) ? 'font-semibold text-emerald-700' : ''}>
                                    {LETTERS[i]}. {o}{(q.correctAnswer === LETTERS[i] || q.answer === LETTERS[i]) && ' ✓'}
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
                    )
                  ) : (
                    <>
                      {(q.markingGuide || q.answer) && expanded[q.id] && (
                        <p className="mt-2 text-sm text-slate-600"><span className="font-semibold">Guide:</span> {q.markingGuide || q.answer}</p>
                      )}
                      {(q.markingGuide || q.answer) && (
                        <button type="button" onClick={() => setExpanded((x) => ({ ...x, [q.id]: !x[q.id] }))} className="mt-1 text-xs text-indigo-600 hover:underline">
                          {expanded[q.id] ? 'Hide guide' : 'Show marking guide'}
                        </button>
                      )}
                    </>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="card-meta flex flex-wrap gap-1 items-center">
                      <span>{q.grade || '—'}</span>
                      <span>·</span>
                      <span>{subjectName(q.subjectId)}</span>
                      {q.strandName && <><span>·</span><span>{q.strandName}</span></>}
                      {q.subStrandName && <><span>›</span><span>{q.subStrandName}</span></>}
                      {q.contentStandardCode ? <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700">{q.contentStandardCode}</span> : <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700">MISSING CS</span>}
                      {q.indicatorCode && <span className="font-mono text-indigo-600">{q.indicatorCode}</span>}
                      {q.bloomLevel && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">{q.bloomLevel}</span>}
                      <span>· by <span className="font-medium text-slate-600">{q.authorName}</span></span>
                      <span>· {q.weekKey}</span>
                      {q.source && <span className="text-[11px]">· src: {q.source}</span>}
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
            <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Show {Math.min(PAGE_SIZE, visible.length - visibleCount)} more ({visible.length} total)
            </button>
          )}
        </>
      )}
    </div>
  )
}
