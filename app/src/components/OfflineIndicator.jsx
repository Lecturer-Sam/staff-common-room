import { useEffect, useRef, useState } from 'react'
import { waitForPendingWrites } from 'firebase/firestore'
import { db } from '../firebase'

// A small status pill (bottom-center) that surfaces Firestore's offline behaviour:
//   • offline  — you can keep working; writes are saved on-device and queued
//   • syncing  — back online, flushing queued writes to the server
//   • synced   — brief confirmation flash, then it disappears
// When online with nothing pending, it renders nothing.
export default function OfflineIndicator() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [flashSynced, setFlashSynced] = useState(false)
  const flashTimer = useRef(null)

  useEffect(() => {
    const goOffline = () => setOnline(false)
    const goOnline = () => {
      setOnline(true)
      setSyncing(true)
      // Resolves once every write queued while offline has been acknowledged
      // by the server (resolves immediately if there was nothing pending).
      waitForPendingWrites(db)
        .catch(() => {})
        .finally(() => {
          setSyncing(false)
          setFlashSynced(true)
          clearTimeout(flashTimer.current)
          flashTimer.current = setTimeout(() => setFlashSynced(false), 2500)
        })
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearTimeout(flashTimer.current)
    }
  }, [])

  const state = !online
    ? 'offline'
    : syncing
      ? 'syncing'
      : flashSynced
        ? 'synced'
        : 'idle'

  if (state === 'idle') return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="offline-indicator"
    >
      <div
        className={`offline-indicator__pill is-${state}`}
      >
        {state === 'offline' && (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="offline-indicator__icon"
            >
              <path d="M1 1l22 22" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            Offline — changes save on this device and sync later
          </>
        )}
        {state === 'syncing' && (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="offline-indicator__icon is-spinning"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Syncing changes…
          </>
        )}
        {state === 'synced' && (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="offline-indicator__icon"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            All changes synced
          </>
        )}
      </div>
    </div>
  )
}
