import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useCurriculum } from '../hooks/useCurriculum'
import { assignSchool, generateJoinCode, joinSchoolWithCode, setUserRole } from '../lib/schools'
import { Badge, Button, Card, Input, Select } from '../components/ui'
import EmptyState from '../components/EmptyState'
import ConfirmModal from '../components/ConfirmModal'
import SchoolCoverage from '../components/SchoolCoverage'

const LIST_CAP = 50

function fmtDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function ContentRow({ to, title, meta }) {
  return (
    <li>
      <Link to={to} className="card block p-3 transition-shadow hover:shadow-md">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{meta}</p>
      </Link>
    </li>
  )
}

/**
 * Shown to members with no school: join one by entering its code
 * (Phase 2.5 self-service join).
 */
function JoinSchoolCard() {
  const { user } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function join(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await joinSchoolWithCode(user, code)
      toast.success('Welcome to your school! The workspace is loading…')
    } catch (err) {
      toast.error(err?.message ?? 'Could not join with that code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <EmptyState
        icon="search"
        title="You're not in a school yet"
        body="Enter the join code your school gave you, or ask a Beacon admin to add you."
      />
      <Card className="mt-4">
        <form onSubmit={join} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label className="label-caps" htmlFor="join-code">School join code</label>
            <Input
              id="join-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7PMQ2XR"
              className="font-mono tracking-widest"
              maxLength={10}
            />
          </div>
          <Button type="submit" disabled={busy || !code.trim()}>
            {busy ? 'Joining…' : 'Join school'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

/**
 * A school's private workspace (Phase 2 multi-tenancy).
 *
 * Mounted twice:
 *   /portal/school              → the member's own school
 *   /portal/schools/:schoolId   → platform admins managing any school
 *
 * Shows the members of the school (with add/remove for managers) and the
 * content shared inside it (schemes & lesson plans with visibility 'school',
 * notes with status 'school').
 */
export default function SchoolWorkspace() {
  const { schoolId: paramId } = useParams()
  const { profile, isSchoolAdmin } = useAuth()
  const toast = useToast()
  const { subjects } = useCurriculum()
  const isAdmin = profile?.role === 'admin'

  const schoolId = paramId ?? profile?.schoolId ?? null
  const isMember = !!profile?.schoolId && profile.schoolId === schoolId
  const canManage = isAdmin || (isSchoolAdmin && isMember)

  const [school, setSchool] = useState(undefined) // undefined=loading, null=missing
  const [users, setUsers] = useState(null)
  const [schemes, setSchemes] = useState(null)
  const [plans, setPlans] = useState(null)
  const [notes, setNotes] = useState(null)
  const [candidateId, setCandidateId] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [codeBusy, setCodeBusy] = useState(false)

  // School doc + all users (membership + add-member candidates).
  useEffect(() => {
    if (!schoolId) return
    const unsub = onSnapshot(doc(db, 'schools', schoolId), (snap) => {
      setSchool(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
    getDocs(collection(db, 'users'))
      .then((snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setUsers([]))
    return unsub
  }, [schoolId])

  // School-scoped content. Equality-only queries — no composite indexes.
  useEffect(() => {
    if (!schoolId) return
    let active = true
    const collect = (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      return list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
    }
    getDocs(
      query(collection(db, 'weekly_forecasts'), where('schoolId', '==', schoolId), where('visibility', '==', 'school'), limit(LIST_CAP)),
    ).then((s) => active && setSchemes(collect(s))).catch(() => active && setSchemes([]))
    getDocs(
      query(collection(db, 'lesson_plans'), where('schoolId', '==', schoolId), where('visibility', '==', 'school'), limit(LIST_CAP)),
    ).then((s) => active && setPlans(collect(s))).catch(() => active && setPlans([]))
    getDocs(
      query(collection(db, 'notes'), where('schoolId', '==', schoolId), where('status', '==', 'school'), limit(LIST_CAP)),
    ).then((s) => active && setNotes(collect(s))).catch(() => active && setNotes([]))
    return () => {
      active = false
    }
  }, [schoolId])

  const members = useMemo(
    () =>
      (users ?? [])
        .filter((u) => u.schoolId === schoolId)
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [users, schoolId],
  )
  const candidates = useMemo(
    () =>
      (users ?? [])
        .filter((u) => u.status === 'approved' && !u.schoolId)
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [users],
  )

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id

  if (!schoolId) {
    return <JoinSchoolCard />
  }

  async function addMember() {
    if (!candidateId) return
    const person = candidates.find((c) => c.id === candidateId)
    try {
      await assignSchool(candidateId, schoolId)
      toast.success(`${person?.name ?? 'Member'} added to ${school?.name ?? 'the school'}.`)
      setCandidateId('')
    } catch {
      toast.error('Could not add the member — school admins can only add unassigned members.')
    }
  }

  function removeMember(m) {
    setConfirm({
      title: `Remove ${m.name || 'member'} from the school?`,
      body: 'Their school-shared content stays, but they lose access to this workspace.',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await assignSchool(m.id, null)
          // Don't leave a school_admin orphaned without a school.
          if (isAdmin && m.role === 'school_admin') await setUserRole(m.id, 'member')
          toast.success('Member removed.')
        } catch {
          toast.error('Could not remove the member.')
        }
      },
    })
  }

  if (school === undefined) return <p className="text-slate-400">Loading…</p>
  if (school === null)
    return <p className="text-slate-500">School not found (it may have been deleted).</p>

  return (
    <div>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{school.name}</h1>
          <p className="page-subtitle">
            {school.location || 'Private school workspace'} · {members.length} member
            {members.length === 1 ? '' : 's'}
          </p>
        </div>
        {isAdmin && !isMember && (
          <Badge variant="info">Viewing as platform admin</Badge>
        )}
      </div>

      {/* ── Join code (managers) ── */}
      {canManage && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Join code</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Teachers in your school can join themselves on the My School page with
                this code. {school.joinCode ? 'Regenerating retires the old code.' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {school.joinCode ? (
                <>
                  <button
                    type="button"
                    title="Copy join code"
                    onClick={() =>
                      navigator.clipboard?.writeText(school.joinCode).then(
                        () => toast.info('Join code copied.'),
                        () => toast.error('Could not copy.'),
                      )
                    }
                    className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm font-bold tracking-widest text-slate-800 hover:bg-slate-200"
                  >
                    {school.joinCode}
                  </button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={codeBusy}
                    onClick={async () => {
                      setCodeBusy(true)
                      try {
                        await generateJoinCode(school)
                        toast.success('Join code rotated.')
                      } catch {
                        toast.error('Could not rotate the join code.')
                      } finally {
                        setCodeBusy(false)
                      }
                    }}
                  >
                    {codeBusy ? 'Rotating…' : 'Regenerate'}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  disabled={codeBusy}
                  onClick={async () => {
                    setCodeBusy(true)
                    try {
                      await generateJoinCode(school)
                      toast.success('Join code created.')
                    } catch {
                      toast.error('Could not create the join code — check the deployed rules include school_codes.')
                    } finally {
                      setCodeBusy(false)
                    }
                  }}
                >
                  {codeBusy ? 'Creating…' : 'Generate join code'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Members ── */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Members
        </h2>
        {!users ? (
          <p className="text-sm text-slate-400">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-500">No members yet — add the first teacher below.</p>
        ) : (
          <Card padding="p-0">
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {m.name || m.email || m.id}{' '}
                      {m.role === 'admin' && <Badge variant="warn" className="ml-1">Platform admin</Badge>}
                      {m.role === 'school_admin' && <Badge variant="success" className="ml-1">School admin</Badge>}
                      {m.id === profile?.uid && <Badge className="ml-1">You</Badge>}
                    </p>
                    <p className="truncate text-xs text-slate-400">{m.email}</p>
                  </div>
                  {canManage && (
                    <span className="flex items-center gap-2">
                      {isAdmin && m.role !== 'admin' && (
                        <button
                          type="button"
                          className="text-xs text-indigo-600 hover:underline"
                          onClick={async () => {
                            const next = m.role === 'school_admin' ? 'member' : 'school_admin'
                            try {
                              await setUserRole(m.id, next)
                              toast.success(
                                next === 'school_admin'
                                  ? `${m.name || 'Member'} is now a school admin.`
                                  : `${m.name || 'Member'} is now a regular member.`,
                              )
                            } catch {
                              toast.error('Could not change the role.')
                            }
                          }}
                        >
                          {m.role === 'school_admin' ? 'Demote to member' : 'Make school admin'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => removeMember(m)}
                      >
                        Remove
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {canManage && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="w-auto max-w-xs py-2"
            >
              <option value="">Add an approved teacher…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.email}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={addMember} disabled={!candidateId}>
              Add to school
            </Button>
            <span className="text-xs text-slate-400">
              Only approved teachers without a school are listed.
            </span>
          </div>
        )}
      </section>

      {/* ── Curriculum coverage (aggregated progress) ── */}
      {members.length > 0 && <SchoolCoverage members={members} />}

      {/* ── School-shared content ── */}
      {[
        { label: 'Schemes of learning shared with the school', items: schemes, base: '/portal/forecasts', render: (s) => ({ title: `${subjectName(s.subjectId)} — Term ${s.term} (${s.grade})`, meta: `by ${s.authorName} · ${fmtDate(s.createdAt)}` }) },
        { label: 'Lesson plans shared with the school', items: plans, base: '/portal/plans', render: (p) => ({ title: p.title || `${subjectName(p.subjectId)} — Week ${p.week}`, meta: `by ${p.authorName} · ${fmtDate(p.createdAt)}` }) },
        { label: 'Study notes shared with the school', items: notes, base: '/portal/notes', render: (n) => ({ title: n.title, meta: `by ${n.authorName} · ${fmtDate(n.createdAt)}` }) },
      ].map(({ label, items, base, render }) => (
        <section key={label} className="mb-8">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            {label}
          </h2>
          {!items ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing shared here yet — choose “My school only” when saving a scheme, plan or
              note.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((x) => (
                <ContentRow key={x.id} to={`${base}/${x.id}`} {...render(x)} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
