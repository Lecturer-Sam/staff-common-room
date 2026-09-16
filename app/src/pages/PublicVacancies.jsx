import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'

function notExpired(v) {
  if (!v.deadline) return true
  return v.deadline >= new Date().toISOString().slice(0, 10)
}

export default function PublicVacancies() {
  const { user } = useAuth()
  const [vacancies, setVacancies] = useState(null)

  useEffect(() => {
    let active = true
    getDocs(
      query(
        collection(db, 'vacancies'),
        where('status', '==', 'published'),
        limit(100),
      ),
    )
      .then((snap) => {
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        setVacancies(
          list
            .filter(notExpired)
            .sort(
              (a, b) =>
                (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
            ),
        )
      })
      .catch(() => active && setVacancies([]))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="public-shell">
      {/* Public nav (mirrors the landing page) */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold text-indigo-700">
            Beacon<span className="text-slate-500">Consult</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                to="/portal"
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Open portal
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Member login
                </Link>
                <Link
                  to="/signup"
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Apply to join
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="mb-2 text-sm font-semibold tracking-wide text-amber-600 uppercase">
          Opportunities
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Teaching vacancies
        </h1>
        <p className="mt-3 text-slate-600">
          Open positions posted by schools in the Beacon Educational Consult
          network. Apply directly using the contact details in each advert.
        </p>

        <div className="mt-8 space-y-4">
          {!vacancies ? (
            <SkeletonList count={3} />
          ) : vacancies.length === 0 ? (
            <EmptyState
              icon="vacancies"
              title="No open vacancies right now"
              body="Check back soon — member schools post new openings regularly."
            />
          ) : (
            vacancies.map((v) => (
              <article
                key={v.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {v.title}
                  </h2>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {v.employmentType}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {v.schoolName} · {v.location}
                  {v.level && ` · ${v.level}`}
                </p>
                {v.subjectsText && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Subjects: {v.subjectsText}
                  </p>
                )}
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
                  {v.description}
                </p>
                <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-800">
                    How to apply:
                  </span>{' '}
                  <span className="whitespace-pre-wrap text-slate-600">
                    {v.applyContact}
                  </span>
                  {v.deadline && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Application deadline: {v.deadline}
                    </p>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-10 rounded-xl border border-frame bg-surface p-6 text-center">
          <p className="text-sm text-slate-700">
            Beacon consortium members get the full teaching portal — curriculum,
            schemes, lesson plans and assessment tools.
          </p>
          <Link
            to={user ? '/portal' : '/login'}
            className="mt-3 inline-block rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            {user ? 'Open portal' : 'Member login'}
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Beacon Educational Consult
      </footer>
    </div>
  )
}
