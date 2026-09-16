import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../context/ToastContext'
import {
  FREE_EXPORT_LIMIT,
  PAYMENT_INSTRUCTIONS,
  PLANS,
  cancelSubscription,
  monthKey,
  requestUpgrade,
} from '../lib/subscriptions'
import { Badge, Button, Card, Field, Input, Select } from '../components/ui'
import ConfirmModal from '../components/ConfirmModal'

const STATUS_BADGE = {
  active: ['Active', 'success'],
  requested: ['Pending approval', 'warn'],
  cancelled: ['Cancelled', 'neutral'],
  rejected: ['Payment not confirmed', 'danger'],
  expired: ['Expired', 'danger'],
}

function fmtDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtGrantDate(ts) {
  if (!ts) return 'perpetual'
  if (ts?.toDate) return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  try { return new Date(ts).toLocaleDateString('en-GB') } catch { return String(ts) }
}

function PlanCard({ plan, current, onSelect }) {
  return (
    <Card className={`flex flex-col ${current ? 'ring-2 ring-brand' : ''} ${plan.popular ? 'border-brand' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {plan.name}
            {plan.popular && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] text-white">Popular</span>}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{plan.tagline}</p>
        </div>
        {plan.comingSoon && <Badge variant="info">Coming soon</Badge>}
        {current && <Badge variant="success">Current</Badge>}
      </div>
      <p className="mt-4">
        <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>{' '}
        <span className="text-sm text-slate-500">{plan.period}</span>
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-brand">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      {onSelect && (
        <Button className="mt-5 w-full" variant={current ? 'secondary' : 'primary'} disabled={plan.comingSoon} onClick={onSelect}>
          {plan.comingSoon ? 'Arriving with school workspaces' : current ? 'Your plan' : 'Upgrade'}
        </Button>
      )}
    </Card>
  )
}

export default function Plans() {
  const { user, profile } = useAuth()
  const { sub, grants, hasGrant, grantPlan, loading, planId, isPro, exportsUsed, exportsLeft } = useSubscription()
  const toast = useToast()

  const [upgrading, setUpgrading] = useState(false)
  const [momoNumber, setMomoNumber] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [channel, setChannel] = useState('mtn')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const status = sub?.status ?? 'none'
  const usedPct = Math.min(100, Math.round((exportsUsed / FREE_EXPORT_LIMIT) * 100))

  async function submitUpgrade(e) {
    e.preventDefault()
    if (!momoNumber.trim() || !paymentRef.trim()) {
      toast.error('Enter both the MoMo number you paid from and the transaction reference.')
      return
    }
    setBusy(true)
    try {
      await requestUpgrade(user, profile, 'pro', {
        momoNumber: momoNumber.trim(),
        paymentRef: paymentRef.trim(),
        channel,
        amount: 29,
      })
      toast.success('Upgrade request sent — your plan activates once the payment is confirmed.')
      setUpgrading(false)
      setMomoNumber('')
      setPaymentRef('')
    } catch {
      toast.error('Could not send the upgrade request. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title">Plans &amp; Billing</h1>
      <p className="page-subtitle mb-6">
        Beacon is funded by teacher subscriptions — free to start, Pro unlocks unlimited question bank generation. Payments via Mobile Money (MTN / Telecel / AT) + card via Paystack. Schools paying offline get institutional license via manual authorization.
      </p>

      <Card className="mb-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading your plan…</p>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">{PLANS[planId]?.name || planId} plan</h2>
                {status !== 'none' && STATUS_BADGE[status] && <Badge variant={STATUS_BADGE[status][1]}>{STATUS_BADGE[status][0]}</Badge>}
                {hasGrant && <Badge variant="success">Access granted{grantPlan ? ` · ${PLANS[grantPlan]?.name || grantPlan}` : ''}</Badge>}
              </div>

              {isPro ? (
                <p className="mt-1 text-sm text-slate-500">
                  Unlimited downloads & question bank generation · {hasGrant ? `grant ${grants[0]?.type || 'manual'} · expires ${fmtGrantDate(grants[0]?.expiresAt)}` : `renews ${fmtDate(sub?.renewsAt)}`}
                </p>
              ) : (
                <div className="mt-3 max-w-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Downloads used in {monthKey()}: <b>{exportsUsed}</b> / {FREE_EXPORT_LIMIT}</span>
                    {exportsLeft === 0 && <span className="font-semibold text-brand">Limit reached — upgrade below for unlimited</span>}
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full transition-all ${exportsLeft === 0 ? 'bg-red-500' : 'bg-brand'}`} style={{ width: `${usedPct}%` }} />
                  </div>
                </div>
              )}

              {hasGrant && grants.length > 0 && (
                <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <p className="font-semibold">Active access grant: {grants[0].type} · {grants[0].planId} · {grants[0].note || 'manual authorization'}</p>
                  <p>Granted by admin · expires: {fmtGrantDate(grants[0].expiresAt)} · {grants[0].schoolId ? `school ${grants[0].schoolId.slice(0,6)}` : `user ${grants[0].userId?.slice(0,6)}`}</p>
                </div>
              )}

              {status === 'requested' && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  We're confirming your MoMo payment ({sub.paymentRef} via {sub.channel || 'momo'}). You'll be moved to Pro as soon as it's verified — usually within hours. {PAYMENT_INSTRUCTIONS.institutionalNote}
                </p>
              )}
              {status === 'rejected' && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  Your last payment could not be confirmed. Check the transaction reference and try again, or contact Beacon support on WhatsApp.
                </p>
              )}
              {status === 'expired' && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  Your subscription expired on {fmtDate(sub?.renewsAt)}. Renew to regain unlimited access.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {!isPro && status !== 'requested' && <Button onClick={() => setUpgrading((v) => !v)}>{upgrading ? 'Close' : 'Upgrade to Pro'}</Button>}
              {(status === 'active' || status === 'requested') && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setConfirm({
                      title: 'Cancel subscription?',
                      body: status === 'requested' ? 'Your upgrade request will be withdrawn.' : 'Your Pro features stop immediately and you move back to Free. If you have an institutional grant, it remains.',
                      confirmLabel: 'Cancel subscription',
                      onConfirm: async () => {
                        try {
                          await cancelSubscription(user.uid)
                          toast.success('Subscription cancelled.')
                        } catch {
                          toast.error('Could not cancel — try again.')
                        }
                      },
                    })
                  }
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {upgrading && !isPro && status !== 'requested' && (
          <form onSubmit={submitUpgrade} className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-700">Step 1 — Pay {PLANS.pro.price} by Mobile Money or Card</h3>
            <div className="mt-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p><b>{PAYMENT_INSTRUCTIONS.method}</b></p>
              <p className="mt-1">MTN: <span className="font-mono font-semibold">{PAYMENT_INSTRUCTIONS.momoNumbers.mtn}</span> · Telecel: <span className="font-mono">{PAYMENT_INSTRUCTIONS.momoNumbers.telecel}</span> · AT: <span className="font-mono">{PAYMENT_INSTRUCTIONS.momoNumbers.at}</span> ({PAYMENT_INSTRUCTIONS.accountName})</p>
              {PAYMENT_INSTRUCTIONS.paystackLink && <p className="mt-1">Card: <a href={PAYMENT_INSTRUCTIONS.paystackLink} className="text-indigo-600 underline" target="_blank" rel="noreferrer">Pay via Paystack</a></p>}
              <p className="mt-2 text-xs text-slate-500">{PAYMENT_INSTRUCTIONS.note}</p>
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-700">Step 2 — Confirm payment</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <Field label="Channel" htmlFor="channel">
                <Select id="channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="mtn">MTN MoMo</option>
                  <option value="telecel">Telecel Cash</option>
                  <option value="at">AT Money</option>
                  <option value="card">Card (Paystack)</option>
                </Select>
              </Field>
              <Field label="MoMo number you paid from" htmlFor="momo">
                <Input id="momo" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} placeholder="e.g. 024 123 4567" />
              </Field>
              <Field label="Transaction reference" htmlFor="ref">
                <Input id="ref" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="e.g. MP240910.1234.A12345" />
              </Field>
            </div>
            <Button type="submit" className="mt-4" disabled={busy}>
              {busy ? 'Sending…' : `Request ${PLANS.pro.name} — ${PLANS.pro.price}/${PLANS.pro.period.replace('per ', '')}`}
            </Button>
            <p className="mt-2 text-xs text-slate-400">{PAYMENT_INSTRUCTIONS.institutionalNote}</p>
          </form>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <PlanCard plan={PLANS.free} current={planId === 'free'} />
        <PlanCard plan={PLANS.pro} current={planId === 'pro'} onSelect={() => { setUpgrading(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        <PlanCard plan={PLANS.school} current={planId === 'school'} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-1">
        <PlanCard plan={PLANS.institutional} current={planId === 'institutional'} />
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
