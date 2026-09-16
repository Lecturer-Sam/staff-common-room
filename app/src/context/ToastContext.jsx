import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

/**
 * Toast types: 'success' | 'error' | 'info'
 * Usage:  const toast = useToast()
 *         toast.success('Saved!')
 *         toast.error('Something went wrong.')
 *         toast.info('Copied to clipboard.')
 */

let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const show = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++nextId
      setToasts((t) => [...t, { id, message, type }])
      timers.current[id] = setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const success = useCallback((msg, dur) => show(msg, 'success', dur), [show])
  const error   = useCallback((msg, dur) => show(msg, 'error', dur ?? 5000), [show])
  const info    = useCallback((msg, dur) => show(msg, 'info', dur), [show])

  return (
    <ToastContext.Provider value={{ show, success, error, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/* ── Toast container + individual toast ────────────────────────────────── */

const STYLES = {
  success: {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="hearth-toast__icon">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="hearth-toast__icon">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  info: {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="hearth-toast__icon">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
      </svg>
    ),
  },
}

function Toast({ toast, onDismiss }) {
  const { icon } = STYLES[toast.type] ?? STYLES.info
  return (
    <div
      role="alert"
      className={`hearth-toast hearth-toast--${toast.type}`}
    >
      {/* coloured left bar */}
      <div className="hearth-toast__bar" />
      <div className="hearth-toast__body">
        {icon}
        <p className="hearth-toast__message">{toast.message}</p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss"
          className="hearth-toast__dismiss"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="hearth-toast__dismiss-icon">
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="hearth-toast-stack"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
