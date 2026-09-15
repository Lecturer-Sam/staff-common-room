import React, { forwardRef, useId } from 'react';

// =============================================
// Field wrapper — shared label / helper / error layout
// =============================================
const Field = ({ label, helperText, error, required, id, children }) => (
  <div>
    {label && (
      <label htmlFor={id} className="block text-xs font-semibold mb-1.5 text-app-text-secondary">
        {label}
        {required && <span className="text-app-accent ml-0.5">*</span>}
      </label>
    )}
    {children}
    {(error || helperText) && (
      <p className={`mt-1.5 text-xs ${error ? 'text-red-600' : 'text-app-text-secondary'}`}>
        {error || helperText}
      </p>
    )}
  </div>
);

// =============================================
// Input
// =============================================
export const Input = forwardRef(function Input(
  { label, helperText, error, required, leftIcon, rightIcon, className = '', id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} helperText={helperText} error={error} required={required} id={inputId}>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-secondary">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          className={`w-full px-4 py-3 border bg-app-surface text-sm rounded-3xl focus:outline-none transition-colors placeholder:text-app-text-secondary/60 ${
            error ? 'border-red-400 focus:border-red-500' : 'border-app-border focus:border-app-primary'
          } ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-secondary">
            {rightIcon}
          </span>
        )}
      </div>
    </Field>
  );
});

// =============================================
// Textarea
// =============================================
export const Textarea = forwardRef(function Textarea(
  { label, helperText, error, required, rows = 4, className = '', id, ...props },
  ref
) {
  const autoId = useId();
  const textareaId = id || autoId;
  return (
    <Field label={label} helperText={helperText} error={error} required={required} id={textareaId}>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={!!error || undefined}
        className={`w-full px-4 py-3 border bg-app-surface text-sm rounded-2xl focus:outline-none transition-colors resize-y placeholder:text-app-text-secondary/60 ${
          error ? 'border-red-400 focus:border-red-500' : 'border-app-border focus:border-app-primary'
        } ${className}`}
        {...props}
      />
    </Field>
  );
});

// =============================================
// Select — native <select>, custom-styled chevron
// =============================================
export const Select = forwardRef(function Select(
  { label, helperText, error, required, options = [], placeholder, className = '', id, ...props },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <Field label={label} helperText={helperText} error={error} required={required} id={selectId}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error || undefined}
          defaultValue={props.defaultValue ?? ''}
          className={`w-full appearance-none px-4 py-3 pr-10 border bg-app-surface text-sm rounded-3xl focus:outline-none transition-colors ${
            error ? 'border-red-400 focus:border-red-500' : 'border-app-border focus:border-app-primary'
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-secondary"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </Field>
  );
});

// =============================================
// Checkbox
// =============================================
export const Checkbox = forwardRef(function Checkbox({ label, description, className = '', id, ...props }, ref) {
  const autoId = useId();
  const checkboxId = id || autoId;
  return (
    <label htmlFor={checkboxId} className={`flex items-start gap-x-2.5 cursor-pointer group ${className}`}>
      <input
        ref={ref}
        id={checkboxId}
        type="checkbox"
        className="mt-0.5 w-4 h-4 rounded-md border-app-border text-app-primary focus:ring-app-primary focus:ring-offset-0 cursor-pointer"
        {...props}
      />
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-app-text">{label}</span>}
          {description && <span className="block text-xs text-app-text-secondary">{description}</span>}
        </span>
      )}
    </label>
  );
});

// =============================================
// RadioGroup
// =============================================
export const RadioGroup = ({ name, label, options = [], value, onChange, className = '' }) => {
  const groupId = useId();
  return (
    <div className={className} role="radiogroup" aria-label={label}>
      {label && <span className="block text-xs font-semibold mb-2 text-app-text-secondary">{label}</span>}
      <div className="space-y-2">
        {options.map((opt) => {
          const optId = `${groupId}-${opt.value}`;
          return (
            <label key={opt.value} htmlFor={optId} className="flex items-center gap-x-2.5 cursor-pointer">
              <input
                id={optId}
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange?.(opt.value)}
                disabled={opt.disabled}
                className="w-4 h-4 border-app-border text-app-primary focus:ring-app-primary focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm font-medium text-app-text">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

// =============================================
// Switch (toggle)
// =============================================
export const Switch = forwardRef(function Switch({ label, description, checked, onChange, className = '', id, ...props }, ref) {
  const autoId = useId();
  const switchId = id || autoId;
  return (
    <div className={`flex items-center justify-between gap-x-4 ${className}`}>
      {(label || description) && (
        <label htmlFor={switchId} className="cursor-pointer">
          {label && <span className="block text-sm font-medium text-app-text">{label}</span>}
          {description && <span className="block text-xs text-app-text-secondary">{description}</span>}
        </label>
      )}
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary focus-visible:ring-offset-2 ${
          checked ? 'bg-app-primary' : 'bg-app-surface-muted'
        }`}
        {...props}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
});

export default { Input, Textarea, Select, Checkbox, RadioGroup, Switch };
