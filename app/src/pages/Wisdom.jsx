import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  useQuotes,
  useTheories,
  quoteOfTheDay,
  theoryOfTheWeek,
  useQuoteLikes,
  toggleQuoteLike,
} from '../hooks/useWisdom'
import { SkeletonList } from '../components/Skeleton'

/* ── Icons ──────────────────────────────────────────────────────────────── */
function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

/* ── Copy-to-clipboard button ───────────────────────────────────────────── */
function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600) }
    catch { /* clipboard blocked */ }
  }
  return (
    <button type="button" onClick={copy} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition ${className}`}>
      {copied ? (
        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M20 6L9 17l-5-5" /></svg>Copied</>
      ) : (
        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>
      )}
    </button>
  )
}

/* ── Quote of the Day hero ──────────────────────────────────────────────── */
function QuoteHero({ quote, liked, count, onLike, canLike }) {
  const attribution = [quote.author, quote.source].filter(Boolean).join(' · ')
  const shareText = `"${quote.text}" — ${quote.author}${quote.source ? ` (${quote.source})` : ''}`
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-6 text-white shadow-sm sm:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -top-4 left-4 select-none font-serif text-[7rem] leading-none text-white/15">&ldquo;</span>
      <p className="relative text-[11px] font-semibold uppercase tracking-wide text-indigo-100">Quote of the Day</p>
      <blockquote className="relative mt-3 text-lg font-medium leading-relaxed sm:text-xl">{quote.text}</blockquote>
      <p className="relative mt-4 text-sm font-semibold text-indigo-100">— {attribution}</p>
      {quote.meaning && <p className="relative mt-2 text-sm text-indigo-100/90">{quote.meaning}</p>}
      <div className="relative mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onLike(quote.id)}
          disabled={!canLike}
          aria-pressed={liked}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25 disabled:opacity-50"
        >
          <HeartIcon filled={liked} />
          {liked ? 'Liked' : 'Like'}{count > 0 ? ` · ${count}` : ''}
        </button>
        <CopyButton text={shareText} className="bg-white/15 text-white hover:bg-white/25" />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   THEORIES — 2/3 + 1/3 split layout
═══════════════════════════════════════════════════════════════════ */

/**
 * Left panel: full detail card for the selected theory.
 * Takes ~2/3 of the width.
 */
function TheoryDetail({ theory, isFeatured }) {
  if (!theory) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center">
        <div>
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-12 w-12 text-slate-300">
            <path d="M24 4a20 20 0 1 0 0 40A20 20 0 0 0 24 4Z" />
            <path d="M24 16v8M24 32h.02" />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-500">Select a theory from the list</p>
          <p className="mt-1 text-xs text-slate-400">Click any item on the right to read its full detail</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {isFeatured && (
          <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            Theory of the Week
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
          {theory.category}
        </span>
      </div>

      {/* Title + theorist */}
      <h2 className="mt-3 text-xl font-bold text-slate-900">{theory.title}</h2>
      <p className="mt-0.5 text-sm font-semibold text-indigo-600">{theory.theorist}</p>

      {/* Definition */}
      <p className="mt-4 text-sm leading-relaxed text-slate-700">{theory.definition}</p>

      {/* Ghanaian classroom application */}
      <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          In the Ghanaian Classroom
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-900">{theory.classroom}</p>
      </div>

      {/* Tags */}
      {theory.tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {theory.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Right panel: scrollable list of all theories.
 * Each item shows the theory name (bold) + proponent underneath.
 * Entire list sits on a slate background.
 * Takes ~1/3 of the width.
 */
function TheoryList({ theories, selectedId, onSelect, featuredId }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-200/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          All theories ({theories.length})
        </p>
      </div>

      {/* Scrollable list */}
      <ul className="flex-1 divide-y divide-slate-200 overflow-y-auto" style={{ maxHeight: '520px' }}>
        {theories.map((t) => {
          const isActive = t.id === selectedId
          const isFeatured = t.id === featuredId
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-200/70 text-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-bold leading-snug ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {t.title}
                    </p>
                    <p className={`mt-0.5 text-xs ${isActive ? 'text-indigo-200' : 'text-indigo-600'}`}>
                      {t.theorist}
                    </p>
                  </div>
                  {isFeatured && !isActive && (
                    <span className="mt-0.5 shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                      This week
                    </span>
                  )}
                  {isFeatured && isActive && (
                    <span className="mt-0.5 shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      This week
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════ */
export default function Wisdom() {
  const { user } = useAuth()
  const quotes = useQuotes()
  const theories = useTheories()
  const likes = useQuoteLikes()
  const uid = user?.uid

  const toggle = useCallback((id) => toggleQuoteLike(id, uid, likes), [uid, likes])
  const isLiked = useCallback((id) => !!uid && (likes[id]?.likedBy ?? []).includes(uid), [uid, likes])
  const countOf = useCallback((id) => likes[id]?.count ?? 0, [likes])

  const [tab, setTab] = useState('quotes')
  const [theorySearch, setTheorySearch] = useState('')
  const [selectedTheory, setSelectedTheory] = useState(null)

  const qotd = useMemo(() => quoteOfTheDay(quotes), [quotes])
  const totw = useMemo(() => theoryOfTheWeek(theories), [theories])
  const canLike = !!user

  // Auto-select theory-of-the-week when theories load
  const [autoSelected, setAutoSelected] = useState(false)
  if (theories && totw && !autoSelected) {
    setAutoSelected(true)
    setSelectedTheory(totw)
  }

  // Filter theories by search
  const term = theorySearch.trim().toLowerCase()
  const filteredTheories = useMemo(() => {
    if (!theories) return []
    if (!term) return theories
    return theories.filter((t) =>
      [t.title, t.theorist, t.definition, t.classroom, t.category, ...(t.tags ?? [])]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(term)),
    )
  }, [theories, term])

  // Keep theory-of-the-week at the top of the list
  const orderedTheories = useMemo(() => {
    if (!totw || term) return filteredTheories
    return [totw, ...filteredTheories.filter((t) => t.id !== totw.id)]
  }, [filteredTheories, totw, term])

  const loading = quotes === null || theories === null

  return (
    <div className="mx-auto max-w-5xl">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="page-title">Quote of the Day</h1>
        <p className="page-subtitle">
          Daily wisdom, proverbs and teaching theories to inspire your practice.
        </p>
      </div>

      {/* Quote of the Day hero — always shown, one quote at a time */}
      {qotd && (
        <QuoteHero
          quote={qotd}
          liked={isLiked(qotd.id)}
          count={countOf(qotd.id)}
          onLike={toggle}
          canLike={canLike}
        />
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {[
          ['quotes', 'Quotes & Proverbs'],
          ['theories', `Teaching Theories${theories ? ` (${theories.length})` : ''}`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Quotes tab ───────────────────────────────────────────────────── */}
      {tab === 'quotes' && (
        <div className="mt-6">
          {/* Informational note — no list, just the daily quote */}
          <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3.5 text-sm text-indigo-800">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">A new quote every day</p>
              <p className="mt-0.5 text-indigo-700">
                The quote above changes automatically at midnight. Come back tomorrow for a fresh one. Like it to save it, or copy it to share with colleagues.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Theories tab ─────────────────────────────────────────────────── */}
      {tab === 'theories' && (
        <div className="mt-5">
          {/* Search */}
          <div className="mb-4">
            <input
              type="search"
              value={theorySearch}
              onChange={(e) => { setTheorySearch(e.target.value); setSelectedTheory(null) }}
              placeholder="Search theories, theorists, topics…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:max-w-sm"
            />
          </div>

          {loading ? (
            <SkeletonList count={4} />
          ) : orderedTheories.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nothing matches "{theorySearch}".</p>
          ) : (
            /* ── 2/3 + 1/3 split ── */
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

              {/* Left — detail panel (2/3) */}
              <div className="lg:w-0 lg:flex-[2]">
                <TheoryDetail
                  theory={selectedTheory}
                  isFeatured={!!totw && selectedTheory?.id === totw.id}
                />
              </div>

              {/* Right — list panel (1/3) */}
              <div className="lg:w-0 lg:flex-[1]">
                <TheoryList
                  theories={orderedTheories}
                  selectedId={selectedTheory?.id}
                  onSelect={setSelectedTheory}
                  featuredId={totw?.id}
                />
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  )
}
