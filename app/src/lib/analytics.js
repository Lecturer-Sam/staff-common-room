/**
 * Analytics — PRD Phase 4: basic metrics for early launch
 * Tracks: time to generate, success rate, coverage, active users, renewal, etc.
 * For MVP: localStorage + console + optional Firestore `analytics_events` collection.
 * No external analytics dependency yet (keep @vercel/analytics for page views).
 */

const LS_KEY = 'beacon_qb_analytics'

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}')
  } catch {
    return {}
  }
}
function saveLocal(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {}
}

export function trackGeneration({ success, grade, subjectId, contentStandardCode, requested, returned, timeMs, warnings = [], templateId, hasSchool = false }) {
  const event = {
    type: 'question_generation',
    timestamp: new Date().toISOString(),
    success,
    grade,
    subjectId,
    contentStandardCode,
    requested,
    returned,
    timeMs,
    warningsCount: warnings.length,
    templateId,
    hasSchool,
    successRate: requested ? returned / requested : 0,
  }

  // Local storage aggregation for quick dashboard
  const local = loadLocal()
  local.generations = local.generations || []
  local.generations.push(event)
  // Keep last 100
  if (local.generations.length > 100) local.generations = local.generations.slice(-100)
  // Aggregates
  local.stats = local.stats || { total: 0, success: 0, totalTime: 0, totalRequested: 0, totalReturned: 0 }
  local.stats.total++
  if (success) local.stats.success++
  local.stats.totalTime += timeMs || 0
  local.stats.totalRequested += requested || 0
  local.stats.totalReturned += returned || 0
  saveLocal(local)

  console.log('[QB Analytics] Generation:', event)

  // Optional: Firestore write for school-wide analytics (best-effort, no throw)
  // Uncomment when analytics_events collection + rules exist
  // import('./analyticsFirestore').then(({ logAnalyticsEvent }) => logAnalyticsEvent(event)).catch(() => {})

  return event
}

export function getLocalAnalytics() {
  const local = loadLocal()
  const gens = local.generations || []
  const stats = local.stats || { total: 0, success: 0, totalTime: 0, totalRequested: 0, totalReturned: 0 }
  const avgTime = stats.total ? Math.round(stats.totalTime / stats.total) : 0
  const successRate = stats.total ? stats.success / stats.total : 0
  const fulfillmentRate = stats.totalRequested ? stats.totalReturned / stats.totalRequested : 0

  // Recent 7 days
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const recent = gens.filter((g) => new Date(g.timestamp).getTime() > sevenDaysAgo)

  return {
    totalGenerations: stats.total,
    successfulGenerations: stats.success,
    successRate,
    fulfillmentRate,
    avgTimeMs: avgTime,
    totalRequested: stats.totalRequested,
    totalReturned: stats.totalReturned,
    recentGenerations: recent.length,
    generations: gens,
  }
}

export function timeOperation(fn) {
  const start = performance.now()
  const result = fn()
  const elapsed = Math.round(performance.now() - start)
  if (result && typeof result.then === 'function') {
    return result.then((r) => ({ result: r, timeMs: Math.round(performance.now() - start) }))
  }
  return { result, timeMs: elapsed }
}

export function trackQuestionContribution({ grade, subjectId, contentStandardCode }) {
  const local = loadLocal()
  local.contributions = local.contributions || []
  local.contributions.push({ timestamp: new Date().toISOString(), grade, subjectId, contentStandardCode })
  if (local.contributions.length > 200) local.contributions = local.contributions.slice(-200)
  saveLocal(local)
}
