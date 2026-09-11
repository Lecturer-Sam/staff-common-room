import { useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import db from '../../db/db'
import useOfflineStore from '../../stores/offlineStore'

/**
 * Listens for the `online` event and automatically flushes the sync
 * queue by saving queued attempts to Dexie (they were already saved
 * locally — this just marks them synced and clears the queue).
 *
 * Also renders a small pill in the header when there are pending items.
 * AppShell already shows the pending count in the header; this component
 * handles the flush logic and can be mounted invisibly.
 */
export default function SyncIndicator() {
  const syncQueue  = useOfflineStore((s) => s.syncQueue)
  const clearQueue = useOfflineStore((s) => s.clearQueue)
  const dequeue    = useOfflineStore((s) => s.dequeue)
  const isFlushing = useRef(false)

  // Flush queue when we come back online
  useEffect(() => {
    const flush = async () => {
      if (isFlushing.current || syncQueue.length === 0) return
      isFlushing.current = true

      for (const item of syncQueue) {
        try {
          // Mark the Dexie attempt as synced (it was added on quiz finish)
          const existing = await db.attempts
            .where('csId').equals(item.csId)
            .and((a) => a.date === item.date && !a.synced)
            .first()

          if (existing) {
            await db.attempts.update(existing.id, { synced: true })
          }

          dequeue(item._queuedAt)
        } catch {
          // Leave in queue for next flush attempt
        }
      }

      isFlushing.current = false
    }

    window.addEventListener('online', flush)
    // Also try on mount in case we're already online with a pending queue
    if (navigator.onLine) flush()

    return () => window.removeEventListener('online', flush)
  }, [syncQueue, dequeue, clearQueue])

  // Renders nothing visible — the header pending badge in AppShell
  // already surfaces the count via useOfflineStore.
  return null
}
