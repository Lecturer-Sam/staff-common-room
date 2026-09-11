export function buildBreakdown(qmap, attempt) {
  const byDifficulty = { easy: { score: 0, total: 0 }, medium: { score: 0, total: 0 }, hard: { score: 0, total: 0 } }
  const byTag = {}
  const missed = []

  for (const a of attempt.answers) {
    const q = qmap[a.questionId]
    if (!q) continue // question no longer in the bank (re-seed) — skip gracefully
    byDifficulty[q.difficulty].total++
    if (a.correct) byDifficulty[q.difficulty].score++
    for (const t of q.tags) {
      byTag[t] = byTag[t] ?? { tag: t, score: 0, total: 0 }
      byTag[t].total++
      if (a.correct) byTag[t].score++
    }
    if (!a.correct) missed.push({ question: q, given: a.given })
  }

  const percent = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0
  return {
    percent,
    byDifficulty: Object.entries(byDifficulty)
      .filter(([, v]) => v.total > 0)
      .map(([key, v]) => ({ key, ...v })),
    weakTags: Object.values(byTag)
      .filter((t) => t.score < t.total)
      .sort((a, b) => a.score / a.total - b.score / b.total),
    missed,
  }
}

export function displayAnswer(question) {
  switch (question.type) {
    case 'mcq':
    case 'tf': return question.options[question.answer]
    case 'multi': return question.answer.map((i) => question.options[i]).join(', ')
    case 'num': return String(question.answer)
    case 'short': return question.answer[0]
    default: return ''
  }
}

export function displayGiven(question, given) {
  if (given === undefined || given === null || given === '') return '— unanswered'
  if (question.type === 'multi')
    return (Array.isArray(given) ? given : [given]).map((i) => question.options[i] ?? i).join(', ')
  if (question.type === 'mcq' || question.type === 'tf') return question.options[given] ?? String(given)
  return String(given)
}