import { cn } from './cn'

export default function Field({ label, htmlFor, hint, error, className, children }) {
  return (
    <div className={cn('ui-field', className)}>
      {label && <label htmlFor={htmlFor} className="ui-field__label">{label}</label>}
      {children}
      {error ? (
        <p className="ui-field__message ui-field__message--error">{error}</p>
      ) : hint ? (
        <p className="ui-field__message">{hint}</p>
      ) : null}
    </div>
  )
}
