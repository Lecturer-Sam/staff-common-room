import { Link, Outlet } from 'react-router'
import BottomNav from './BottomNav'


export default function AppShell() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            <span className="text-brand">Extra Classes</span> <span className="text-slate-400">GH</span>
          </Link>
          {/* sync indicator + user chip land in Stages 3–4 */}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}