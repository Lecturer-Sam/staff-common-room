import { useEffect, useState } from 'react'
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PLANS } from '../lib/subscriptions'
import { Badge, Button, Card } from '../components/ui'
import ConfirmModal from '../components/ConfirmModal'

const DAY_MS = 24 * 60 * 60 * 1000

function fmtDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** renewsAt = 30 days from now, or 30 days past the current date if still in the future. */
function nextRenewal(current) {
  const base = current?.toDate && current.toDate() > new Date() ? current.toDate() : new Date()
  return Timestamp.fromDate(new Date(base.getTime() + 30 * DAY_MS))
}

export default function Billing() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [subs, setSubs] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    const unsub = onSnapshot(collection(db, 'subscriptions'), (snap) => {
      setSubs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [isAdmin])

  if (!isAdmin) {
    return <p className="text-slate-500">This page is only available to administrators.</p>
  }

  const patch = (id, fields) => updateDoc(doc(db, 'subscriptions', id), fields)

  async function activate(s) {
    try {
      await patch(s.id, {
        status: 'active',
        activatedAt: serverTimestamp(),
        renewsAt: nextRenewal(s.renewsAt),
        activatedBy: user.uid,
      })
      toast.success(`${s.name || s.id} activated on ${PLANS[s.planId]?.name ?? s.planId}.`)
    } catch {
      toast.error('Could not activate — check the deployed Firestore rules include subscriptions.')
    }
  }

  const requested = subs?.filter((s) => s.status === 'requested') ?? []
  const active = subs?.filter((s) => s.status === 'active') ?? []
  const inactive =
    subs?.filter((s) => s.status === 'cancelled' || s.status === 'rejected') ?? []

  return (
    <div>
      <h1 className="page-title">Subscriptions</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Confirm Mobile Money payments and manage member plans. Activation sets a 30-day
        renewal date; renew by marking the next payment as received.
      </p>

      {/* ── Payment confirmations ── */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Awaiting payment confirmation
          {requested.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {requested.length}
            </span>
          )}
        </h2>
        {!subs ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : requested.length === 0 ? (
          <p className="text-sm text-slate-400">No upgrade requests waiting.</p>
        ) : (
          <div className="space-y-3">
            {requested.map((s) => (
              <Card key={s.id} padding="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      {s.name || s.id}{' '}
                      <span className="font-normal text-slate-400">· {s.email}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Wants <b>{PLANS[s.planId]?.name ?? s.planId}</b> ({PLANS[s.planId]?.price}) ·
                      MoMo <span className="font-mono">{s.momoNumber || '—'}</span> · ref{' '}
                      <span className="font-mono">{s.paymentRef || '—'}</span> · requested{' '}
                      {fmtDate(s.requestedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => activate(s)}>
                      Mark paid &amp; activate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setConfirm({
                          title: 'Reject this payment?',
                          body: `${s.name || s.id} will be told the payment could not be confirmed. They can submit again.`,
                          confirmLabel: 'Reject',
                          onConfirm: () => patch(s.id, { status: 'rejected' }),
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Active subscriptions ── */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Active ({active.length})
        </h2>
        {subs && active.length === 0 && (
          <p className="text-sm text-slate-400">No active paid plans yet.</p>
        )}
        <div className="space-y-3">
          {active.map((s) => {
            const expired = s.renewsAt?.toDate && s.renewsAt.toDate() < new Date()
            return (
              <Card key={s.id} padding="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {s.name || s.id}{' '}
                      <Badge variant="success" className="ml-1">
                        {PLANS[s.planId]?.name ?? s.planId}
                      </Badge>
                      {expired && (
                        <Badge variant="danger" className="ml-1">
                          Past renewal date
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {s.email} · renews {fmtDate(s.renewsAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => activate(s)}>
                      Mark renewed (+30 days)
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setConfirm({
                          title: 'Cancel this subscription?',
                          body: `${s.name || s.id} drops back to the Free plan immediately.`,
                          confirmLabel: 'Cancel plan',
                          onConfirm: () => patch(s.id, { status: 'cancelled' }),
                        })
                      }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* ── Inactive ── */}
      {inactive.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Cancelled / rejected ({inactive.length})
          </h2>
          <div className="space-y-2">
            {inactive.map((s) => (
              <Card key={s.id} padding="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">
                    {s.name || s.id} <span className="text-slate-400">· {s.email}</span>
                    <Badge variant={s.status === 'cancelled' ? 'neutral' : 'danger'} className="ml-2">
                      {s.status}
                    </Badge>
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => activate(s)}>
                    Reactivate (payment received)
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
