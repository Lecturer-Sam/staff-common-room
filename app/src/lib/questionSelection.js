/**
 * Question Selection Engine — PRD §7
 * Implements: randomized without repeats, difficulty balancing, bloom balancing, coverage balancing.
 *
 * Pure functions — no Firestore, no React. Tested via audit tools.
 */

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function groupBy(arr, keyFn) {
  const m = new Map()
  arr.forEach((item) => {
    const k = keyFn(item)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(item)
  })
  return m
}

/**
 * Select N questions from pool without repeats, with optional balancing.
 *
 * @param {Array} pool - questions
 * @param {Object} opts
 * @param {number} opts.count - requested count
 * @param {Object} opts.difficultyBalance - e.g. {easy:0.4, medium:0.4, hard:0.2} sums to 1
 * @param {boolean} opts.bloomBalance - try to spread across bloom levels
 * @param {boolean} opts.coverIndicators - spread across indicator codes
 * @returns {{selected: Array, warnings: string[]}}
 */
export function selectQuestions(pool, { count, difficultyBalance, bloomBalance = false, coverIndicators = false } = {}) {
  const warnings = []
  const n = Math.max(1, Number(count) || 1)

  if (!pool || pool.length === 0) {
    return { selected: [], warnings: ['No questions in pool'] }
  }

  if (pool.length < n) {
    warnings.push(`Only ${pool.length} questions available (requested ${n}) — returning all available.`)
  }

  let working = shuffle(pool)

  // Difficulty balancing
  if (difficultyBalance && typeof difficultyBalance === 'object') {
    const byDiff = groupBy(working, (q) => q.difficulty || 'medium')
    const target = {}
    Object.entries(difficultyBalance).forEach(([diff, ratio]) => {
      target[diff] = Math.round(n * ratio)
    })
    // Adjust rounding drift
    const sum = Object.values(target).reduce((a, b) => a + b, 0)
    if (sum !== n) {
      const firstKey = Object.keys(target)[0]
      target[firstKey] += n - sum
    }

    const selected = []
    const remaining = [...working]

    // Pick per difficulty target
    for (const [diff, need] of Object.entries(target)) {
      const bucket = shuffle(byDiff.get(diff) || [])
      const take = Math.min(need, bucket.length)
      selected.push(...bucket.slice(0, take))
      // Remove taken from remaining
      const takenIds = new Set(selected.map((q) => q.id))
      remaining.splice(0, remaining.length, ...remaining.filter((q) => !takenIds.has(q.id)))
      if (take < need) {
        warnings.push(`Difficulty ${diff}: only ${take} available (wanted ${need}) — filling from other difficulties.`)
      }
    }

    // Fill remainder from leftover if balancing left gaps
    if (selected.length < Math.min(n, pool.length)) {
      const need = Math.min(n, pool.length) - selected.length
      const filler = shuffle(remaining).slice(0, need)
      selected.push(...filler)
    }

    working = shuffle(selected).slice(0, Math.min(n, pool.length))
  } else {
    working = working.slice(0, Math.min(n, pool.length))
  }

  // Bloom balancing — secondary shuffle to intermix bloom levels if requested
  if (bloomBalance) {
    const byBloom = groupBy(working, (q) => q.bloomLevel || 'understand')
    // Round-robin across bloom buckets to avoid clustering
    const buckets = Array.from(byBloom.values()).map((b) => shuffle(b))
    const mixed = []
    let idx = 0
    while (mixed.length < working.length) {
      let added = false
      for (const bucket of buckets) {
        if (bucket[idx]) {
          mixed.push(bucket[idx])
          added = true
        }
      }
      if (!added) break
      idx++
    }
    working = mixed.slice(0, working.length)
  }

  // Indicator coverage — ensure we don't pick 10 questions from same indicator if others exist
  if (coverIndicators) {
    const byIndicator = groupBy(pool, (q) => q.indicatorCode || q.contentStandardCode || 'unknown')
    // If pool has many indicators but working is clustered, re-balance
    const uniqueIndicatorsInPool = byIndicator.size
    const uniqueInSelected = new Set(working.map((q) => q.indicatorCode || q.contentStandardCode)).size
    if (uniqueIndicatorsInPool > 1 && uniqueInSelected < Math.min(uniqueIndicatorsInPool, working.length)) {
      // Greedy: pick one per indicator first, then fill
      const onePer = []
      for (const bucket of byIndicator.values()) {
        if (bucket.length > 0) onePer.push(shuffle(bucket)[0])
      }
      const selectedIds = new Set(onePer.map((q) => q.id))
      const remaining = pool.filter((q) => !selectedIds.has(q.id))
      const need = Math.min(n, pool.length) - onePer.length
      if (need > 0) {
        onePer.push(...shuffle(remaining).slice(0, need))
      }
      working = shuffle(onePer).slice(0, Math.min(n, pool.length))
      warnings.push(`Coverage balancing: spread across ${uniqueIndicatorsInPool} indicators/standards.`)
    }
  }

  return { selected: working, warnings }
}

/**
 * Generate sections for a paper — each section is a type + count.
 * Reuses selectQuestions per section to avoid cross-type contamination.
 *
 * @param {Array} pool - all filtered questions
 * @param {Array} sectionConfigs - [{type, count, marks, difficultyBalance?}]
 * @returns {{sections: Array, totalMarks: number, warnings: string[], allSelected: Array}}
 */
export function generatePaperSections(pool, sectionConfigs) {
  const allWarnings = []
  const allSelected = []
  let number = 1
  let totalMarks = 0
  const sections = []

  // Keep track of used IDs to ensure no repeats across sections
  const usedIds = new Set()

  sectionConfigs.forEach((cfg, idx) => {
    const typePool = pool.filter((q) => {
      if (cfg.type === 'objective') return ['objective', 'mcq', 'true_false', 'fill_blank'].includes(q.type)
      if (cfg.type === 'essay') return ['essay', 'short', 'essay_legacy'].includes(q.type) || !!q.essayType
      return q.type === cfg.type
    }).filter((q) => !usedIds.has(q.id))

    const { selected, warnings } = selectQuestions(typePool, {
      count: cfg.count,
      difficultyBalance: cfg.difficultyBalance,
      bloomBalance: cfg.bloomBalance,
      coverIndicators: cfg.coverIndicators,
    })

    allWarnings.push(...warnings.map((w) => `Section ${idx + 1} (${cfg.type}): ${w}`))

    const withNumbers = selected.map((q) => {
      const marks = cfg.marks ? Number(cfg.marks) : (q.marks ?? 1)
      totalMarks += marks
      const out = { ...q, number: number++, marks }
      usedIds.add(q.id)
      return out
    })

    if (withNumbers.length > 0) {
      sections.push({
        type: cfg.type,
        label: cfg.label || `SECTION ${String.fromCharCode(65 + idx)} — ${cfg.type.toUpperCase()}`,
        instructions: cfg.instructions || '',
        questions: withNumbers,
      })
      allSelected.push(...withNumbers)
    }
  })

  return { sections, totalMarks, warnings: allWarnings, allSelected }
}

export const SelectionEngine = {
  shuffle,
  selectQuestions,
  generatePaperSections,
}
