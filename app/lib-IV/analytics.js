import db from '../db/db'

/**
 * Analytics helpers — all read from Dexie, return plain objects.
 * These are async functions; call them inside useLiveQuery or useEffect.
 */

/* ── Mastery ──────────────────────────────────────────────────────────── */

/**
 * Mastery % for a single content standard.
 * Returns null when never attempted.
 */
export async function masteryForStandard(csId) {
  const attempts = await db.attempts.where('csId').equals(csId).toArray()
  if (!attempts.length) return null
  const avg = attempts.reduce((s, a) => s + a.score / a.total, 0) / attempts.length
  return Math.round(avg * 100)
}

/**
 * Mastery map for all standards in a class.
 * Returns { [csId]: pct | null }
 */
export async function masteryMapForClass(classId) {
  const standards = await db.contentStandards.where('classId').equals(classId).toArray()
  const attempts  = await db.attempts.where('classId').equals(classId).toArray()

  // Group attempts by csId
  const byCs = {}
  attempts.forEach((a) => {
    if (!byCs[a.csId]) byCs[a.csId] = []
    byCs[a.csId].push(a)
  })

  const map = {}
  standards.forEach((cs) => {
    const list = byCs[cs.id]
    if (!list?.length) { map[cs.id] = null; return }
    const avg = list.reduce((s, a) => s + a.score / a.total, 0) / list.length
    map[cs.id] = Math.round(avg * 100)
  })
  return map
}

/* ── Streak ───────────────────────────────────────────────────────────── */

/**
 * Returns the current daily streak (consecutive days with ≥1 attempt,
 * counting back from today).
 */
export async function currentStreak() {
  const attempts = await db.attempts.orderBy('date').toArray()
  if (!attempts.length) return 0

  const days = [...new Set(attempts.map((a) => a.date))].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)

  // Streak must include today or yesterday (grace period)
  if (days[0] !== today) {
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
    if (days[0] !== yesterday) return 0
  }

  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1])
    const curr = new Date(days[i])
    const diff = (prev - curr) / 864e5   // days apart
    if (Math.round(diff) === 1) streak++
    else break
  }
  return streak
}

/* ── Recent attempts ──────────────────────────────────────────────────── */

/**
 * Last N attempts, newest first, enriched with contentStandard metadata.
 */
export async function recentAttempts(limit = 20) {
  const attempts = await db.attempts
    .orderBy('date')
    .reverse()
    .limit(limit)
    .toArray()

  const csIds = [...new Set(attempts.map((a) => a.csId))]
  const standards = await db.contentStandards.bulkGet(csIds)
  const csMap = {}
  standards.forEach((cs) => { if (cs) csMap[cs.id] = cs })

  return attempts.map((a) => ({
    ...a,
    standard: csMap[a.csId] ?? null,
    pct: Math.round((a.score / a.total) * 100),
  }))
}

/* ── Subject radar data ───────────────────────────────────────────────── */

/**
 * Builds an array of { subject, pct } for use in a Recharts RadarChart.
 * Only includes subjects where attempts exist.
 */
export async function subjectRadarData(classId) {
  const subjects = await db.subjects.toArray()
  const result   = []

  for (const subj of subjects) {
    const attempts = await db.attempts
      .where('[classId+subjectId]')
      .equals([classId, subj.id])
      .toArray()

    if (!attempts.length) continue

    const avg = attempts.reduce((s, a) => s + a.score / a.total, 0) / attempts.length
    result.push({ subject: subj.name, pct: Math.round(avg * 100), fullMark: 100 })
  }

  return result
}

/* ── Continue learning ────────────────────────────────────────────────── */

/**
 * Returns up to 3 content standards that have been attempted but
 * have mastery < 70% — ordered by lowest mastery first.
 * Used for "Continue Learning" cards on the Home screen.
 */
export async function weakStandards(classId, limit = 3) {
  const attempts = await db.attempts.where('classId').equals(classId).toArray()
  if (!attempts.length) return []

  // Group by csId, compute avg mastery
  const byCs = {}
  attempts.forEach((a) => {
    if (!byCs[a.csId]) byCs[a.csId] = []
    byCs[a.csId].push(a)
  })

  const entries = Object.entries(byCs).map(([csId, list]) => {
    const pct = Math.round(
      (list.reduce((s, a) => s + a.score / a.total, 0) / list.length) * 100,
    )
    return { csId, pct, attempts: list.length }
  })

  const weak = entries.filter((e) => e.pct < 70).sort((a, b) => a.pct - b.pct)

  // Enrich with standard metadata
  const ids       = weak.slice(0, limit).map((e) => e.csId)
  const standards = await db.contentStandards.bulkGet(ids)
  const csMap     = {}
  standards.forEach((cs) => { if (cs) csMap[cs.id] = cs })

  return weak.slice(0, limit).map((e) => ({
    ...e,
    standard: csMap[e.csId] ?? null,
  }))
}
