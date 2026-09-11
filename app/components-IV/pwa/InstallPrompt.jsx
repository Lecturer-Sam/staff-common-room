import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

/**
 * Captures the browser's `beforeinstallprompt` event and shows a
 * dismissible bottom banner when the app is installable.
 *
 * Hides itself permanently after the user installs or dismisses.
 *
 * Props:
 *  - compact  (bool, default false)  render an inline non-fixed pill instead of the banner.
 *  - forceShow (bool, default false)  always render, regardless of deferred event presence — used for demo/mockup views.
 */
export default function InstallPrompt({ compact = false, forceShow = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setVisible(false))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('install-dismissed', '1')
    setVisible(false)
  }

  const show = forceShow || (visible && !sessionStorage.getItem('install-dismissed'))
  if (!show) return null

  /* ── Compact inline variant ─────────────────────────────────────── */
  if (compact) {
    return (
      <button
        onClick={handleInstall}
        className="w-full h-9 rounded-xl bg-accent text-navy font-bold
                   text-[11px] flex items-center justify-center gap-1.5
                   active:scale-95 transition-transform shrink-0"
      >
        <Download size={12} /> Install App
      </button>
    )
  }

  /* ── Standard bottom banner ─────────────────────────────────────── */
  return (
    <div className="fixed bottom-[68px] left-3 right-3 z-50
                    rounded-[16px] bg-navy text-white shadow-xl
                    border border-white/10 p-4
                    flex items-center gap-3
                    animate-[slideUp_0.25s_ease]">

      <div className="h-10 w-10 rounded-xl bg-accent flex items-center
                      justify-center shrink-0">
        <Download size={18} className="text-navy" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold leading-tight">
          Add QuizBank to Home Screen
        </p>
        <p className="text-[11px] text-white/60 mt-0.5">
          Works offline · no app store needed
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3.5 py-1.5 rounded-full bg-accent text-navy
                     text-[12px] font-bold active:scale-95 transition-transform"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="h-7 w-7 rounded-full bg-white/10 flex items-center
                     justify-center hover:bg-white/20 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
