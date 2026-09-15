/**
 * 2026/2027 Ghana Basic Schools Academic Calendar
 * Source: Beacon Educational Consult calendar.md
 */

export const ACADEMIC_YEAR = '2026/2027'

export const TERMS = [
  {
    id: 'term1',
    label: 'First Term',
    weeks: 15,
    opens: new Date('2026-09-08'),
    closes: new Date('2026-12-17'),
    vacationStart: new Date('2026-12-18'),
    vacationEnd: new Date('2027-01-04'),
    midTermBreak: { start: new Date('2026-11-05'), end: new Date('2026-11-06') },
  },
  {
    id: 'term2',
    label: 'Second Term',
    weeks: 12,
    opens: new Date('2027-01-05'),
    closes: new Date('2027-03-25'),
    vacationStart: new Date('2027-03-26'),
    vacationEnd: new Date('2027-04-19'),
    midTermBreak: null,
  },
  {
    id: 'term3',
    label: 'Third Term',
    weeks: 14,
    opens: new Date('2027-04-20'),
    closes: new Date('2027-07-22'),
    vacationStart: new Date('2027-07-23'),
    vacationEnd: null, // end of academic year
    midTermBreak: null,
  },
]

export const BECE = {
  label: 'BECE Examinations',
  start: new Date('2027-05-05'),
  end: new Date('2027-05-12'),
}

// ── Helper functions ──────────────────────────────────────────────────────

/** Strip time from a date for day-level comparisons */
function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Days between two dates (positive = future, negative = past) */
export function daysUntil(date) {
  const ms = new Date(date).setHours(0, 0, 0, 0) - today().getTime()
  return Math.round(ms / 86_400_000)
}

/** Format a Date as "8 Sep 2026" */
export function fmtDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Format a date range as "5 – 12 May 2027" */
export function fmtRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) {
    return `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
  }
  return `${fmtDate(s)} – ${fmtDate(e)}`
}

/**
 * Returns the current academic status:
 *
 *  { type: 'in-term',      term, weekNumber, daysToClose }
 *  { type: 'mid-term',     term, daysToReopen }
 *  { type: 'vacation',     nextTerm | null, daysToReopen | null }
 *  { type: 'before-year',  daysToOpen }
 *  { type: 'year-ended' }
 */
export function getAcademicStatus() {
  const t = today()

  for (const term of TERMS) {
    // Mid-term break check (only Term 1 has one)
    if (term.midTermBreak) {
      const { start, end } = term.midTermBreak
      if (t >= start && t <= end) {
        const reopenDate = new Date(end)
        reopenDate.setDate(reopenDate.getDate() + 1)
        return {
          type: 'mid-term',
          term,
          label: `${term.label} mid-term break`,
          daysToReopen: daysUntil(reopenDate),
          reopenDate,
        }
      }
    }

    // In term
    if (t >= term.opens && t <= term.closes) {
      const msInTerm = t.getTime() - term.opens.getTime()
      const weekNumber = Math.min(Math.ceil(msInTerm / 604_800_000) + 1, term.weeks)
      return {
        type: 'in-term',
        term,
        weekNumber,
        daysToClose: daysUntil(term.closes),
      }
    }

    // In vacation after this term
    if (term.vacationStart && t >= term.vacationStart) {
      // Find the next term
      const nextTerm = TERMS[TERMS.indexOf(term) + 1] ?? null
      const endOfVacation = term.vacationEnd ?? (nextTerm ? nextTerm.opens : null)
      if (!nextTerm) {
        // After Third Term vacation = year ended
        return { type: 'year-ended' }
      }
      if (endOfVacation && t <= endOfVacation) {
        return {
          type: 'vacation',
          term,
          nextTerm,
          daysToReopen: daysUntil(nextTerm.opens),
          reopenDate: nextTerm.opens,
        }
      }
    }
  }

  // Before academic year starts
  const firstTerm = TERMS[0]
  if (t < firstTerm.opens) {
    return {
      type: 'before-year',
      daysToOpen: daysUntil(firstTerm.opens),
      openDate: firstTerm.opens,
    }
  }

  return { type: 'year-ended' }
}

/**
 * Progress percentage through a term (0–100).
 * Returns null if we're not currently in that term.
 */
export function termProgress(term) {
  const t = today()
  if (t < term.opens || t > term.closes) return null
  const elapsed = t.getTime() - term.opens.getTime()
  const total = term.closes.getTime() - term.opens.getTime()
  return Math.min(100, Math.round((elapsed / total) * 100))
}
