import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Offline / sync store.
 *
 * Tracks the device's network status and a queue of attempt records
 * that haven't been synced yet (because the device was offline).
 *
 * The sync queue is persisted to localStorage so it survives page
 * refreshes. When the device comes back online the queue can be
 * flushed to a backend or exported as CSV.
 *
 * Usage:
 *   const isOnline    = useOfflineStore(s => s.isOnline)
 *   const queueLength = useOfflineStore(s => s.syncQueue.length)
 *   const enqueue     = useOfflineStore(s => s.enqueue)
 */
const useOfflineStore = create(
  persist(
    (set, get) => ({
      // ── Network status ────────────────────────────────────────────────────
      /** Reflects navigator.onLine — updated by event listeners in AppShell. */
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

      setOnline:  (val) => set({ isOnline: val }),

      // ── Sync queue ────────────────────────────────────────────────────────
      /**
       * Array of attempt objects waiting to be synced.
       * Each item mirrors the Dexie `attempts` table shape plus a local `_queuedAt`.
       */
      syncQueue: [],

      /** Add an attempt to the sync queue. */
      enqueue: (attempt) =>
        set((s) => ({
          syncQueue: [...s.syncQueue, { ...attempt, _queuedAt: Date.now() }],
        })),

      /** Remove one or more items from the queue by their _queuedAt timestamp. */
      dequeue: (queuedAt) =>
        set((s) => ({
          syncQueue: s.syncQueue.filter((item) => item._queuedAt !== queuedAt),
        })),

      /** Flush the entire queue (e.g. after a successful bulk sync). */
      clearQueue: () => set({ syncQueue: [] }),

      /** Convenience: how many items are waiting. */
      get pendingCount() {
        return get().syncQueue.length
      },
    }),
    {
      name: 'nacca-offline',
      // Only persist the queue — isOnline is derived from navigator.onLine on boot
      partialize: (s) => ({ syncQueue: s.syncQueue }),
    },
  ),
)

export default useOfflineStore
