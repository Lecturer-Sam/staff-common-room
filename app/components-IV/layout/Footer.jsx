import { CircleCheck } from 'lucide-react'

/**
 * Desktop-only footer bar. Matches the footer in the mockups:
 *   `NACCA • B7-B10 • Ghana • Offline-first • Kwabena © 2025    ● PWA ready`
 *
 * Hidden below the `lg` breakpoint (where floating BottomNav handles nav).
 */
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="hidden lg:flex items-center justify-between
                       px-8 py-4 mt-16 border-t border-slate-200
                       text-[11px] text-slate-500 font-medium tracking-wide">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-navy">NACCA QuizBank</span>
        <span className="opacity-40">•</span>
        <span>B7-B10</span>
        <span className="opacity-40">•</span>
        <span>Ghana</span>
        <span className="opacity-40">•</span>
        <span>Offline-first</span>
        <span className="opacity-40">•</span>
        <span>© {year}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CircleCheck size={13} className="text-emerald-500 fill-emerald-500/15" />
        <span className="font-bold text-slate-600">PWA ready</span>
      </div>
    </footer>
  )
}
