import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { createDeliveryRequest, commissionRateFor } from '../lib/deliveries'
import { Button, Input, Textarea } from './ui'

/**
 * Modal an agent uses to request delivery of a material to a school.
 * On submit it writes a `deliveries` doc (status: requested) for the owner
 * to approve. Render conditionally: {open && <RequestDeliveryModal .../>}.
 */
export default function RequestDeliveryModal({
  materialType,
  materialRef,
  materialTitle,
  onClose,
}) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [schoolName, setSchoolName] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const rate = commissionRateFor(profile)
  const amountNum = Number(amount)
  const commission =
    amountNum > 0 ? Math.round(amountNum * rate * 100) / 100 : 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!schoolName.trim() || !(amountNum > 0)) return
    setBusy(true)
    try {
      await createDeliveryRequest({
        uid: user.uid,
        profile,
        materialType,
        materialRef,
        materialTitle,
        schoolName: schoolName.trim(),
        amount: amountNum,
        note: note.trim(),
      })
      toast.success('Delivery requested — awaiting approval.')
      onClose()
    } catch (err) {
      console.error('createDeliveryRequest failed:', err?.code, err)
      toast.error(
        err?.code === 'permission-denied'
          ? 'Not allowed — delivery rules may not be deployed yet.'
          : 'Could not submit the request. Please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />

      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-delivery-title"
      >
        <h2
          id="request-delivery-title"
          className="text-base font-semibold text-slate-900"
        >
          Request delivery
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {materialTitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              School
            </label>
            <Input
              required
              placeholder="e.g. St. Mary's Basic School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Price quoted to school (GHS)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amountNum > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Your commission at {Math.round(rate * 100)}%:{' '}
                <span className="font-semibold text-slate-700">
                  GHS {commission.toFixed(2)}
                </span>{' '}
                — realized once the school pays.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Note <span className="text-slate-400">(optional)</span>
            </label>
            <Textarea
              rows={2}
              placeholder="Anything the owner should know…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
