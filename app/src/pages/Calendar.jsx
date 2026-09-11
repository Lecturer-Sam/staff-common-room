import {
  ACADEMIC_YEAR,
  BECE,
  TERMS,
  daysUntil,
  fmtDate,
  fmtRange,
  getAcademicStatus,
  termProgress,
} from '../lib/academicCalendar'

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function pluralDays(n) {
  const abs = Math.abs(n)
  return `${abs} day${abs === 1 ? '' : 's'}`
}

/* ── Status banner ────────────────────────────────────────────────────────── */
function StatusBanner({ status }) {
  if (status.type === 'in-term') {
    const { term, weekNumber, daysToClose } = status
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-emerald-600">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-emerald-800">School is in session — {term.label}</p>
          <p className="mt-0.5 text-sm text-emerald-700">
            Week <strong>{weekNumber}</strong> of <strong>{term.weeks}</strong> ·{' '}
            {daysToClose > 0
              ? <>{pluralDays(daysToClose)} until closing (<strong>{fmtDate(term.closes)}</strong>)</>
              : 'Last day of term today!'}
          </p>
        </div>
      </div>
    )
  }

  if (status.type === 'mid-term') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-600">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-amber-800">Mid-term break</p>
          <p className="mt-0.5 text-sm text-amber-700">
            School resumes in <strong>{pluralDays(status.daysToReopen)}</strong> on{' '}
            <strong>{fmtDate(status.reopenDate)}</strong>
          </p>
        </div>
      </div>
    )
  }

  if (status.type === 'vacation') {
    const { nextTerm, daysToReopen, reopenDate } = status
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-sky-600">
            <path d="M12 2a10 10 0 0 1 10 10" /><path d="M12 6v6l4 2" /><circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-sky-800">School vacation</p>
          <p className="mt-0.5 text-sm text-sky-700">
            {nextTerm?.label} opens in{' '}
            <strong>{pluralDays(daysToReopen)}</strong> on{' '}
            <strong>{fmtDate(reopenDate)}</strong>
          </p>
        </div>
      </div>
    )
  }

  if (status.type === 'before-year') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-indigo-600">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-indigo-800">Academic year hasn't started yet</p>
          <p className="mt-0.5 text-sm text-indigo-700">
            First term opens in <strong>{pluralDays(status.daysToOpen)}</strong> on{' '}
            <strong>{fmtDate(status.openDate)}</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-500">
      The 2026/2027 academic year has ended.
    </div>
  )
}

/* ── Term card ─────────────────────────────────────────────────────────────── */
function TermCard({ term, status }) {
  const progress = termProgress(term)
  const isActive = status.type === 'in-term' && status.term.id === term.id
  const isMidTerm = status.type === 'mid-term' && status.term.id === term.id
  const isPast = new Date() > term.closes
  const isFuture = new Date() < term.opens

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
      isActive || isMidTerm
        ? 'border-indigo-200 ring-1 ring-indigo-200'
        : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{term.label}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isActive || isMidTerm
            ? 'bg-indigo-50 text-indigo-700'
            : isPast
              ? 'bg-slate-100 text-slate-400'
              : 'bg-amber-50 text-amber-700'
        }`}>
          {isActive ? 'In session' : isMidTerm ? 'Mid-term break' : isPast ? 'Completed' : 'Upcoming'}
        </span>
      </div>

      {/* Progress bar — only shown when in term */}
      {progress !== null && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Term progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Date grid */}
      <dl className="mt-4 grid grid-cols-1 gap-y-2.5 gap-x-4 sm:grid-cols-2">
        <DateRow label="Reopening" value={fmtDate(term.opens)} icon="open" />
        <DateRow label="Closing" value={fmtDate(term.closes)} icon="close" />
        <DateRow
          label="Vacation starts"
          value={fmtDate(term.vacationStart)}
          icon="vacation"
        />
        {term.vacationEnd && (
          <DateRow
            label="Vacation ends"
            value={fmtDate(term.vacationEnd)}
            icon="vacation"
          />
        )}
        {term.midTermBreak && (
          <div className="sm:col-span-2">
            <DateRow
              label="Mid-term break"
              value={fmtRange(term.midTermBreak.start, term.midTermBreak.end)}
              icon="break"
              highlight
            />
          </div>
        )}
      </dl>

      {/* Countdown pill */}
      {isFuture && (
        <p className="mt-4 text-sm text-slate-500">
          Opens in <span className="font-semibold text-indigo-700">{pluralDays(daysUntil(term.opens))}</span>
        </p>
      )}
      {(isActive || isMidTerm) && (
        <p className="mt-4 text-sm text-slate-500">
          Closes in <span className="font-semibold text-indigo-700">{pluralDays(daysUntil(term.closes))}</span>
        </p>
      )}
    </div>
  )
}

function DateRow({ label, value, highlight }) {
  return (
    <div className={`flex items-start gap-2 ${highlight ? 'rounded-lg bg-amber-50 px-3 py-2' : ''}`}>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className={`mt-0.5 text-sm font-medium ${highlight ? 'text-amber-800' : 'text-slate-700'}`}>{value}</dd>
      </div>
    </div>
  )
}

/* ── BECE card ─────────────────────────────────────────────────────────────── */
function BeceCard() {
  const days = daysUntil(BECE.start)
  const isActive = days <= 0 && daysUntil(BECE.end) >= 0
  const isPast = daysUntil(BECE.end) < 0

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${
      isActive
        ? 'border-rose-200 bg-rose-50 ring-1 ring-rose-200'
        : isPast
          ? 'border-slate-200 bg-white opacity-60'
          : 'border-rose-100 bg-white'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-rose-600">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900">{BECE.label}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isActive ? 'bg-rose-100 text-rose-700' : isPast ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-700'
        }`}>
          {isActive ? 'Ongoing' : isPast ? 'Completed' : 'Upcoming'}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-y-2.5 sm:grid-cols-2">
        <DateRow label="Start date" value={`Wednesday, ${fmtDate(BECE.start)}`} />
        <DateRow label="End date" value={fmtDate(BECE.end)} />
        <div className="sm:col-span-2">
          <DateRow label="Duration" value={fmtRange(BECE.start, BECE.end)} highlight />
        </div>
      </dl>

      {!isPast && !isActive && (
        <p className="mt-4 text-sm text-slate-500">
          In <span className="font-semibold text-rose-700">{pluralDays(days)}</span>
        </p>
      )}
    </div>
  )
}

/* ── Notes card ───────────────────────────────────────────────────────────── */
function NotesCard() {
  const notes = [
    'Public holidays within the academic year must be observed.',
    'Each term includes a two-day mid-term break.',
    'Heads of schools, teachers, parents, and guardians are urged to take note and prepare adequately for the academic year.',
  ]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-900">Additional Notes</h3>
      <ul className="space-y-2">
        {notes.map((note, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
            {note}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Calendar() {
  const status = getAcademicStatus()

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Academic Calendar</h1>
        <p className="page-subtitle">
          {ACADEMIC_YEAR} Ghana Basic Schools — Beacon Educational Consult
        </p>
      </div>

      {/* Live status banner */}
      <div className="mb-6">
        <StatusBanner status={status} />
      </div>

      {/* Term cards */}
      <div className="space-y-4">
        {TERMS.map((term) => (
          <TermCard key={term.id} term={term} status={status} />
        ))}

        {/* BECE */}
        <BeceCard />

        {/* Notes */}
        <NotesCard />
      </div>
    </div>
  )
}
