/** 'B1' → 'Basic 1'. Falls back to the raw id. */
export const gradeLabel = (g) => {
  if (/^B\d$/.test(g ?? '')) return `Basic ${String(g).slice(1)}`
  if (/^KG[12]$/.test(g ?? '')) return `KG ${String(g).slice(2)}`
  return g ?? ''
}
