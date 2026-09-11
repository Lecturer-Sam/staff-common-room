import { useEffect, useState } from 'react'
import { Smartphone, Download, Wifi, WifiOff, PackageCheck, Database, CheckCircle2, XCircle } from 'lucide-react'
import InstallPrompt from '../components/pwa/InstallPrompt'

/**
 * 5th Tab — PWA Shell: manifests SW installation state, cache, install prompts.
 * Also renders the mockup's "iPhone frame visual" per the design reference.
 */
export default function PwaShell() {
  const [manifest, setManifest] = useState(null)
  const [swState, setSwState] = useState({ state: 'checking', controller: null })
  const [cachesList, setCachesList] = useState([])
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    // Fetch manifest
    fetch('/manifest.webmanifest')
      .then((r) => (r.ok ? r.json() : null))
      .then(setManifest)
      .catch(() => setManifest(null))

    // SW state
    if ('serviceWorker' in navigator) {
      const update = () => {
        setSwState({
          state: navigator.serviceWorker.controller ? 'controlled' : 'uncontrolled',
          controller: navigator.serviceWorker.controller?.scriptURL ?? null,
        })
      }
      update()
      navigator.serviceWorker.addEventListener('controllerchange', update)
      return () => navigator.serviceWorker.removeEventListener('controllerchange', update)
    }
    return undefined
  }, [])

  useEffect(() => {
    if ('caches' in window) {
      caches.keys().then(setCachesList).catch(() => setCachesList([]))
    }
  }, [])

  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div className="min-h-full bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-10">

        {/* Title */}
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">PWA Shell</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Install status · Service worker · Caches
          </p>
        </div>

        {/* ── Phone frame visual (mockup reference) ───────────────────── */}
        <div className="relative mx-auto w-[260px] aspect-[9/19] rounded-[44px]
                        bg-navy shadow-[var(--shadow-float)] ring-8 ring-slate-100 overflow-hidden">
          {/* Notched bezel */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 h-5 w-28
                          rounded-b-2xl bg-black/40 backdrop-blur" />
          <div className="absolute inset-1 rounded-[36px] bg-navy-800 overflow-hidden
                          flex flex-col text-white">
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pt-3 text-[10px] opacity-80">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                {isOnline ? <><Wifi size={9} /> LTE</> : <WifiOff size={9} />}
              </span>
            </div>

            {/* App body inside */}
            <div className="flex-1 flex flex-col p-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-accent text-navy flex items-center justify-center font-black text-[12px]">
                  N
                </div>
                <div className="text-[11px] leading-tight">
                  <p className="font-bold">NACCA QuizBank</p>
                  <p className="opacity-70">B7-B9 · Offline-ready</p>
                </div>
              </div>

              <InstallPrompt compact />

              <div className="rounded-xl bg-navy-700 p-3 space-y-2 text-[10px]">
                <p className="flex items-center justify-between">
                  <span className="opacity-70">Service Worker</span>
                  {swState.state === 'controlled'
                    ? <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 size={10} /> OK</span>
                    : <span className="flex items-center gap-1 text-red-300"><XCircle size={10} /> Idle</span>}
                </p>
                <p className="flex items-center justify-between">
                  <span className="opacity-70">Caches</span>
                  <span className="font-mono font-bold text-accent">{cachesList.length}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="opacity-70">Network</span>
                  <span className={isOnline ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </p>
              </div>

              <div className="rounded-xl bg-surface-dark/80 p-3 text-[9px] leading-relaxed break-all
                              font-mono text-slate-300">
                <p className="text-accent mb-1">manifest.json</p>
                <p>name: "{manifest?.name ?? '…'}"</p>
                <p>start_url: "{manifest?.start_url ?? '…'}"</p>
                <p>display: {manifest?.display ?? '…'}</p>
                <p>lang: {manifest?.lang ?? '…'}</p>
              </div>
            </div>

            {/* Home indicator */}
            <div className="pb-2 flex justify-center">
              <div className="h-1 w-20 rounded-full bg-white/30" />
            </div>
          </div>
        </div>

        {/* ── Install & status cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[16px] bg-white border border-slate-200 p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <PackageCheck size={12} /> Install
            </div>
            <p className="text-[18px] font-extrabold text-navy">PWA</p>
            <p className="text-[10px] text-slate-400 leading-snug">
              Standalone on any device
            </p>
          </div>
          <div className="rounded-[16px] bg-white border border-slate-200 p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Database size={12} /> IndexedDB
            </div>
            <p className="text-[18px] font-extrabold text-navy">7</p>
            <p className="text-[10px] text-slate-400 leading-snug">
              local tables · offline-first
            </p>
          </div>
        </div>

        <InstallPrompt />

        {/* ── Manifest table ──────────────────────────────────────────── */}
        {manifest && (
          <div className="rounded-[20px] bg-white border border-slate-200 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <p className="text-[13px] font-bold text-navy flex items-center gap-2">
                <Smartphone size={15} /> App Manifest
              </p>
            </div>
            <table className="w-full text-[11px]">
              <tbody className="divide-y divide-slate-100">
                {Object.entries(manifest).map(([k, v]) => {
                  const valStr = Array.isArray(v) ? v.map(JSON.stringify).join(', ') :
                                typeof v === 'object' ? JSON.stringify(v) : String(v)
                  return (
                    <tr key={k}>
                      <th className="text-left px-5 py-2 font-mono text-slate-500 align-top whitespace-nowrap">
                        {k}
                      </th>
                      <td className="px-5 py-2 text-navy break-all">
                        {valStr.length > 80 ? valStr.slice(0, 80) + '…' : valStr}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Caches list ─────────────────────────────────────────────── */}
        <div className="rounded-[20px] bg-white border border-slate-200 p-5 space-y-3">
          <p className="text-[13px] font-bold text-navy">Named Caches ({cachesList.length})</p>
          {cachesList.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No caches yet. Load the app via the Service Worker (run `yarn build && yarn preview`) to populate.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {cachesList.map((c) => (
                <li key={c} className="flex items-center gap-2 text-[11px]">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <code className="font-mono text-slate-600 break-all">{c}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
