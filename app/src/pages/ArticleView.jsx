import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  arrayRemove, arrayUnion, deleteDoc, doc, getDoc, increment, updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmModal from '../components/ConfirmModal'
import { Button, Card, Badge } from '../components/ui'

function fmtDate(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export default function ArticleView() {
  const { articleId } = useParams()
  const { user, profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'

  const [article, setArticle] = useState(undefined)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    getDoc(doc(db, 'articles', articleId)).then((snap) => {
      setArticle(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
  }, [articleId])

  async function toggleLike() {
    if (!article || !user) return
    const liked = (article.likedBy ?? []).includes(user.uid)
    await updateDoc(doc(db, 'articles', articleId), {
      likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      likesCount: increment(liked ? -1 : 1),
    })
    setArticle((a) => ({
      ...a,
      likedBy: liked
        ? (a.likedBy ?? []).filter((id) => id !== user.uid)
        : [...(a.likedBy ?? []), user.uid],
      likesCount: (a.likesCount ?? 0) + (liked ? -1 : 1),
    }))
  }

  function handleDelete() {
    setConfirm({
      title: 'Delete this article?',
      body: 'This cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'articles', articleId))
          toast.success('Article deleted.')
          navigate('/portal/articles')
        } catch { toast.error('Failed to delete article.') }
      },
    })
  }

  if (article === undefined) return <p className="text-slate-400">Loading article…</p>
  if (article === null) return <p className="text-slate-500">Article not found.</p>

  const own = article.authorId === user?.uid
  const liked = (article.likedBy ?? []).includes(user?.uid ?? '')
  const likeCount = article.likedBy?.length ?? article.likesCount ?? 0

  return (
    <div className="mx-auto max-w-2xl">
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />

      <nav className="mb-4 text-sm text-slate-500">
        <Link to="/portal/articles" className="text-brand hover:underline">Articles</Link> / {article.title}
      </nav>

      <Card as="article" padding="p-6 sm:p-8">
        {/* Meta */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge>{article.category}</Badge>
          {article.visibility === 'members' && <Badge variant="warn">Members only</Badge>}
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{article.title}</h1>
        <p className="mt-2 card-meta">By <span className="font-medium text-slate-600">{article.authorName}</span> · {fmtDate(article.createdAt)}</p>

        {/* Body — rendered HTML from Tiptap */}
        <div
          className="prose prose-sm mt-6 max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-brand prose-blockquote:border-slate-300 prose-blockquote:text-slate-600 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:text-slate-800"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-frame pt-5">
          <button
            type="button"
            onClick={toggleLike}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              liked ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <HeartIcon filled={liked} />
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </button>

          {(own || isAdmin) && (
            <div className="flex gap-3">
              <Button to={`/portal/articles/${articleId}/edit`} variant="secondary">Edit</Button>
              <Button onClick={handleDelete} variant="danger">Delete</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
