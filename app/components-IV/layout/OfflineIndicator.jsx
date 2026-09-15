import { useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import useOfflineStore from '../../stores/offlineStore'

/**
 * Tiny status pill shown in the header.
 * Registers window online/offline listeners and keeps the store in sync.
 */
export default function OfflineIndicator() {
  const isOnline  = useOfflineStore((s) => s.isOnline)
  const setOnline = useOfflineStore((s) => s.setOnline)

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [setOnline])

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
        ${isOnline
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50   text-red-600    border border-red-200'}
      `}
    >
      {isOnline
        ? <Wifi    size={12} />
        : <WifiOff size={12} />}
      {isOnline ? 'Online' : 'Offline'}
    </div>
  )
}
