import { buildTree } from '../hooks/useCurriculum'

// Teaching weeks per term, matching the blank-skeleton convention in
// ForecastForm (term 1 is one week shorter). The rest of each term is the
// standard REVISION / EXAMINATION / VACATION block.
const TEACHING = { 1: 10, 2: 11, 3: 11 }
const YEAR_WEEKS = TEACHING[1] + TEACHING[2] + TEACHING[3] // 32

const uniqJoin = (arr) => [...new Set(arr.filter(Boolean))].join('\n')
const uniq = (arr) => [...new Set(arr.filter(Boolean))]

function lessonRow(week) {
  return {
    week: String(week),
    kind: 'lesson',
    strand: '',
    subStrand: '',
    contentStandards: '',
    indicators: '',
    resources: '',
    indicatorIds: [],
  }
}

function specialRow(week, label) {
  return { ...lessonRow(week), kind: 'special', label }
}

/**
 * Flatten a subject's curriculum into ordered teaching units — one per content
 * standard, carrying its strand/sub-strand context and its indicators.
 */
export function contentUnits(indicators, subjectId) {
  const units = []
  for (const strand of buildTree(indicators, subjectId)) {
    for (const ss of strand.subStrands) {
      for (const std of ss.standards) {
        units.push({
          strandName: strand.name,
          subStrandName: ss.name,
          code: std.code,
          indicators: std.indicators,
        })
      }
    }
  }
  return units
}

function rowFromUnits(week, units) {
  const row = lessonRow(week)
  if (!units.length) return row
  const inds = units.flatMap((u) => u.indicators)
  return {
    ...row,
    strand: uniqJoin(units.map((u) => u.strandName)),
    subStrand: uniqJoin(units.map((u) => u.subStrandName)),
    contentStandards: uniqJoin(units.map((u) => u.code)),
    indicators: uniqJoin(inds.map((i) => i.code)),
    resources: uniqJoin(inds.map((i) => i.resources)),
    indicatorIds: uniq(inds.map((i) => i.id)),
  }
}

function specialRows(term) {
  return term === 1
    ? [specialRow(11, 'REVISION'), specialRow('12 & 13', 'EXAMINATION')]
    : [
        specialRow(12, 'REVISION'),
        specialRow(13, 'EXAMINATION'),
        specialRow(14, 'VACATION'),
      ]
}

/**
 * Auto-generate scheme rows for one term by spreading the subject's curriculum
 * content standards across the year and taking the selected term's slice, then
 * distributing that slice evenly across the term's teaching weeks. Returns rows
 * in the exact shape ForecastForm uses, ending with the term's special rows.
 */
export function buildAutoScheme({ indicators, subjectId, term }) {
  const units = contentUnits(indicators, subjectId)
  const weeks = TEACHING[term] ?? 11

  // Year split: term boundaries proportional to each term's teaching weeks, so
  // content standards flow term-by-term the way NaCCA schemes are taught.
  const n = units.length
  const bound = (t) => {
    let cut = 0
    for (let i = 1; i <= t; i++) cut += TEACHING[i]
    return Math.round((n * cut) / YEAR_WEEKS)
  }
  const start = term === 1 ? 0 : bound(term - 1)
  const termUnits = units.slice(start, bound(term))

  // Place each content standard in a week; when there are fewer standards than
  // weeks, a standard spans consecutive weeks (carried forward) so every week
  // is filled; when there are more, a week holds several. No awkward gaps.
  const buckets = Array.from({ length: weeks }, () => [])
  const count = termUnits.length
  termUnits.forEach((u, i) => {
    const w = count ? Math.min(weeks - 1, Math.floor((i * weeks) / count)) : 0
    buckets[w].push(u)
  })

  const rows = []
  let carry = []
  for (let w = 0; w < weeks; w++) {
    if (buckets[w].length) carry = buckets[w]
    rows.push(rowFromUnits(w + 1, buckets[w].length ? buckets[w] : carry))
  }
  rows.push(...specialRows(term))
  return rows
}
