import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useDeliveries } from '../hooks/useDeliveries'
import {
  DELIVERY_STATUS,
  MATERIAL_TYPES,
  approveDelivery,
  rejectDelivery,
  markDeliveryPaid,
  cancelDeliveryRequest,
  materialRoute,
} from '../lib/deliveries'
import ConfirmModal from '../components/ConfirmModal'
import { Chip } from '../components/ui'

const cedis = (n) => `GHS ${Number(n ?? 0).toFixed(2)}`
const materialLabel = (t) => MATERIAL_TYPES[t]?.label ?? t

function StatusBadge({ status }) {
  const s = DELIVERY_STATUS[status] ?? DELIVERY_STATUS.requested
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${s.badge}`}
    >
      {s.label}
    </span>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  )
}

export default function Deliveries() {
  const { user, isOwner } = useAuth()
  const toast = useToast()
  const deliveries = useDeliveries()
  const [filter, setFilter] = useState('all')
  const [confirm, setConfirm] = useState(null)

  const visible =
    deliveries?.filter((d) => filter === 'all' || d.status === filter) ?? null
  const pendingCount =
    deliveries?.filter((d) => d.status === 'requested').length ?? 0
  const owed = (deliveries ?? [])
    .filter((d) => d.status === 'approved')
    .reduce((sum, d) => sum + (d.commissionAmount ?? 0), 0)
  const earned = (deliveries ?? [])
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + (d.commissionAmount ?? 0), 0)

  async function run(fn, ok, fail) {
    try {
      await fn()
      toast.success(ok)
    } catch {
      toast.error(fail)
    }
  }

  const onApprove = (d) =>
    run(
      () => approveDelivery(d, user.uid),
      'Delivery approved.',
      'Could not approve.',
    )
  const onMarkPaid = (d) =>
    setConfirm({
      title: 'Mark this delivery as paid?',
      body: `Confirms the school has paid ${cedis(d.amount)}. Commission of ${cedis(
        d.commissionAmount,
      )} will be realized for ${d.agentName}.`,
      confirmLabel: 'Mark paid',
      onConfirm: () =>
        run(() => markDeliveryPaid(d), 'Marked as paid.', 'Could not update.'),
    })
  const onReject = (d) =>
    setConfirm({
      title: 'Reject this request?',
      body: `The request from ${d.agentName} for ${d.schoolName} will be marked rejected.`,
      confirmLabel: 'Reject',
      onConfirm: () =>
        run(() => rejectDelivery(d), 'Request rejected.', 'Could not update.'),
    })
  const onCancel = (d) =>
    setConfirm({
      title: 'Cancel this request?',
      body: 'This removes your pending delivery request.',
      confirmLabel: 'Cancel request',
      onConfirm: () =>
        run(
          () => cancelDeliveryRequest(d),
          'Request cancelled.',
          'Could not cancel.',
        ),
    })

  return (
    <div>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />

      <h1 className="page-title">{isOwner ? 'Approvals' : 'My Deliveries'}</h1>
      <p className="mt-1 mb-4 text-sm text-slate-500">
        {isOwner
          ? 'Review delivery requests, approve them, and mark deliveries paid.'
          : 'Request materials for schools and track your commission.'}
        {isOwner && pendingCount > 0 && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {pendingCount} pending
          </span>
        )}
      </p>

      {/* Summary tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Pending" value={pendingCount} />
        <Stat
          label={isOwner ? 'Commission owed' : 'Awaiting payment'}
          value={cedis(owed)}
        />
        <Stat
          label={isOwner ? 'Commission paid out' : 'Commission earned'}
          value={cedis(earned)}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {['all', 'requested', 'approved', 'paid', 'rejected'].map((f) => (
          <Chip
            key={f}
            active={filter === f}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Chip>
        ))}
      </div>

      {!visible ? (
        <p className="text-slate-400">Loading deliveries…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-500">
          {isOwner
            ? 'No delivery requests in this category.'
            : 'No deliveries yet. Open a material and choose “Request delivery”.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((d) => (
            <li
              key={d.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {d.schoolName}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {materialLabel(d.materialType)}
                  </span>
                </p>
                <p className="truncate text-xs text-slate-500">
                  {materialRoute(d) ? (
                    <Link
                      to={materialRoute(d)}
                      className="text-indigo-600 hover:underline"
                    >
                      {d.materialTitle}
                    </Link>
                  ) : (
                    d.materialTitle
                  )}
                  {isOwner && d.agentName && ` · by ${d.agentName}`}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {cedis(d.amount)} · commission {cedis(d.commissionAmount)} (
                  {Math.round((d.commissionRate ?? 0) * 100)}%)
                </p>
                {d.note && d.status === 'rejected' && (
                  <p className="mt-0.5 text-xs text-red-600">{d.note}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <StatusBadge status={d.status} />
                {isOwner && d.status === 'requested' && (
                  <>
                    <button
                      type="button"
                      onClick={() => onApprove(d)}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(d)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {isOwner && d.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => onMarkPaid(d)}
                    className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    Mark paid
                  </button>
                )}
                {!isOwner && d.status === 'requested' && (
                  <button
                    type="button"
                    onClick={() => onCancel(d)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
