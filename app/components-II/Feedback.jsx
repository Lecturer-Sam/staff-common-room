import React, { createContext, useCallback, useContext, useState } from 'react';

// =============================================
// Alert — inline banner
// =============================================
const alertStyles = {
  info: { wrap: 'bg-sky-50 border-sky-200 text-sky-800', icon: 'text-sky-500' },
  success: { wrap: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: 'text-emerald-500' },
  warning: { wrap: 'bg-amber-50 border-amber-200 text-amber-800', icon: 'text-amber-500' },
  danger: { wrap: 'bg-red-50 border-red-200 text-red-800', icon: 'text-red-500' },
};

const alertIcons = {
  info: (
    <path
      fillRule="evenodd"
      d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a1 1 0 0 0 0 2h.01v3a1 1 0 0 0 1 1H11a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9Z"
      clipRule="evenodd"
    />
  ),
  success: (
    <path
      fillRule="evenodd"
      d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8.29-2.7a1 1 0 0 0-1.42 1.4l2 2a1 1 0 0 0 1.42 0l4-4a1 1 0 0 0-1.42-1.4L9 9.58l-1.29-1.3Z"
      clipRule="evenodd"
    />
  ),
  warning: (
    <path d="M8.26 3.1a2 2 0 0 1 3.48 0l6.5 11.4A2 2 0 0 1 16.5 17.5h-13a2 2 0 0 1-1.74-2.98l6.5-11.4ZM10 6a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0V7a1 1 0 0 0-1-1Zm0 8a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z" />
  ),
  danger: (
    <path
      fillRule="evenodd"
      d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-7-4a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0V6Zm-1 7a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"
      clipRule="evenodd"
    />
  ),
};

export const Alert = ({ variant = 'info', title, children, onDismiss, className = '' }) => (
  <div
    role="alert"
    className={`flex items-start gap-x-3 border rounded-2xl px-4 py-3.5 text-sm ${alertStyles[variant].wrap} ${className}`}
  >
    <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alertStyles[variant].icon}`} viewBox="0 0 20 20" fill="currentColor">
      {alertIcons[variant]}
    </svg>
    <div className="flex-1">
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      {children && <div className="opacity-90">{children}</div>}
    </div>
    {onDismiss && (
      <button onClick={onDismiss} aria-label="Dismiss" className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

// =============================================
// Toast — provider + hook + container
// Usage: wrap app in <ToastProvider>, call const { showToast } = useToast()
// =============================================
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, variant: options.variant || 'info', duration: options.duration ?? 4000 };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-2xl border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-bottom-2 fade-in ${alertStyles[t.variant].wrap}`}
          >
            <div className="flex items-start justify-between gap-x-3">
              <span>{t.message}</span>
              <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

// =============================================
// ProgressBar
// =============================================
export const ProgressBar = ({ value = 0, max = 100, label, showValue = false, variant = 'primary', className = '' }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColors = {
    primary: 'bg-app-primary',
    accent: 'bg-app-accent',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5 text-xs font-medium text-app-text-secondary">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-app-surface-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColors[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// =============================================
// Skeleton — loading placeholder
// =============================================
export const Skeleton = ({ variant = 'text', width, height, className = '' }) => {
  const shapes = {
    text: 'h-3.5 rounded-md',
    circle: 'rounded-full aspect-square',
    rect: 'rounded-2xl',
  };
  return (
    <div
      className={`animate-pulse bg-app-surface-muted ${shapes[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};

// =============================================
// EmptyState
// =============================================
export const EmptyState = ({ icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
    {icon && <div className="w-14 h-14 rounded-2xl bg-app-surface-muted flex items-center justify-center text-app-text-secondary mb-4">{icon}</div>}
    {title && <h3 className="font-semibold text-app-text mb-1">{title}</h3>}
    {description && <p className="text-sm text-app-text-secondary max-w-sm mb-5">{description}</p>}
    {action}
  </div>
);

export default { Alert, ToastProvider, useToast, ProgressBar, Skeleton, EmptyState };
