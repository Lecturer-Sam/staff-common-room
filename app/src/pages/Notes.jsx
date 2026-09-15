import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, doc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum } from '../hooks/useCurriculum'
import { SkeletonGrid } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import NotesTabs from '../components/NotesTabs'
import { useToast } from '../context/ToastContext'
import { Button, Badge, Select, PageHeader, Grid } from '../components/ui'

export default function Notes() {
  const { user, profile } = useAuth()
  const { subjects } = useCurriculum()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'
  const [notes, setNotes] = useState(null)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!user) return
    let active = true
    async function fetchNotes() {
      const col = collection(db, 'notes')
      const queries = [
        getDocs(query(col, where('status', '==', 'published'), limit(200))),
      ]
      if (isAdmin) {
        queries.push(
          getDocs(query(col, where('status', '==', 'pending'), limit(100))),
        )
      }
      const snaps = await Promise.all(queries)
      if (!active) return
      const map = new Map()
      for (const snap of snaps) {
        snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }))
      }
      setNotes(
        [...map.values()].sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
        ),
      )
    }
    fetchNotes()
    return () => {
      active = false
    }
  }, [user, isAdmin, reloadKey])

  const pending = useMemo(
    () => (notes ?? []).filter((n) => n.status === 'pending'),
    [notes],
  )
  const visible = useMemo(
    () =>
      (notes ?? []).filter(
        (n) =>
          n.status === 'published' &&
          (!subjectFilter || n.subjectId === subjectFilter),
      ),
    [notes, subjectFilter],
  )

  const subjectName = (id) =>
    subjects.find((s) => s.id === id)?.name ?? 'General'

  async function approve(n) {
    try {
      await updateDoc(doc(db, 'notes', n.id), { status: 'published' })
      setReloadKey((k) => k + 1)
      toast.success('Note published.')
    } catch {
      toast.error('Failed to publish note.')
    }
  }

  function Card({ n, showApprove }) {
    return (
      <div className="card flex h-full flex-col p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/portal/notes/${n.id}`}
            className="font-semibold text-slate-900 hover:text-brand"
          >
            {n.title}
          </Link>
          {showApprove && <Badge variant="warn">pending</Badge>}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {subjectName(n.subjectId)}
          {n.className && ` · ${n.className}`} · {n.sections?.length ?? 0} section
          {(n.sections?.length ?? 0) === 1 ? '' : 's'} · by{' '}
          <Link
            to={`/portal/authors/${n.authorId}`}
            className="font-medium text-brand hover:underline"
          >
            {n.authorName}
          </Link>
        </p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">
          {n.summary || n.sections?.[0]?.body || n.sections?.[0]?.heading || ''}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">👍 {n.likes?.length ?? 0}</p>
          {showApprove && (
            <button
              type="button"
              onClick={() => approve(n)}
              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Approve
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Study Notes"
        subtitle="Advertised student study notes shared across the network."
        action={<Button to="/portal/notes/new">+ New note</Button>}
      />

      <NotesTabs />

      {isAdmin && pending.length > 0 && (
        <div className="mb-6">
          <h2 className="section-heading mb-2 text-amber-600">
            Awaiting approval ({pending.length})
          </h2>
          <Grid>
            {pending.map((n) => (
              <Card key={n.id} n={n} showApprove />
            ))}
          </Grid>
        </div>
      )}

      <div className="mb-4">
        <Select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="w-auto py-1.5"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {!notes ? (
        <SkeletonGrid count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="notes"
          title="No advertised notes yet"
          body="Study notes members choose to advertise appear here for the whole network."
          action={{ label: '+ New note', to: '/portal/notes/new' }}
        />
      ) : (
        <Grid>
          {visible.map((n) => (
            <Card key={n.id} n={n} />
          ))}
        </Grid>
      )}
    </div>
  )
}
