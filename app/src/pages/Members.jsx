import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useAllSubjects } from '../hooks/useCurriculum'
import { Chip, Badge } from '../components/ui'
import { DEFAULT_COMMISSION_RATE } from '../lib/deliveries'

const badge = {
  approved: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  suspended: 'bg-red-50 text-red-700',
}

export default function Members() {
  const { user, profile } = useAuth()
  const subjects = useAllSubjects()
  const [members, setMembers] = useState(null)
  const [filter, setFilter] = useState('all')

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setMembers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
      )
    })
    return unsub
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <p className="text-slate-500">
        This page is only available to administrators.
      </p>
    )
  }

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id
  const setStatus = (m, status) => updateDoc(doc(db, 'users', m.id), { status })
  const setCommission = (m, pct) => {
    const rate = Math.max(0, Math.min(100, Number(pct) || 0)) / 100
    return updateDoc(doc(db, 'users', m.id), { commissionRate: rate })
  }

  const visible =
    members?.filter((m) => filter === 'all' || (m.status ?? 'pending') === filter) ??
    null
  const pendingCount =
    members?.filter((m) => (m.status ?? 'pending') === 'pending').length ?? 0

  return (
    <div>
      <h1 className="page-title">Members</h1>
      <p className="mt-1 mb-4 text-sm text-slate-500">
        Approve or suspend consortium members.
        {pendingCount > 0 && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {pendingCount} pending
          </span>
        )}
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {['all', 'pending', 'approved', 'suspended'].map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Chip>
        ))}
      </div>

      {!visible ? (
        <p className="text-slate-400">Loading members…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-500">No members in this category.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((m) => {
            const status = m.status ?? 'pending'
            return (
              <li
                key={m.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {m.name || '(no name)'}
                    {m.role === 'admin' && (
                      <Badge className="ml-2 rounded">Admin</Badge>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.email}
                    {m.school && ` · ${m.school}`}
                    {m.subjects?.length > 0 &&
                      ` · ${m.subjects.map(subjectName).join(', ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.role !== 'admin' && status === 'approved' && (
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <span>Commission</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={Math.round(
                          (m.commissionRate ?? DEFAULT_COMMISSION_RATE) * 100,
                        )}
                        onBlur={(e) => setCommission(m, e.target.value)}
                        className="w-14 rounded-md border border-slate-300 px-2 py-1 text-right text-xs text-slate-700"
                      />
                      <span>%</span>
                    </label>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badge[status] ?? badge.pending}`}
                  >
                    {status}
                  </span>
                  {m.id !== user.uid && (
                    <>
                      {status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => setStatus(m, 'approved')}
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                      )}
                      {status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => setStatus(m, 'suspended')}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Suspend
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
