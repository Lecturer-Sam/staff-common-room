import React, { useEffect, useRef, useState } from 'react';

// =============================================
// Modal — backdrop click-close, ESC close, focus trap (basic)
// =============================================
export const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  const dialogRef = useRef(null);
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${sizes[size]} bg-app-surface border border-app-border rounded-3xl shadow-2xl outline-none max-h-[85vh] flex flex-col`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-app-border">
            <h3 className="text-base font-semibold text-app-text tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-app-text-secondary hover:text-app-text active:scale-95 transition-all p-1 rounded-md hover:bg-app-surface-muted"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-app-border">{footer}</div>}
      </div>
    </div>
  );
};

// =============================================
// Tooltip — pure CSS hover, no positioning library
// =============================================
export const Tooltip = ({ children, content, side = 'top' }) => {
  const sides = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-app-text text-app-bg text-xs font-medium opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 ${sides[side]}`}
      >
        {content}
      </span>
    </span>
  );
};

// =============================================
// Dropdown — click-triggered menu, closes on outside click
// =============================================
export const Dropdown = ({ trigger, items = [], align = 'left', className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          role="menu"
          className={`absolute z-40 mt-2 min-w-[12rem] bg-app-surface border border-app-border rounded-2xl shadow-lg py-1.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1.5 h-px bg-app-border" />
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-x-2.5 px-4 py-2 text-sm text-left transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                  item.danger ? 'text-red-600 hover:bg-red-50' : 'text-app-text hover:bg-app-surface-muted'
                }`}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default { Modal, Tooltip, Dropdown };
