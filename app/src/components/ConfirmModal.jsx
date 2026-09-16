/**
 * ConfirmModal — replaces window.confirm() with a proper dialog.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null)
 *
 *   // trigger:
 *   setConfirm({
 *     title: 'Delete question?',
 *     body: 'This cannot be undone.',
 *     onConfirm: () => deleteDoc(...)
 *   })
 *
 *   // in JSX:
 *   <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
 */
export default function ConfirmModal({ config, onClose }) {
  if (!config) return null

  const { title, body, confirmLabel = 'Delete', onConfirm } = config

  async function handleConfirm() {
    onClose()
    await onConfirm()
  }

  return (
    /* backdrop */
    <div
      className="hearth-modal"
      onClick={onClose}
    >
      <div className="hearth-modal__backdrop" />

      {/* dialog */}
      <div
        className="hearth-modal__dialog hearth-modal__dialog--sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* icon */}
        <div className="hearth-modal__danger-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-red-500" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h2
          id="confirm-title"
          className="hearth-modal__title hearth-modal__title--center"
        >
          {title}
        </h2>

        {body && (
          <p className="hearth-modal__copy hearth-modal__copy--center">{body}</p>
        )}

        <div className="hearth-modal__actions">
          <button
            type="button"
            onClick={onClose}
            className="hearth-modal__button hearth-modal__button--secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="hearth-modal__button hearth-modal__button--danger"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
