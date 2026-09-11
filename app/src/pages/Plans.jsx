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
import { Badge, Button, Card, Field, Input } from '../components/ui'
import ConfirmModal from '../components/ConfirmModal'

const STATUS_BADGE = {
  active: ['Active', 'success'],
  requested: ['Pending approval', 'warn'],
  cancelled: ['Cancelled', 'neutral'],
  rejected: ['Payment not confirmed', 'danger'],
}

function fmtDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function PlanCard({ plan, current, onSelect }) {
  return (
    <Card className={`flex flex-col ${current ? 'ring-2 ring-brand' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">{plan.name}</h3>
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
        <Button
          className="mt-5 w-full"
          variant={current ? 'secondary' : 'primary'}
          disabled={plan.comingSoon}
          onClick={onSelect}
        >
          {plan.comingSoon ? 'Arriving with school workspaces' : current ? 'Your plan' : 'Upgrade'}
        </Button>
      )}
    </Card>
  )
}

export default function Plans() {
  const { user, profile } = useAuth()
  const { sub, loading, planId, isPro, exportsUsed, exportsLeft } = useSubscription()
  const toast = useToast()

  const [upgrading, setUpgrading] = useState(false)
  const [momoNumber, setMomoNumber] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
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
        Beacon is funded by teacher subscriptions — free to start, Pro unlocks unlimited
        downloads. Payments are via Mobile Money.
      </p>

      {/* ── Current subscription ── */}
      <Card className="mb-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading your plan…</p>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  {PLANS[planId].name} plan
                </h2>
                {status !== 'none' && STATUS_BADGE[status] && (
                  <Badge variant={STATUS_BADGE[status][1]}>{STATUS_BADGE[status][0]}</Badge>
                )}
              </div>

              {isPro ? (
                <p className="mt-1 text-sm text-slate-500">
                  Unlimited downloads · renews {fmtDate(sub?.renewsAt)}
                </p>
              ) : (
                <div className="mt-3 max-w-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Downloads used in {monthKey()}: <b>{exportsUsed}</b> / {FREE_EXPORT_LIMIT}
                    </span>
                    {exportsLeft === 0 && (
                      <span className="font-semibold text-brand">
                        Limit reached — upgrade below for unlimited
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${exportsLeft === 0 ? 'bg-red-500' : 'bg-brand'}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </div>
              )}

              {status === 'requested' && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  We're confirming your MoMo payment ({sub.paymentRef}). You'll be moved to
                  Pro as soon as it's verified — usually within a few hours.
                </p>
              )}
              {status === 'rejected' && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  Your last payment could not be confirmed. Check the transaction reference
                  and try again, or contact Beacon support.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {!isPro && status !== 'requested' && (
                <Button onClick={() => setUpgrading((v) => !v)}>
                  {upgrading ? 'Close' : 'Upgrade to Pro'}
                </Button>
              )}
              {(status === 'active' || status === 'requested') && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setConfirm({
                      title: 'Cancel subscription?',
                      body:
                        status === 'requested'
                          ? 'Your upgrade request will be withdrawn.'
                          : 'Your Pro features stop immediately and you move back to the Free plan.',
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

        {/* ── MoMo upgrade form ── */}
        {upgrading && !isPro && status !== 'requested' && (
          <form onSubmit={submitUpgrade} className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-700">
              Step 1 — Pay {PLANS.pro.price} by Mobile Money
            </h3>
            <div className="mt-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p>
                <b>{PAYMENT_INSTRUCTIONS.method}</b> ·{' '}
                <span className="font-mono">{PAYMENT_INSTRUCTIONS.momoNumber}</span> (
                {PAYMENT_INSTRUCTIONS.accountName})
              </p>
              <p className="mt-1 text-xs text-slate-500">{PAYMENT_INSTRUCTIONS.note}</p>
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-700">Step 2 — Confirm payment</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="MoMo number you paid from" htmlFor="momo">
                <Input
                  id="momo"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  placeholder="e.g. 024 123 4567"
                />
              </Field>
              <Field label="Transaction reference" htmlFor="ref">
                <Input
                  id="ref"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. MP240910.1234.A12345"
                />
              </Field>
            </div>
            <Button type="submit" className="mt-4" disabled={busy}>
              {busy ? 'Sending…' : `Request ${PLANS.pro.name} — ${PLANS.pro.price}/${PLANS.pro.period.replace('per ', '')}`}
            </Button>
          </form>
        )}
      </Card>

      {/* ── Plan catalogue ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <PlanCard plan={PLANS.free} current={planId === 'free'} />
        <PlanCard
          plan={PLANS.pro}
          current={planId === 'pro'}
          onSelect={() => {
            setUpgrading(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
        <PlanCard plan={PLANS.school} current={false} />
      </div>

      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
