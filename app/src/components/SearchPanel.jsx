import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum, useGrades } from '../hooks/useCurriculum'
import { Skeleton, SkeletonList } from './Skeleton'
import EmptyState from './EmptyState'
import { Button, Input, Select } from './ui'

const GROUP_LIMIT = 8
const QUESTION_LIMIT = 1000

// Search results are expensive to assemble (schemes + plans + question bank),
// and this panel renders on the Feed as well as /portal/search. We therefore:
//  1. fetch ONLY when a query is actually submitted (never on mount), and
//  2. keep a module-level cache with a short TTL so re-mounts / repeat
//     searches within a session cost zero extra reads.
// The TTL trades a little freshness for a large read-bill reduction.
const CACHE_TTL_MS = 5 * 60 * 1000
let searchCache = null // { fetchedAt, schemes, plans, questions, questionsTruncated }

const norm = (s) => String(s ?? '').toLowerCase()

/** Merge public + own docs from a collection into one deduplicated list. */
async function fetchMine(colName, uid, statusField) {
  const col = collection(db, colName)
  const constraint =
    statusField === 'status'
      ? where('status', '==', 'published')
      : where('visibility', '==', 'public')
  const snaps = await Promise.all([
    getDocs(query(col, constraint, limit(200))),
    getDocs(query(col, where('authorId', '==', uid), limit(100))),
  ])
  const map = new Map()
  for (const snap of snaps) {
    snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }))
  }
  return [...map.values()]
}

/** Load (or reuse) the searchable content set for this session. */
async function loadSearchContent(uid) {
  if (searchCache && Date.now() - searchCache.fetchedAt < CACHE_TTL_MS) {
    return searchCache
  }
  const [schemes, plans, qSnap] = await Promise.all([
    fetchMine('weekly_forecasts', uid, 'visibility').catch((err) => {
      console.error('Search schemes fetch error:', err)
      return []
    }),
    fetchMine('lesson_plans', uid, 'visibility').catch((err) => {
      console.error('Search plans fetch error:', err)
      return []
    }),
    getDocs(query(collection(db, 'questions'), limit(QUESTION_LIMIT))).catch(
      (err) => {
        console.error('Search questions fetch error:', err)
        return null
      },
    ),
  ])
  const questions = []
  if (qSnap) qSnap.forEach((d) => questions.push({ id: d.id, ...d.data() }))
  searchCache = {
    fetchedAt: Date.now(),
    schemes,
    plans,
    questions,
    // Firestore gives no total count — a full page means there may be more.
    questionsTruncated: !!qSnap && qSnap.size >= QUESTION_LIMIT,
  }
  return searchCache
}

function Snippet({ text, q }) {
  const t = String(text ?? '')
  const i = norm(t).indexOf(norm(q))
  if (i === -1) return <>{t.slice(0, 120)}</>
  const start = Math.max(0, i - 40)
  return (
    <>
      {start > 0 && '…'}
      {t.slice(start, i)}
      <mark className="rounded bg-amber-100 px-0.5">
        {t.slice(i, i + q.length)}
      </mark>
      {t.slice(i + q.length, i + q.length + 80)}
      {i + q.length + 80 < t.length && '…'}
    </>
  )
}

