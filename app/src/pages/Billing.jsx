import { useEffect, useState } from 'react'
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  getDocs,
  query,
  limit,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PLANS } from '../lib/subscriptions'
import { fetchAllGrants, createAccessGrant, revokeGrant } from '../lib/accessGrants'
import { fetchAllTransactions } from '../lib/paymentTransactions'
import { Badge, Button, Card, Field, Input, Select } from '../components/ui'
import ConfirmModal from '../components/ConfirmModal'

const DAY_MS = 24 * 60 * 60 * 1000

function fmtDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleString('en-GB')
}

function nextRenewal(current) {
  const base = current?.toDate && current.toDate() > new Date() ? current.toDate() : new Date()
  return Timestamp.fromDate(new Date(base.getTime() + 30 * DAY_MS))
}
function perpetualOrDate(months) {
  if (!months || months === 'perpetual') return null
  return Timestamp.fromDate(new Date(Date.now() + Number(months) * 30 * DAY_MS))
}

export default function Billing() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [subs, setSubs] = useState(null)
  const [grants, setGrants] = useState(null)
  const [txns, setTxns] = useState(null)
  const [confirm, setConfirm] = useState(null)

  // Grant form
  const [grantUserId, setGrantUserId] = useState('')
  const [grantSchoolId, setGrantSchoolId] = useState('')
  const [grantPlan, setGrantPlan] = useState('pro')
  const [grantType, setGrantType] = useState('manual')
  const [grantExpiry, setGrantExpiry] = useState('1') // months or perpetual
  const [grantNote, setGrantNote] = useState('')
  const [grantBusy, setGrantBusy] = useState(false)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    const unsub = onSnapshot(collection(db, 'subscriptions'), (snap) => {
      setSubs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    fetchAllGrants().then(setGrants).catch(() => setGrants([]))
    fetchAllTransactions().then(setTxns).catch(() => setTxns([]))
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
      toast.error('Could not activate — check deployed rules.')
    }
  }

  async function handleCreateGrant(e) {
    e.preventDefault()
    if (!grantUserId && !grantSchoolId) {
      toast.error('Enter userId or schoolId')
      return
    }
    setGrantBusy(true)
    try {
      const expiresAt = perpetualOrDate(grantExpiry)
      await createAccessGrant({
        userId: grantUserId || null,
        schoolId: grantSchoolId || null,
        planId: grantPlan,
        type: grantType,
        expiresAt,
        note: grantNote,
        grantedBy: user.uid,
      })
      toast.success(`Access granted: ${grantUserId || grantSchoolId} → ${grantPlan} (${grantType})`)
      setGrantUserId('')
      setGrantSchoolId('')
      setGrantNote('')
      const updated = await fetchAllGrants()
      setGrants(updated)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGrantBusy(false)
    }
  }

  async function handleRevokeGrant(g) {
    try {
      await revokeGrant(g.id)
      toast.success(`Grant revoked: ${g.id}`)
      setGrants((gs) => gs.filter((x) => x.id !== g.id))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const requested = subs?.filter((s) => s.status === 'requested') ?? []
  const active = subs?.filter((s) => s.status === 'active') ?? []
  const inactive = subs?.filter((s) => ['cancelled', 'rejected', 'expired'].includes(s.status)) ?? []

  return (
    <div>
      <h1 className="page-title">Subscriptions & Access Control</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        PRD Phase 3: Confirm MoMo payments, manage manual/institutional grants (access_grants), and view payment transactions. Grants bypass payment — for schools paying offline (bank transfer) or manual authorization.
      </p>

      {/* Manual Grant Creation — PRD §8 */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Manual / Institutional Authorization (Access Grants)</h2>
        <p className="mb-3 text-xs text-slate-500">Create a grant for a user who paid offline or a school with institutional license. Doc id = userId or schoolId for fast rules check (hasAccessGrant). Perpetual = institutional license, no expiry.</p>
        <form onSubmit={handleCreateGrant} className="grid gap-3 sm:grid-cols-2">
          <Field label="User ID (or leave blank for school-only)">
            <Input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} placeholder="uid or email lookup needed" />
          </Field>
          <Field label="School ID (or leave blank for user-only)">
            <Input value={grantSchoolId} onChange={(e) => setGrantSchoolId(e.target.value)} placeholder="school id" />
          </Field>
          <Field label="Plan">
            <Select value={grantPlan} onChange={(e) => setGrantPlan(e.target.value)}>
              <option value="pro">Pro Teacher</option>
              <option value="school">School Standard</option>
              <option value="institutional">Institutional (perpetual)</option>
            </Select>
          </Field>
          <Field label="Type">
            <Select value={grantType} onChange={(e) => setGrantType(e.target.value)}>
              <option value="manual">Manual (admin override)</option>
              <option value="payment">Payment (offline MoMo)</option>
              <option value="institutional_license">Institutional license (bank/cheque)</option>
            </Select>
          </Field>
          <Field label="Expiry">
            <Select value={grantExpiry} onChange={(e) => setGrantExpiry(e.target.value)}>
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="12">12 months</option>
              <option value="perpetual">Perpetual (institutional)</option>
            </Select>
          </Field>
          <Field label="Note (e.g. Paid offline via MTN 024... ref)">
            <Input value={grantNote} onChange={(e) => setGrantNote(e.target.value)} placeholder="Paid offline via MoMo to 054... ref MP..." />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={grantBusy}>{grantBusy ? 'Granting…' : 'Grant access'}</Button>
          </div>
        </form>

        {grants && grants.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">Active grants ({grants.length})</p>
            <div className="space-y-2">
              {grants.map((g) => (
                <Card key={g.id} padding="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {g.userId || g.schoolId || g.id} → <Badge variant="success">{PLANS[g.planId]?.name || g.planId}</Badge> <span className="ml-1 text-xs text-slate-500">{g.type}</span>
                        {g.expiresAt ? <span className="ml-2 text-xs">expires {fmtDate(g.expiresAt)}</span> : <span className="ml-2 text-xs text-emerald-700">perpetual</span>}
                      </p>
                      <p className="text-xs text-slate-500">{g.note || '—'} · by {g.grantedBy?.slice(0,6) || 'admin'} · {fmtDate(g.createdAt)}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ title: 'Revoke grant?', body: `Revoke ${g.id} → ${g.planId}? User drops to Free unless they have active subscription.`, confirmLabel: 'Revoke', onConfirm: () => handleRevokeGrant(g) })}>Revoke</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Payment transactions */}
      {txns && txns.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Payment transactions (audit) — {txns.length}</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[600px] text-sm">
              <thead><tr className="text-left text-[11px] tracking-wide text-slate-400 uppercase"><th className="px-3 py-2">User/School</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Gateway</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th></tr></thead>
              <tbody>
                {txns.slice(0, 20).map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{(t.userId || t.schoolId || '').slice(0,8)}</td>
                    <td className="px-3 py-2">GHS {t.amount}</td>
                    <td className="px-3 py-2">{t.gateway}</td>
                    <td className="px-3 py-2">{t.channel}</td>
                    <td className="px-3 py-2 font-mono text-xs">{t.reference || '—'}</td>
                    <td className="px-3 py-2"><Badge variant={t.status === 'pending' ? 'warn' : t.status === 'success' ? 'success' : 'neutral'}>{t.status}</Badge></td>
                    <td className="px-3 py-2 text-xs">{fmtDateTime(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Payment confirmations */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Awaiting payment confirmation
          {requested.length > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{requested.length}</span>}
        </h2>
        {!subs ? <p className="text-sm text-slate-400">Loading…</p> : requested.length === 0 ? <p className="text-sm text-slate-400">No upgrade requests waiting.</p> : (
          <div className="space-y-3">
            {requested.map((s) => (
              <Card key={s.id} padding="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{s.name || s.id} <span className="font-normal text-slate-400">· {s.email}</span></p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Wants <b>{PLANS[s.planId]?.name ?? s.planId}</b> ({PLANS[s.planId]?.price}) · MoMo <span className="font-mono">{s.momoNumber || '—'}</span> ({s.channel || 'mtn'}) · ref <span className="font-mono">{s.paymentRef || '—'}</span> · {fmtDate(s.requestedAt)} {s.schoolId ? `· school ${s.schoolId.slice(0,6)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => activate(s)}>Mark paid & activate</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ title: 'Reject this payment?', body: `${s.name || s.id} will be told payment could not be confirmed. They can submit again.`, confirmLabel: 'Reject', onConfirm: () => patch(s.id, { status: 'rejected' }) })}>Reject</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Active ({active.length})</h2>
        {subs && active.length === 0 && <p className="text-sm text-slate-400">No active paid plans yet.</p>}
        <div className="space-y-3">
          {active.map((s) => {
            const expired = s.renewsAt?.toDate && s.renewsAt.toDate() < new Date()
            return (
              <Card key={s.id} padding="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">{s.name || s.id} <Badge variant="success" className="ml-1">{PLANS[s.planId]?.name ?? s.planId}</Badge>{expired && <Badge variant="danger" className="ml-1">Past renewal</Badge>}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{s.email} · renews {fmtDate(s.renewsAt)} · MoMo {s.momoNumber || '—'} · {s.channel || ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => activate(s)}>Mark renewed (+30 days)</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ title: 'Cancel this subscription?', body: `${s.name || s.id} drops back to Free immediately. Grants remain.`, confirmLabel: 'Cancel plan', onConfirm: () => patch(s.id, { status: 'cancelled' }) })}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {inactive.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Cancelled / rejected / expired ({inactive.length})</h2>
          <div className="space-y-2">
            {inactive.map((s) => (
              <Card key={s.id} padding="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">{s.name || s.id} <span className="text-slate-400">· {s.email}</span><Badge variant={s.status === 'cancelled' ? 'neutral' : 'danger'} className="ml-2">{s.status}</Badge></p>
                  <Button size="sm" variant="secondary" onClick={() => activate(s)}>Reactivate (payment received)</Button>
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
