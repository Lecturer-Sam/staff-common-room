import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'

/**
 * Counts up from 0. Pauses when the tab is hidden (visibilitychange).
 * Calls onTick(seconds) every second so the parent can read elapsed time.
 *
 * Props:
 *   onTick(seconds) — optional callback fired each second
 */
export default function Timer({ onTick }) {
  const [seconds, setSeconds] = useState(0)
  const intervalRef  = useRef(null)
  const pausedRef    = useRef(false)

  useEffect(() => {
    const tick = () => {
      if (pausedRef.current) return
      setSeconds((s) => {
        const next = s + 1
        onTick?.(next)
        return next
      })
    }

    intervalRef.current = setInterval(tick, 1000)

    const handleVisibility = () => {
      pausedRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [onTick])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                    bg-navy text-accent text-[12px] font-bold font-mono">
      <Clock size={12} />
      {mm}:{ss}
    </div>
  )
}
