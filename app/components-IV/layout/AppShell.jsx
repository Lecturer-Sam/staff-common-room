import { Outlet, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Wifi, WifiOff, Download } from 'lucide-react'
import BottomNav from './BottomNav'
import DesktopTabs from './DesktopTabs'
import Footer from './Footer'
import InstallPrompt from '../pwa/InstallPrompt'
import SyncIndicator from '../pwa/SyncIndicator'
import useOfflineStore from '../../stores/offlineStore'
import db from '../../db/db'

/**
 * Root layout — renders on every route.
 *
 * Structure (mobile):
 *   ┌─────────────────────┐
 *   │  Zone 1 Header      │  sticky, ~60px (N chip, offline pill, Install)
 *   ├─────────────────────┤
 *   │  <Outlet />         │  scrollable, flex-1
 *   ├─────────────────────┤
 *   │  BottomNav          │  floating pill (5 tabs)
 *   └─────────────────────┘
 *
 * Structure (desktop, ≥ 1024 px):
 *   ┌─────────────────────┐
 *   │  Zone 1 Header      │  (same)
 *   ├─────────────────────┤
 *   │  Zone 2 DesktopTabs │  01 Learner Path … 05 PWA Shell
 *   ├─────────────────────┤
 *   │  <Outlet />         │  scrollable
 *   ├─────────────────────┤
 *   │  Footer             │  desktop only
 *   └─────────────────────┘
 */
export default function AppShell() {
  const navigate        = useNavigate()
  const pendingCount    = useOfflineStore((s) => s.syncQueue.length)
  const setOnline       = useOfflineStore((s) => s.setOnline)
  const isOnline        = useOfflineStore((s) => s.isOnline)

  const totalQ = useLiveQuery(() => db.questions.count(), [], 0)

  // Live network status
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

  const handleInstall = () => {
    // Best-effort install prompt fallback (beforeinstallprompt may not be ready yet)
    // The InstallPrompt banner handles real prompt; this button is a CTA that triggers
    // the banner by un-dismissing if the user had dismissed it.
    sessionStorage.removeItem('install-dismissed')
    // Reload-only-free: fire a synthetic event so banner re-evaluates; for now, just click:
    const ev = new Event('app-install-cta')
    window.dispatchEvent(ev)
  }

  return (
    <div className="flex flex-col h-full bg-surface">

      {/* ── Zone 1. Header (always visible, both mobile + desktop) ──────── */}
      <header className="shrink-0 sticky top-0 z-40 bg-white/85 backdrop-blur-xl
                         border-b border-slate-200">
        <div className="h-16 flex items-center justify-between px-4 lg:px-6">

          {/* Logo N chip + wordmark */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 focus:outline-none"
            aria-label="Go to Learner Path"
          >
            {/* Rounded-square N chip per mockups */}
            <div className="h-10 w-10 rounded-[12px] bg-navy flex items-center justify-center
                            shadow-[var(--shadow-soft)]">
              <span className="font-black text-[18px] text-white leading-none">N</span>
            </div>
            <div className="leading-none hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[15px] tracking-tight text-navy">
                  NACCA QuizBank
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded
                                 bg-slate-100 text-slate-500 border border-slate-200">
                  PWA
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1 tracking-wide">
                Ghana · B7-B9 · {totalQ ?? '…'} questions offline
              </div>
            </div>
          </button>

          {/* Right side: Offline-ready pill + pending sync badge + Install CTA */}
          <div className="flex items-center gap-2">

            {/* Pending sync badge */}
            {pendingCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold
                               px-2.5 py-1 rounded-full
                               bg-pending/10 text-pending border border-pending/20">
                {pendingCount} pending sync
              </span>
            )}

            {/* Offline-ready pill */}
            <span
              title={isOnline ? 'Online — data will sync immediately' : 'Offline — changes queued for later'}
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold
                          px-3 py-1.5 rounded-full border transition-colors
                          ${isOnline
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50   text-amber-700   border-amber-200'}`}
            >
              {isOnline
                ? <><Wifi size={11} className="text-emerald-600" /> Online-ready</>
                : <><WifiOff size={11} /> Offline-ready</>}
            </span>

            {/* Install App CTA button */}
            <button
              onClick={handleInstall}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold
                         px-3.5 py-1.5 rounded-full
                         bg-navy text-white hover:bg-navy-800 transition-colors
                         active:scale-[0.98]"
            >
              <Download size={12} className="text-accent" />
              Install App
            </button>
          </div>
        </div>

        {/* ── Zone 2. Desktop-only numbered tabs ─────────────────────── */}
        <DesktopTabs />
      </header>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
        <Footer />
      </main>

      {/* ── Bottom navigation (mobile + tablet, hidden on xl desktop) ───── */}
      <BottomNav />

      {/* ── PWA overlays (mount once, render nothing or a banner) ────────── */}
      <SyncIndicator />
      <InstallPrompt />

    </div>
  )
}
