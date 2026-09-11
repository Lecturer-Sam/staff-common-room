function normalize(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim()
}

export function isCorrect(question, given) {
  if (given === undefined || given === null || given === '') return false
  switch (question.type) {
    case 'mcq':
    case 'tf':
      return given === question.answer
    case 'multi': {
      if (!Array.isArray(given)) return false
      const a = [...given].sort((x, y) => x - y)
      const b = [...question.answer].sort((x, y) => x - y)
      return a.length === b.length && a.every((v, i) => v === b[i])
    }
    case 'num': {
      const n = Number.parseFloat(given)
      return Number.isFinite(n) && Math.abs(n - question.answer) < 1e-6
    }
    case 'short':
      return question.answer.some((acc) => normalize(acc) === normalize(given))
    default:
      return false
  }
}

export function gradeSession(questions, answers) {
  const detail = questions.map((q) => {
    const given = answers[q.id]
    return { questionId: q.id, given: given === undefined ? null : given, correct: isCorrect(q, given) }
  })
  const score = detail.filter((d) => d.correct).length
  return { score, total: questions.length, detail }
}