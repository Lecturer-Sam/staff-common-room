import { cn } from './cn'

/** Shared control styling for inputs / textareas / selects. */
export const controlClass = cn(
  'w-full rounded-lg border border-frame bg-white px-3 py-2 text-sm text-slate-800',
  'placeholder:text-slate-400',
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15',
  'disabled:cursor-not-allowed disabled:opacity-60',
)
