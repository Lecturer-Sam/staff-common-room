import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../context/ToastContext'
import { FREE_EXPORT_LIMIT } from '../lib/subscriptions'

/**
 * Wraps download handlers with the free-tier export quota (Phase 1 SaaS gate).
 *
 *   const gate = useExportGate()
 *   await gate(() => downloadSchemePdf(args))                 // metered
 *   await gate(() => downloadSchemePdf(args), { preview: true }) // exempt
 *
 * Watermarked agent previews are exempt — they are free samples in the
 * Deliveries workflow (see docs/deliveries-roadmap.md). The quota itself is
 * enforced in firestore.rules; this hook provides the pre-check + UX.
 */
export default function useExportGate() {
  const { canExport, countExport } = useSubscription()
  const toast = useToast()

  return async function gate(download, { preview = false } = {}) {
    if (!preview && !canExport) {
      toast.error(
        `You've used all ${FREE_EXPORT_LIMIT} free downloads this month. Upgrade to Pro in Plans & Billing for unlimited exports.`,
        6000,
      )
      return false
    }
    const result = await download()
    if (!preview) {
      const recorded = await countExport()
      if (!recorded.ok && recorded.reason === 'denied') {
        toast.info('Download started, but your usage could not be recorded.', 4000)
      }
    }
    return result !== false
  }
}
