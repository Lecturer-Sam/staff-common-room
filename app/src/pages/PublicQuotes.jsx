import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuotes, quoteOfTheDay } from '../hooks/useWisdom'
import { SkeletonList } from '../components/Skeleton'

const CARD_THEMES = [
  { grad: 'from-indigo-50 to-violet-50', mark: 'text-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  { grad: 'from-amber-50 to-orange-50', mark: 'text-amber-200', badge: 'bg-amber-100 text-amber-700' },
  { grad: 'from-emerald-50 to-teal-50', mark: 'text-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  { grad: 'from-rose-50 to-pink-50', mark: 'text-rose-200', badge: 'bg-rose-100 text-rose-700' },
  { grad: 'from-sky-50 to-cyan-50', mark: 'text-sky-200', badge: 'bg-sky-100 text-sky-700' },
  { grad: 'from-fuchsia-50 to-purple-50', mark: 'text-fuchsia-200', badge: 'bg-fuchsia-100 text-fuchsia-700' },
]
function themeFor(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CARD_THEMES[h % CARD_THEMES.length]
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
          <Link to="/quotes" className="font-medium text-indigo-700">Quotes</Link>
          <Link to="/calendar" className="hover:text-indigo-700">Calendar</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/portal" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">Open portal</Link>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">Member login</Link>
              <Link to="/signup" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">Apply to join</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

const BATCH = 12

export default function PublicQuotes() {
  const { user } = useAuth()
  const quotes = useQuotes()
  const qotd = quoteOfTheDay(quotes)
  const [visible, setVisible] = useState(BATCH)

  return (
    <div className="min-h-screen bg-white">
      <PublicNav user={user} />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 text-center">
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-amber-600">Inspiration for educators</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Quotes &amp; Wisdom</h1>
          <p className="mt-2 text-slate-500">Curated quotes for teachers, shared by the Beacon Educational Consult network.</p>
        </div>

        {/* Quote of the Day */}
        {qotd && (
          <div className={`mb-10 rounded-2xl bg-gradient-to-br ${themeFor(qotd.id).grad} p-6 shadow-sm ring-1 ring-indigo-100`}>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${themeFor(qotd.id).badge}`}>Quote of the Day</span>
            <p className={`mt-3 text-2xl font-medium leading-relaxed text-slate-800 ${themeFor(qotd.id).mark} before:content-['"'] after:content-['"']`}>
              {qotd.text}
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-500">— {qotd.author}</p>
            {qotd.category && (
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${themeFor(qotd.id).badge}`}>{qotd.category}</span>
            )}
          </div>
        )}

        {/* All quotes grid */}
        {!quotes ? (
          <SkeletonList count={6} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quotes.slice(0, visible).map((q) => {
                const theme = themeFor(q.id)
                return (
                  <div key={q.id} className={`flex flex-col rounded-2xl bg-gradient-to-br ${theme.grad} p-4 ring-1 ring-inset ring-slate-100`}>
                    <p className="flex-1 text-sm leading-relaxed text-slate-700 italic">"{q.text}"</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-500">— {q.author}</p>
                      {q.category && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${theme.badge}`}>{q.category}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {visible < quotes.length && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + BATCH)}
                  className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Load more quotes
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Beacon Educational Consult
      </footer>
    </div>
  )
}