function Group({ title, items, children }) {
  const [showAll, setShowAll] = useState(false)
  if (items.length === 0) return null
  const visible = showAll ? items : items.slice(0, GROUP_LIMIT)
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
        {title} ({items.length})
      </h2>
      <ul className="space-y-2">{visible.map(children)}</ul>
      {items.length > GROUP_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-2 text-xs text-indigo-600 hover:underline"
        >
          {showAll ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  )
}

const card = 'card block p-3 transition-shadow hover:shadow-md'

/**
 * Full-text search across curriculum indicators, schemes, lesson plans and
 * questions. Rendered both on the /portal/search route and inside the Feed's
 * left column. `autoFocus` is off on the dashboard so it doesn't grab focus.
 */
export default function SearchPanel({ autoFocus = true }) {
  const { user } = useAuth()
  const grades = useGrades()
  const [grade, setGrade] = useState('B1')
  const { subjects, indicators } = useCurriculum(grade)
  const [searchParams, setSearchParams] = useSearchParams()
  const [input, setInput] = useState(searchParams.get('q') ?? '')

  const q = (searchParams.get('q') ?? '').trim()

  // Fetch searchable content lazily — only once a query is submitted — and
  // reuse the module-level session cache on repeat searches/re-mounts.
  // While a stale cache refreshes in the background, the previous results
  // stay visible (no skeleton flicker); first-ever search shows skeletons.
  const [content, setContent] = useState(searchCache)

  useEffect(() => {
    if (!user || !q) return
    if (searchCache && Date.now() - searchCache.fetchedAt < CACHE_TTL_MS) return
    let active = true
    loadSearchContent(user.uid)
      .then((c) => active && setContent(c))
      .catch((err) => console.error('Search content load failed:', err))
    return () => {
      active = false
    }
  }, [user, q])

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id

  const results = useMemo(() => {
    if (!q) return null
    const n = norm(q)
    const subjectName = (id) => subjects.find((x) => x.id === id)?.name ?? id
    const has = (...fields) => fields.some((f) => norm(f).includes(n))

    const inds = indicators.filter((i) =>
      has(i.code, i.description, i.strandName, i.subStrandName, i.keywords),
    )
    const schemes = (content?.schemes ?? []).filter(
      (s) =>
        (!s.kind || s.kind === 'scheme') &&
        (has(subjectName(s.subjectId), s.notes) ||
          (s.rows ?? []).some((r) =>
            has(r.strand, r.subStrand, r.indicators, r.contentStandards),
          )),
    )
    const plans = (content?.plans ?? []).filter(
      (p) =>
        (!p.kind || p.kind === 'plan-v2') &&
        (has(p.title, subjectName(p.subjectId)) ||
          has(
            p.header?.strand,
            p.header?.subStrand,
            p.header?.indicator,
            p.header?.contentStandard,
            p.header?.newWords,
          ) ||
          (p.days ?? []).some((d) => has(d.starter, d.main, d.plenary))),
    )
    const questions = (content?.questions ?? []).filter((x) =>
      has(x.question, x.answer, x.strandName, x.subStrandName, x.indicatorCode),
    )
    return { inds, schemes, plans, questions }
  }, [q, indicators, content, subjects])

  function submit(e) {
    e.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (input.trim()) next.set('q', input.trim())
    else next.delete('q')
    setSearchParams(next)
  }

  const total = results
    ? results.inds.length +
      results.schemes.length +
      results.plans.length +
      results.questions.length
    : 0

  return (
    <div className="search-panel">
      <form onSubmit={submit} className="search-panel__form">
        <Select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          title="Class for curriculum indicator results"
          className="py-2.5"
          style={{ width: '90px', minWidth: '90px', flexShrink: 0 }}
        >
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.id}
            </option>
          ))}
        </Select>
        <Input
          autoFocus={autoFocus}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search indicators, schemes, lesson plans, questions…"
          className="flex-1 py-2.5"
        />
        <Button type="submit" size="lg">Search</Button>
      </form>

      {!q ? (
        <EmptyState
          icon="search"
          title="Search across everything"
          body="Try an indicator code (e.g. B1.1.1.1.1), a topic like fractions or festivals, or any keyword from a plan, scheme or question."
        />
      ) : !results || !content ? (
        <div className="space-y-3">
          <Skeleton height="h-3" width="w-1/4" className="mb-4" />
          <SkeletonList count={4} />
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon="search"
          title={`No results for "${q}"`}
          body="Try a different keyword, indicator code, or topic."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {total} result{total === 1 ? '' : 's'} for "{q}"
          </p>

          <Group title={`Curriculum indicators (${grade})`} items={results.inds}>
            {(i) => (
              <li key={i.id}>
                <Link
                  to={`/portal/curriculum/${i.subjectId}?grade=${grade}`}
                  className={card}
                >
                  <p className="text-sm text-slate-700">
                    <span className="mr-1.5 font-mono text-xs font-semibold text-indigo-700">
                      {i.code}
                    </span>
                    <Snippet text={i.description} q={q} />
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {i.subjectName} · {i.strandName} › {i.subStrandName}
                  </p>
                </Link>
              </li>
            )}
          </Group>

          <Group title="Schemes of learning" items={results.schemes}>
            {(s) => (
              <li key={s.id}>
                <Link to={`/portal/forecasts/${s.id}`} className={card}>
                  <p className="text-sm font-medium text-slate-800">
                    {subjectName(s.subjectId)} — Term {s.term}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">by {s.authorName}</p>
                </Link>
              </li>
            )}
          </Group>

          <Group title="Lesson plans" items={results.plans}>
            {(p) => (
              <li key={p.id}>
                <Link to={`/portal/plans/${p.id}`} className={card}>
                  <p className="text-sm font-medium text-slate-800">{p.title}</p>
                  <p className="mt-1 text-xs text-slate-400">by {p.authorName}</p>
                </Link>
              </li>
            )}
          </Group>

          <Group title="Questions" items={results.questions}>
            {(x) => (
              <li key={x.id}>
                <Link to="/portal/questions" className={card}>
                  <p className="text-sm text-slate-700">
                    <Snippet text={x.question} q={q} />
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {subjectName(x.subjectId)} · {x.type?.toUpperCase()} · by{' '}
                    {x.authorName}
                  </p>
                </Link>
              </li>
            )}
          </Group>

          {content?.questionsTruncated && (
            <p className="mt-2 text-xs text-slate-400">
              Question results are capped at the first {QUESTION_LIMIT} bank
              entries — narrow your search if something seems missing.
            </p>
          )}
        </>
      )}
    </div>
  )
}
