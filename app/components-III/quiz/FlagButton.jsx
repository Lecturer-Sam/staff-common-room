import { Flag } from 'lucide-react'

export default function FlagButton({ flagged, onToggle }) {
  return (
    <button onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
        flagged ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500'
      }`}>
      <Flag size={14} fill={flagged ? 'currentColor' : 'none'} />
      {flagged ? 'Flagged' : 'Flag'}
    </button>
  )
}