import { cn } from './cn'

/**
 * Field — label + control wrapper with optional hint/error.
 *
 * Usage:
 *   <Field label="Title" htmlFor="title" error={errors.title}>
 *     <Input id="title" ... />
 *   </Field>
 */
export default function Field({ label, htmlFor, hint, error, className, children }) {
  return (
    <div className={cn(className)}>
      {label && (
        <label htmlFor={htmlFor} className="label-caps">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}
