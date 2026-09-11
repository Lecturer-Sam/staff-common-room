const SHORT = {
  mathematics: 'Math', english: 'English', science: 'Science', socialstudies: 'Social',
  computing: 'Computing', careertech: 'Career Tech', rme: 'RME', creativearts: 'Arts',
}

const pct = (a) => Math.round((a.score / a.total) * 100)

function localDay(iso) {
  // en-CA gives YYYY-MM-DD in the user's local timezone — streaks must be local, not UTC
  return new Date(iso).toLocaleDateString('en-CA')
}

export function getStreak(attempts) {
  const days = new Set(attempts.map((a) => localDay(a.date)))
  let streak = 0
  const cursor = new Date()
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1) // yesterday counts
  while (days.has(localDay(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function buildAnalytics(attempts, subjects) {
  const perSubject = subjects.map((s) => {
    const own = attempts.filter((a) => a.subjectId === s.id)
    return {
      ...s,
      count: own.length,
      avgPercent: own.length ? Math.round(own.reduce((x, a) => x + pct(a), 0) / own.length) : null,
      lastDate: own.length ? [...own.map((a) => a.date)].sort().at(-1) : null,
    }
  })
  return {
    totals: {
      count: attempts.length,
      avgPercent: attempts.length ? Math.round(attempts.reduce((x, a) => x + pct(a), 0) / attempts.length) : 0,
      bestPercent: attempts.length ? Math.max(...attempts.map(pct)) : 0,
      totalSeconds: attempts.reduce((s, a) => s + a.timeSeconds, 0),
    },
    perSubject,
    streak: getStreak(attempts),
    weak: perSubject
      .filter((s) => s.avgPercent !== null && s.avgPercent < 70)
      .sort((a, b) => a.avgPercent - b.avgPercent),
    radar: perSubject
      .filter((s) => s.avgPercent !== null)
      .map((s) => ({ subject: SHORT[s.id] ?? s.name, value: s.avgPercent })),
  }
}