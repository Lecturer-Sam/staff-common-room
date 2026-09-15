import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { createSchool } from '../lib/schools'
import { Button, Card, Field, Input } from '../components/ui'

function fmtDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Platform-admin tenant directory: create schools and jump into each one's
 * workspace. Membership itself is managed inside the workspace.
 */
export default function Schools() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'

  const [schools, setSchools] = useState(null)
  const [users, setUsers] = useState(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      setSchools(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
      )
    })
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => {
      unsubSchools()
      unsubUsers()
    }
  }, [isAdmin])

  const counts = useMemo(() => {
    const c = {}
    for (const u of users ?? []) if (u.schoolId) c[u.schoolId] = (c[u.schoolId] ?? 0) + 1
    return c
  }, [users])

  if (!isAdmin) {
    return <p className="text-slate-500">This page is only available to administrators.</p>
  }

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Give the school a name.')
      return
    }
    setBusy(true)
    try {
      await createSchool({ name, location }, user)
      toast.success(`School "${name.trim()}" created.`)
      setName('')
      setLocation('')
    } catch {
      toast.error('Could not create the school — check the deployed rules include schools.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title">Schools</h1>
      <p className="page-subtitle mb-6">
        Each school is its own workspace: members, and schemes / lesson plans / notes
        shared privately inside it. Create the school, then open it to manage members.
      </p>

      {/* ── Create ── */}
      <Card className="mb-6">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <Field label="School name" htmlFor="school-name" className="min-w-52 flex-1">
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Osu Presby Basic School"
            />
          </Field>
          <Field label="Location (optional)" htmlFor="school-location" className="min-w-44 flex-1">
            <Input
              id="school-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Osu, Accra"
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : '+ Create school'}
          </Button>
        </form>
      </Card>

      {/* ── Directory ── */}
      {!schools ? (
        <p className="text-sm text-slate-400">Loading schools…</p>
      ) : schools.length === 0 ? (
        <p className="text-sm text-slate-500">
          No schools yet — create the first one above to start a pilot.
        </p>
      ) : (
        <div className="space-y-3">
          {schools.map((s) => (
            <Card key={s.id} padding="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{s.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {s.location || 'Location not set'} · created {fmtDate(s.createdAt)} ·{' '}
                    {counts[s.id] ?? 0} member{(counts[s.id] ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
                <Button size="sm" variant="secondary" to={`/portal/schools/${s.id}`}>
                  Manage workspace →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {schools && schools.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          Tip: promote one teacher per school to <code>school_admin</code> (Members page) so
          they can manage their own membership.
        </p>
      )}
    </div>
  )
}
