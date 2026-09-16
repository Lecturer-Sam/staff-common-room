import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

function fmtDate(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
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
          <Link to="/articles" className="font-medium text-indigo-700">Articles</Link>
          <Link to="/quotes" className="hover:text-indigo-700">Quotes</Link>
          <Link to="/calendar" className="hover:text-indigo-700">Calendar</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/portal" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">Open portal</Link>
          ) : (
            <Link to="/login" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">Member login</Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default function PublicArticleView() {
  const { articleId } = useParams()
  const { user } = useAuth()
  const [article, setArticle] = useState(undefined)

  useEffect(() => {
    getDoc(doc(db, 'articles', articleId)).then((snap) => {
      const a = snap.exists() ? { id: snap.id, ...snap.data() } : null
      // Only show public articles to non-members
      if (a && a.visibility !== 'public') setArticle(null)
      else setArticle(a)
    })
  }, [articleId])

  if (article === undefined) return (
    <div className="public-shell">
      <PublicNav user={user} />
      <p className="mt-16 text-center text-slate-400">Loading…</p>
    </div>
  )
  if (article === null) return (
    <div className="public-shell">
      <PublicNav user={user} />
      <div className="mt-16 text-center">
        <p className="text-slate-500">Article not found or not publicly available.</p>
        <Link to="/articles" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">← Back to articles</Link>
      </div>
    </div>
  )

  return (
    <div className="public-shell">
      <PublicNav user={user} />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <Link to="/articles" className="mb-6 inline-block text-sm text-indigo-600 hover:underline">← Back to articles</Link>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{article.category}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{article.title}</h1>
          <p className="mt-2 text-sm text-slate-400">By <span className="font-medium text-slate-600">{article.authorName}</span> · {fmtDate(article.createdAt)}</p>
          <div
            className="prose prose-sm mt-6 max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-indigo-600 prose-blockquote:border-indigo-300 prose-blockquote:text-slate-600 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:text-indigo-700"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
        {!user && (
          <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center">
            <p className="text-sm text-slate-700">Want to write your own articles? Join the consortium.</p>
            <Link to="/signup" className="mt-3 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Apply to join</Link>
          </div>
        )}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Beacon Educational Consult
      </footer>
    </div>
  )
}
