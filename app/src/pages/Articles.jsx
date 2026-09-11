import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, deleteDoc, doc, getDocs, limit, query, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum } from '../hooks/useCurriculum'
import { SkeletonGrid } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../context/ToastContext'
import { Button, Card, Chip, Badge, PageHeader, Grid } from '../components/ui'

function fmtDate(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CATEGORIES = ['All', 'Teaching Tips', 'Classroom Management', 'Curriculum Insights', 'Professional Development', 'Announcements', 'General']

export default function Articles() {
  const { user, profile } = useAuth()
  const { subjects } = useCurriculum()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'

  const [articles, setArticles] = useState(null)
  const [catFilter, setCatFilter] = useState('All')
  const [mineOnly, setMineOnly] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (!user) return
    let active = true
    async function fetch() {
      const col = collection(db, 'articles')
      const snaps = await Promise.all([
        getDocs(query(col, where('visibility', '==', 'public'), limit(200))),
        getDocs(query(col, where('visibility', '==', 'members'), limit(200))),
        getDocs(query(col, where('authorId', '==', user.uid), limit(100))),
      ])
      if (!active) return
      const map = new Map()
      for (const snap of snaps) snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }))
      setArticles([...map.values()].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)))
    }
    fetch()
    return () => { active = false }
  }, [user, reloadKey])

  const visible = useMemo(() => {
    if (!articles) return null
    return articles.filter((a) =>
      (catFilter === 'All' || a.category === catFilter) &&
      (!mineOnly || a.authorId === user?.uid),
    )
  }, [articles, catFilter, mineOnly, user])

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? ''

  function handleDelete(a) {
    setConfirm({
      title: 'Delete this article?',
      body: 'This cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'articles', a.id))
          setReloadKey((k) => k + 1)
          toast.success('Article deleted.')
        } catch { toast.error('Failed to delete article.') }
      },
    })
  }

  return (
    <div>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />

      <PageHeader
        title="Articles"
        subtitle="Insights and tips written by consortium teachers."
        action={<Button to="/portal/articles/new">+ Write article</Button>}
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} className="accent-brand" />
          My articles
        </label>
      </div>

      {!visible ? (
        <SkeletonGrid count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="document"
          title="No articles yet"
          body="Be the first to share your knowledge with the network."
          action={{ label: '+ Write article', to: '/portal/articles/new' }}
        />
      ) : (
        <Grid as="ul">
          {visible.map((a) => {
            const own = a.authorId === user?.uid
            return (
              <Card
                as="li"
                key={a.id}
                hover
                banner={
                  <Link to={`/portal/articles/${a.id}`} className="block">
                    <h2 className="line-clamp-2 font-semibold leading-snug hover:underline">{a.title}</h2>
                  </Link>
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{a.category}</Badge>
                  {a.subjectId && <Badge variant="neutral">{subjectName(a.subjectId)}</Badge>}
                  {a.visibility === 'members' && <Badge variant="warn">Members only</Badge>}
                </div>
                {a.excerpt && <p className="mt-2 line-clamp-3 text-sm text-slate-500">{a.excerpt}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-frame pt-4">
                  <p className="card-meta">by {a.authorName} · {fmtDate(a.createdAt)}</p>
                  {(own || isAdmin) && (
                    <span className="flex gap-3">
                      <Link to={`/portal/articles/${a.id}/edit`} className="text-xs text-slate-500 hover:text-brand hover:underline">Edit</Link>
                      <button type="button" onClick={() => handleDelete(a)} className="text-xs text-slate-500 hover:text-red-600 hover:underline">Delete</button>
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </Grid>
      )}
    </div>
  )
}
