import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum } from '../hooks/useCurriculum'
import { SkeletonGrid } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import NotesTabs from '../components/NotesTabs'
import { useToast } from '../context/ToastContext'
import { Button, PageHeader, Grid } from '../components/ui'

const statusBadge = {
  published: { cls: 'bg-emerald-50 text-emerald-700', label: 'Advertised' },
  pending: { cls: 'bg-amber-50 text-amber-700', label: 'Pending approval' },
  private: { cls: 'bg-slate-100 text-slate-500', label: 'Private' },
}

export default function MyWall() {
  const { user, profile } = useAuth()
  const { subjects } = useCurriculum()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'
  const [notes, setNotes] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const name = profile?.name || user?.displayName || 'Teacher'

  useEffect(() => {
    if (!user) return
    let active = true
    getDocs(
      query(
        collection(db, 'notes'),
        where('authorId', '==', user.uid),
        limit(200),
      ),
    )
      .then((snap) => {
        if (!active) return
        const list = []
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
        list.sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
        )
        setNotes(list)
      })
      .catch(() => active && setNotes([]))
    return () => {
      active = false
    }
  }, [user, reloadKey])

  const subjectName = (id) =>
    subjects.find((s) => s.id === id)?.name ?? 'General'

  async function setStatus(n, status) {
    try {
      await updateDoc(doc(db, 'notes', n.id), { status })
      setReloadKey((k) => k + 1)
      toast.success(
        status === 'private'
          ? 'Note is now private.'
          : status === 'published'
            ? 'Note advertised.'
            : 'Note submitted for approval.',
      )
    } catch {
      toast.error('Failed to update note.')
    }
  }

  function handleDelete(n) {
    setConfirm({
      title: 'Delete this note?',
      body: 'The note and all its comments will be permanently removed.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'notes', n.id))
          setReloadKey((k) => k + 1)
          toast.success('Note deleted.')
        } catch {
          toast.error('Failed to delete note.')
        }
      },
    })
  }

  function Card({ n }) {
    const badge = statusBadge[n.status] ?? statusBadge.private
    const advertised = n.status === 'published' || n.status === 'pending'
    return (
      <div className="card flex h-full flex-col p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/portal/notes/${n.id}`}
            className="font-semibold text-slate-900 hover:text-brand"
          >
            {n.title}
          </Link>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}
          >
            {badge.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {subjectName(n.subjectId)}
          {n.className && ` · ${n.className}`} · {n.sections?.length ?? 0} section
          {(n.sections?.length ?? 0) === 1 ? '' : 's'}
        </p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">
          {n.summary || n.sections?.[0]?.body || n.sections?.[0]?.heading || ''}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Link
            to={`/portal/notes/${n.id}/edit`}
            className="text-slate-500 hover:text-brand hover:underline"
          >
            Edit
          </Link>
          {advertised ? (
            <button
              type="button"
              onClick={() => setStatus(n, 'private')}
              className="text-slate-500 hover:text-brand hover:underline"
            >
              Make private
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStatus(n, isAdmin ? 'published' : 'pending')}
              className="text-brand hover:underline"
            >
              Advertise
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDelete(n)}
            className="text-slate-500 hover:text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />

      <PageHeader
        title={`${name}’s Wall`}
        subtitle="Your study notes. Private by default — advertise any note to share it with the network."
        action={<Button to="/portal/notes/new">+ New note</Button>}
      />

      <NotesTabs />

      {!notes ? (
        <SkeletonGrid count={6} />
      ) : notes.length === 0 ? (
        <EmptyState
          icon="notes"
          title="Your wall is empty"
          body="Create student study notes with the multi-step editor. They stay private here until you advertise them."
          action={{ label: '+ New note', to: '/portal/notes/new' }}
        />
      ) : (
        <Grid>
          {notes.map((n) => (
            <Card key={n.id} n={n} />
          ))}
        </Grid>
      )}
    </div>
  )
}
