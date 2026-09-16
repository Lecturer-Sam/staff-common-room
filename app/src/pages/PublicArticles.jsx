import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { Button, Badge } from '../components/ui'

function fmtDate(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
          <Link to="/articles" className="font-medium text-indigo-700">Articles</Link>
          <Link to="/quotes" className="hover:text-indigo-700">Quotes</Link>
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

export default function PublicArticles() {
  const { user } = useAuth()
  const [articles, setArticles] = useState(null)

  useEffect(() => {
    let active = true
    getDocs(query(collection(db, 'articles'), where('visibility', '==', 'public'), limit(100)))
      .then((snap) => {
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        setArticles(list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)))
      })
      .catch(() => active && setArticles([]))
    return () => { active = false }
  }, [])

  return (
    <div className="public-shell">
      <PublicNav user={user} />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-slate-500">From our teachers</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Articles</h1>
          <p className="mt-2 text-slate-500">Insights, tips and classroom experiences shared by Beacon Educational Consult teachers.</p>
        </div>

        {!articles ? (
          <SkeletonList count={5} />
        ) : articles.length === 0 ? (
          <EmptyState icon="document" title="No articles yet" body="Check back soon — our teachers are writing!" />
        ) : (
          <ul className="space-y-5">
            {articles.map((a) => (
              <li key={a.id} className="card p-5 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{a.category}</Badge>
                </div>
                <Link to={`/articles/${a.id}`} className="mt-2 block">
                  <h2 className="text-lg font-bold text-slate-900 hover:text-brand transition-colors">{a.title}</h2>
                </Link>
                {a.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{a.excerpt}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-xs text-slate-400">By <span className="font-medium text-slate-600">{a.authorName}</span> · {fmtDate(a.createdAt)}</p>
                  <Link to={`/articles/${a.id}`} className="ml-auto text-xs font-semibold text-brand hover:underline">Read article →</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <div className="border-t border-frame bg-surface py-10 text-center">
        <p className="text-sm text-slate-600">Are you a consortium member? You can write and publish your own articles.</p>
        <Button to={user ? '/portal/articles/new' : '/login'} size="lg" className="mt-3">
          {user ? 'Write an article' : 'Member login'}
        </Button>
      </div>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Beacon Educational Consult
      </footer>
    </div>
  )
}
