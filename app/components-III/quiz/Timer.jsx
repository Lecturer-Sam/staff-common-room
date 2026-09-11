import { useEffect } from 'react'
import { Timer as TimerIcon } from 'lucide-react'
import { useQuizStore } from '../../stores/quizStore'

export default function Timer() {
  const phase = useQuizStore((s) => s.phase)
  const elapsed = useQuizStore((s) => s.elapsed)

  useEffect(() => {
    if (phase !== 'active') return
    const id = setInterval(() => useQuizStore.getState().tick(), 1000)
    return () => clearInterval(id) // ← without this, StrictMode double-mounts give you 2× speed
  }, [phase])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold tabular-nums text-slate-600">
      <TimerIcon size={14} /> {mm}:{ss}
    </div>
  )
}