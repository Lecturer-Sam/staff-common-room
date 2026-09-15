import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { isoWeekKey, WEEKLY_QUOTA } from '../lib/week'
import { getAcademicStatus, termProgress, fmtDate } from '../lib/academicCalendar'
import { useQuotes, quoteOfTheDay, useQuoteLikes, topLikedQuotes } from '../hooks/useWisdom'
import { Card, PageHeader } from '../components/ui'
import SearchPanel from '../components/SearchPanel'

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */

function fmtShort(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD WIDGETS
═══════════════════════════════════════════════════════════════════ */

function CalendarWidget() {
  const status = getAcademicStatus()
  const configs = {
    'in-term':     { bg: 'bg-emerald-50 border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: `${status.term?.label} — Wk ${status.weekNumber}`, sub: status.daysToClose > 0 ? `Closes in ${status.daysToClose}d · ${fmtDate(status.term?.closes)}` : 'Last day today' },
    'mid-term':    { bg: 'bg-amber-50 border-amber-100',   badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',   label: 'Mid-term break',  sub: `Resumes in ${status.daysToReopen}d` },
    vacation:      { bg: 'bg-sky-50 border-sky-100',       badge: 'bg-sky-100 text-sky-700',       dot: 'bg-sky-500',     label: 'Vacation',        sub: status.nextTerm ? `${status.nextTerm.label} in ${status.daysToReopen}d` : 'End of year' },
    'before-year': { bg: 'bg-emerald-50 border-emerald-100', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Year upcoming',   sub: `Opens in ${status.daysToOpen}d` },
    'year-ended':  { bg: 'bg-slate-100 border-slate-200',   badge: 'bg-slate-200 text-slate-500',   dot: 'bg-slate-400',   label: 'Year ended',      sub: '2026/2027 complete' },
  }
  const cfg = configs[status.type]
  if (!cfg) return null
  const progress = status.type === 'in-term' && status.term ? termProgress(status.term) : null

  return (
    <Link to="/portal/calendar" className={`block h-full rounded-xl border px-4 py-4 transition hover:brightness-95 ${cfg.bg}`}>
      <p className="section-heading mb-2">School calendar</p>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {status.type === 'in-term' && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${cfg.dot}`} />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.badge}`}>{cfg.label}</span>
      </div>
      <p className="mt-1.5 truncate text-xs text-slate-500">{cfg.sub}</p>
      {progress !== null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Link>
  )
}

function ProgressWidget({ info }) {
  return (
    <Link
      to="/portal/progress"
      className="block rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:brightness-95"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="section-heading">Your progress</p>
        <span className="text-[11px] font-semibold text-brand">Tracker →</span>
      </div>
      {info && info.taught > 0 ? (
        <p className="text-xs text-slate-500">
          Term {info.term} · {info.taught} subject-week
          {info.taught === 1 ? '' : 's'} taught this term.
        </p>
      ) : (
        <p className="text-xs text-slate-400">
          No weeks tracked yet — open the tracker to log what you've taught.
        </p>
      )}
    </Link>
  )
}

function QuoteOfDayPanel() {
  const quotes = useQuotes()
  const quote = quoteOfTheDay(quotes)
  if (!quote) return null
  return (
    <Card className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="section-heading">Quote of the Day</p>
        <Link to="/portal/wisdom" className="text-[11px] font-semibold text-brand hover:underline">More →</Link>
      </div>
      <p className="text-sm italic leading-relaxed text-slate-700">"{quote.text}"</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">— {quote.author}</p>
    </Card>
  )
}

function TopQuotesPanel() {
  const quotes = useQuotes()
  const likes = useQuoteLikes()
  const top = topLikedQuotes(quotes, likes, 3)
  if (top.length === 0) return null
  return (
    <Card>
      <p className="section-heading mb-3">Most loved</p>
      <ol className="space-y-2.5">
        {top.map(({ quote, count }, i) => (
          <li key={quote.id} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs italic leading-snug text-slate-700">"{quote.text}"</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">— {quote.author}</p>
            </div>
            <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-rose-500">
              <HeartIcon /> {count}
            </span>
          </li>
        ))}
      </ol>
      <Link to="/portal/wisdom" className="mt-3 inline-block text-[11px] font-semibold text-brand hover:underline">See all →</Link>
    </Card>
  )
}

const QUICK_ACTIONS = [
  { to: '/portal/curriculum', label: 'Curriculum' },
  { to: '/portal/forecasts/new', label: 'New scheme' },
  { to: '/portal/plans/new', label: 'New lesson plan' },
  { to: '/portal/questions/new', label: 'Add question' },
  { to: '/portal/notes/new', label: 'New note' },
]

function QuickActions() {
  return (
    <Card>
      <p className="section-heading mb-3">Quick actions</p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="rounded-lg bg-brand px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-hover shadow-sm"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </Card>
  )
}

/** Recent items from a collection (articles / advertised notes). */
function RecentPanel({ title, allTo, newTo, newLabel, itemBase, colName, statusFilter }) {
  const [items, setItems] = useState(null)

  useEffect(() => {
    let active = true
    getDocs(query(collection(db, colName), statusFilter, limit(5)))
      .then((snap) => {
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        setItems(list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)))
      })
      .catch(() => active && setItems([]))
    return () => { active = false }
  }, [colName]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <p className="section-heading">{title}</p>
        <Link to={allTo} className="text-[11px] font-semibold text-brand hover:underline">All →</Link>
      </div>

      {!items ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-xs text-slate-400">Nothing yet.</p>
          <Link to={newTo} className="mt-1.5 inline-block text-xs font-semibold text-brand hover:underline">{newLabel} →</Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((it) => (
            <li key={it.id} className="py-2.5 first:pt-0 last:pb-0">
              <Link to={`${itemBase}/${it.id}`} className="group block">
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-slate-800 transition-colors group-hover:text-brand">
                  {it.title}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{it.authorName} · {fmtShort(it.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE — Home dashboard
═══════════════════════════════════════════════════════════════════ */
export default function Feed() {
  const { user, profile } = useAuth()
  const [weekCount, setWeekCount] = useState(null)
  const [progressInfo, setProgressInfo] = useState(null)

  const firstName = (profile?.name || user?.displayName || 'Teacher').split(' ')[0]

  useEffect(() => {
    if (!user) return
    let active = true
    getDoc(doc(db, 'progress', user.uid)).then((snap) => {
      if (!active || !snap.exists()) return
      const weeks = snap.data().weeks ?? {}
      let term = 1
      for (const t of [3, 2, 1]) {
        if (Object.entries(weeks).some(([k, v]) => k.endsWith(`_T${t}`) && v?.length > 0)) { term = t; break }
      }
      const taught = Object.entries(weeks).filter(([k]) => k.endsWith(`_T${term}`)).reduce((s, [, v]) => s + (v?.length ?? 0), 0)
      setProgressInfo({ term, taught })
    }).catch(() => {})
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (!user) return
    let active = true
    getDocs(query(collection(db, 'questions'), where('authorId', '==', user.uid), where('weekKey', '==', isoWeekKey())))
      .then((snap) => active && setWeekCount(snap.size)).catch(() => {})
    return () => { active = false }
  }, [user])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle="Your teaching hub — plan lessons, build assessments, and track the term."
      />

      {/* Questions nudge (progress now lives in the right-rail widget) */}
      {weekCount !== null && weekCount < WEEKLY_QUOTA && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Question Bank: {weekCount}/{WEEKLY_QUOTA} questions this week.{' '}
          <Link to="/portal/questions/new" className="font-semibold underline underline-offset-2">
            Add {WEEKLY_QUOTA - weekCount} more
          </Link>
        </div>
      )}

      {/* Two columns: search (main) + dashboard sections (right rail) */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <p className="section-heading mb-3">Search everything</p>
          <SearchPanel autoFocus={false} />
        </section>

        <aside className="space-y-4">
          <CalendarWidget />
          <ProgressWidget info={progressInfo} />
          <QuickActions />
          <QuoteOfDayPanel />
          <RecentPanel
            title="Recent articles"
            allTo="/portal/articles"
            newTo="/portal/articles/new"
            newLabel="Write the first"
            itemBase="/portal/articles"
            colName="articles"
            statusFilter={where('visibility', '==', 'public')}
          />
          <RecentPanel
            title="Study notes"
            allTo="/portal/notes"
            newTo="/portal/notes/new"
            newLabel="Add the first"
            itemBase="/portal/notes"
            colName="notes"
            statusFilter={where('status', '==', 'published')}
          />
          <TopQuotesPanel />
        </aside>
      </div>
    </div>
  )
}
