import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  ACADEMIC_YEAR, BECE, TERMS,
  daysUntil, fmtDate, fmtRange,
  getAcademicStatus, termProgress,
} from '../lib/academicCalendar'

function pluralDays(n) {
  const abs = Math.abs(n)
  return `${abs} day${abs === 1 ? '' : 's'}`
}

function PublicNav({ user }) {
  return (
    <header className="sticky top-0 z-10 border-b border-frame bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/beaconlogo.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight text-indigo-700">Beacon Educational</p>
            <p className="text-sm font-bold leading-tight text-slate-700">Consult</p>
          </div>
          <span className="text-sm font-bold text-indigo-700 sm:hidden">BEC</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
          <Link to="/" className="hover:text-indigo-700">Home</Link>
          <Link to="/vacancies" className="hover:text-indigo-700">Vacancies</Link>
          <Link to="/quotes" className="hover:text-indigo-700">Quotes</Link>
          <Link to="/calendar" className="font-medium text-indigo-700">Calendar</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/portal" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
              Open portal
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Member login
              </Link>
              <Link to="/signup" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                Apply to join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function DateRow({ label, value, highlight }) {
  return (
    <div className={`${highlight ? 'rounded-lg bg-amber-50 px-3 py-2' : ''}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium ${highlight ? 'text-amber-800' : 'text-slate-700'}`}>{value}</dd>
    </div>
  )
}

function StatusBanner({ status }) {
  const configs = {
    'in-term': { cls: 'border-emerald-100 bg-emerald-50', heading: `School is in session — ${status.term?.label}`, body: `Week ${status.weekNumber} of ${status.term?.weeks} · ${status.daysToClose > 0 ? `Closes in ${pluralDays(status.daysToClose)} (${fmtDate(status.term?.closes)})` : 'Last day of term today!'}`, iconColor: 'text-emerald-600', iconPath: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> },
    'mid-term': { cls: 'border-amber-100 bg-amber-50', heading: 'Mid-term break', body: `School resumes in ${pluralDays(status.daysToReopen)} on ${fmtDate(status.reopenDate)}`, iconColor: 'text-amber-600', iconPath: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></> },
    vacation: { cls: 'border-sky-100 bg-sky-50', heading: 'School vacation', body: status.nextTerm ? `${status.nextTerm.label} opens in ${pluralDays(status.daysToReopen)} on ${fmtDate(status.reopenDate)}` : 'End of academic year', iconColor: 'text-sky-600', iconPath: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></> },
    'before-year': { cls: 'border-indigo-100 bg-indigo-50', heading: 'Academic year upcoming', body: `First term opens in ${pluralDays(status.daysToOpen)} on ${fmtDate(status.openDate)}`, iconColor: 'text-indigo-600', iconPath: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
    'year-ended': { cls: 'border-slate-100 bg-slate-50', heading: 'Academic year ended', body: 'The 2026/2027 academic year is complete.', iconColor: 'text-slate-400', iconPath: <circle cx="12" cy="12" r="10"/> },
  }
  const cfg = configs[status.type]
  if (!cfg) return null
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${cfg.cls}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.cls}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${cfg.iconColor}`}>{cfg.iconPath}</svg>
      </div>
      <div>
        <p className="font-semibold text-slate-800">{cfg.heading}</p>
        <p className="mt-0.5 text-sm text-slate-600">{cfg.body}</p>
      </div>
    </div>
  )
}

function TermCard({ term, status }) {
  const progress = termProgress(term)
  const isActive = status.type === 'in-term' && status.term?.id === term.id
  const isPast = new Date() > term.closes
  const isFuture = new Date() < term.opens
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${isActive ? 'border-indigo-200 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{term.label}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : isPast ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-700'}`}>
          {isActive ? 'In session' : isPast ? 'Completed' : `${term.weeks} weeks`}
        </span>
      </div>
      {progress !== null && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Term progress</span><span>{progress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <DateRow label="Reopening" value={fmtDate(term.opens)} />
        <DateRow label="Closing" value={fmtDate(term.closes)} />
        <DateRow label="Vacation starts" value={fmtDate(term.vacationStart)} />
        {term.vacationEnd && <DateRow label="Vacation ends" value={fmtDate(term.vacationEnd)} />}
        {term.midTermBreak && (
          <div className="sm:col-span-2">
            <DateRow label="Mid-term break" value={fmtRange(term.midTermBreak.start, term.midTermBreak.end)} highlight />
          </div>
        )}
      </dl>
      {isFuture && <p className="mt-3 text-sm text-slate-500">Opens in <span className="font-semibold text-indigo-700">{pluralDays(daysUntil(term.opens))}</span></p>}
      {isActive && <p className="mt-3 text-sm text-slate-500">Closes in <span className="font-semibold text-indigo-700">{pluralDays(daysUntil(term.closes))}</span></p>}
    </div>
  )
}

export default function PublicCalendar() {
  const { user } = useAuth()
  const status = getAcademicStatus()
  return (
    <div className="public-shell">
      <PublicNav user={user} />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6">
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-amber-600">Academic Year {ACADEMIC_YEAR}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">School Calendar</h1>
          <p className="mt-2 text-slate-500">Ghana Basic Schools — Beacon Educational Consult consortium</p>
        </div>
        <div className="mb-6"><StatusBanner status={status} /></div>
        <div className="space-y-4">
          {TERMS.map((term) => <TermCard key={term.id} term={term} status={status} />)}
          {/* BECE */}
          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-rose-600">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">{BECE.label}</h3>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <DateRow label="Start" value={`Wednesday, ${fmtDate(BECE.start)}`} />
              <DateRow label="End" value={fmtDate(BECE.end)} />
              <div className="sm:col-span-2"><DateRow label="Duration" value={fmtRange(BECE.start, BECE.end)} highlight /></div>
            </dl>
          </div>
          {/* Notes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-900">Additional Notes</h3>
            <ul className="space-y-2">
              {['Public holidays within the academic year must be observed.', 'Each term includes a two-day mid-term break.', 'Heads of schools, teachers, parents, and guardians are urged to take note and prepare adequately for the academic year.'].map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />{note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Beacon Educational Consult · NaCCA, Ministry of Education, Ghana
      </footer>
    </div>
  )
}
