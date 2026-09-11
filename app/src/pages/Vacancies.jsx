import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, deleteDoc, doc, getDocs, limit, query, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../context/ToastContext'
import { Button, PageHeader } from '../components/ui'

const badge = {
  published: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  closed: 'bg-slate-100 text-slate-500',
}

function VacancyCard({ v, isAdmin, uid, onAction }) {
  const own = v.authorId === uid
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{v.title}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badge[v.status] ?? badge.pending}`}>{v.status}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {v.schoolName} · {v.location}{v.level && ` · ${v.level}`} · {v.employmentType}
      </p>
      {v.subjectsText && <p className="mt-0.5 text-xs text-slate-500">Subjects: {v.subjectsText}</p>}
      <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">{v.description}</p>
      <p className="mt-2 text-sm text-slate-700"><span className="font-semibold">Apply:</span> {v.applyContact}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          Posted by {v.authorName}{v.deadline && ` · Deadline ${v.deadline}`}
        </span>
        <span className="flex gap-2">
          {isAdmin && v.status === 'pending' && (
            <button type="button" onClick={() => onAction(v, { status: 'published' })} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
              Approve & publish
            </button>
          )}
          {(own || isAdmin) && v.status === 'published' && (
            <button type="button" onClick={() => onAction(v, { status: 'closed' })} className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100">
              Mark closed
            </button>
          )}
          {(own || isAdmin) && v.status === 'closed' && (
            <button type="button" onClick={() => onAction(v, { status: isAdmin ? 'published' : 'pending' })} className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100">
              Reopen
            </button>
          )}
          {(own || isAdmin) && (
            <>
              <Link to={`/portal/vacancies/${v.id}/edit`} className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100">Edit</Link>
              <button type="button" onClick={() => onAction(v, null)} className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

export default function Vacancies() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'
  const [vacancies, setVacancies] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (!user) return
    let active = true
    async function fetchVacancies() {
      const col = collection(db, 'vacancies')
      const queries = [
        getDocs(query(col, where('status', '==', 'published'), limit(100))),
        getDocs(query(col, where('authorId', '==', user.uid), limit(100))),
      ]
      if (isAdmin) queries.push(getDocs(query(col, where('status', '==', 'pending'), limit(100))))
      const snaps = await Promise.all(queries)
      if (!active) return
      const map = new Map()
      for (const snap of snaps) snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }))
      setVacancies([...map.values()].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)))
    }
    fetchVacancies()
    return () => { active = false }
  }, [user, isAdmin, reloadKey])

  function handleAction(v, patch) {
    if (patch === null) {
      // delete — show modal
      setConfirm({
        title: 'Delete this vacancy?',
        body: 'It will be removed from the public website.',
        onConfirm: async () => {
          try {
            await deleteDoc(doc(db, 'vacancies', v.id))
            setReloadKey((k) => k + 1)
            toast.success('Vacancy deleted.')
          } catch {
            toast.error('Failed to delete vacancy.')
          }
        },
      })
    } else {
      // status update — fire immediately with toast
      updateDoc(doc(db, 'vacancies', v.id), patch)
        .then(() => {
          setReloadKey((k) => k + 1)
          const msg = patch.status === 'published' ? 'Vacancy published.' : patch.status === 'closed' ? 'Vacancy closed.' : 'Vacancy updated.'
          toast.success(msg)
        })
        .catch(() => toast.error('Failed to update vacancy.'))
    }
  }

  const pending = (vacancies ?? []).filter((v) => v.status === 'pending')
  const rest = (vacancies ?? []).filter((v) => v.status !== 'pending')

  return (
    <div>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />

      <PageHeader
        title="Vacancies"
        subtitle="Teaching posts from member schools. Published adverts appear on the public website."
        action={<Button to="/portal/vacancies/new">+ Post vacancy</Button>}
      />

      {!vacancies ? (
        <SkeletonList count={3} />
      ) : vacancies.length === 0 ? (
        <EmptyState icon="vacancies" title="No vacancies posted yet" body="Teaching positions from consortium schools will appear here once posted." action={{ label: '+ Post vacancy', to: '/portal/vacancies/new' }} />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-2 section-heading text-amber-600">Awaiting approval ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map((v) => <VacancyCard key={v.id} v={v} isAdmin={isAdmin} uid={user.uid} onAction={handleAction} />)}
              </div>
            </section>
          )}
          <section className="space-y-3">
            {rest.map((v) => <VacancyCard key={v.id} v={v} isAdmin={isAdmin} uid={user.uid} onAction={handleAction} />)}
          </section>
        </div>
      )}
    </div>
  )
}
