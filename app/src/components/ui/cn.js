/** Tiny classnames joiner — filters falsy values and joins with a space. */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}
