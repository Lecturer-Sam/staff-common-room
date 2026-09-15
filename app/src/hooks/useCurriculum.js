import { useEffect, useState } from 'react'

// Curriculum data is served as static JSON per grade from /curriculum/.
// Currently only Basic 1 (B1) is extracted; more grades (Nursery–B9) will be
// added as <grade>_subjects.json / <grade>_indicators.json / <grade>_schedules.json.
const DEFAULT_GRADE = 'B1'

// Module-level caches: each file is fetched at most once per session.
const cache = new Map() // key: `${grade}` -> { subjects, indicators }
const pending = new Map()
const scheduleCache = new Map() // key: `${grade}` -> lessons[]
const schedulePending = new Map()

function loadCore(grade) {
  if (cache.has(grade)) return Promise.resolve(cache.get(grade))
  if (!pending.has(grade)) {
    const g = grade.toLowerCase()
    pending.set(
      grade,
      Promise.all([
        fetch(`/curriculum/${g}_subjects.json`).then((r) => r.json()),
        fetch(`/curriculum/${g}_indicators.json`).then((r) => r.json()),
      ]).then(([subjects, indicators]) => {
        const data = { subjects, indicators }
        cache.set(grade, data)
        return data
      }),
    )
  }
  return pending.get(grade)
}

function loadSchedules(grade) {
  if (scheduleCache.has(grade)) return Promise.resolve(scheduleCache.get(grade))
  if (!schedulePending.has(grade)) {
    schedulePending.set(
      grade,
      fetch(`/curriculum/${grade.toLowerCase()}_schedules.json`)
        .then((r) =>
          r.ok && (r.headers.get('content-type') ?? '').includes('json')
            ? r.json()
            : [],
        )
        .catch(() => [])
        .then((lessons) => {
          scheduleCache.set(grade, lessons)
          return lessons
        }),
    )
  }
  return schedulePending.get(grade)
}

let gradesCache = null
let gradesPending = null

/** All grades with extracted curriculum data (from grades.json). */
export function useGrades() {
  const [grades, setGrades] = useState(gradesCache)
  useEffect(() => {
    let active = true
    if (!gradesCache) {
      gradesPending ??= fetch('/curriculum/grades.json')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
        .then((g) => {
          gradesCache = g
          return g
        })
      gradesPending.then((g) => active && setGrades(g))
    }
    return () => {
      active = false
    }
  }, [])
  return grades ?? []
}

let allSubjectsCache = null
let allSubjectsPending = null

/**
 * Every distinct subject across all grades (KG–B9), for "subjects I teach"
 * pickers and name resolution — unlike useCurriculum(grade), which only knows
 * one grade's subjects (B1 by default, so it omits JHS-only subjects like
 * Social Studies and Career Technology). Deduped by display name, keeping the
 * id that spans the most grades; sorted by name. Only fetches the small
 * per-grade subjects files, never the large indicator files.
 */
export function useAllSubjects() {
  const [subjects, setSubjects] = useState(allSubjectsCache)
  useEffect(() => {
    let active = true
    if (!allSubjectsCache) {
      allSubjectsPending ??= fetch('/curriculum/grades.json')
        .then((r) => (r.ok ? r.json() : []))
        .then((grades) =>
          Promise.all(
            grades.map((g) =>
              fetch(`/curriculum/${g.id.toLowerCase()}_subjects.json`)
                .then((r) => (r.ok ? r.json() : []))
                .catch(() => []),
            ),
          ),
        )
        .then((lists) => {
          const byId = new Map() // id -> { id, name, count of grades }
          for (const list of lists) {
            for (const s of list) {
              const e = byId.get(s.id) ?? { id: s.id, name: s.name, count: 0 }
              e.count += 1
              byId.set(s.id, e)
            }
          }
          const byName = new Map()
          for (const e of byId.values()) {
            const prev = byName.get(e.name)
            if (!prev || e.count > prev.count) byName.set(e.name, e)
          }
          allSubjectsCache = [...byName.values()]
            .map(({ id, name }) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name))
          return allSubjectsCache
        })
      allSubjectsPending.then((s) => active && setSubjects(s))
    }
    return () => {
      active = false
    }
  }, [])
  return subjects ?? []
}

/** True when an indicator's text is still an extraction placeholder. */
const subjectCache = new Map() // grade -> subjects[]
const subjectPending = new Map()

/**
 * Just one grade's subject list, without the indicators.
 *
 * useCurriculum() also loads <grade>_indicators.json (~450 KB) that callers
 * like the Materials page never read. This fetches only the small subjects
 * file, and is cached the same way.
 */
export function useGradeSubjects(grade) {
  const [subjects, setSubjects] = useState(subjectCache.get(grade))

  useEffect(() => {
    let active = true
    if (!grade || subjectCache.has(grade)) {
      return () => {
        active = false
      }
    }
    subjectPending.get(grade) ??
      subjectPending.set(
        grade,
        fetch(`/curriculum/${grade.toLowerCase()}_subjects.json`)
          .then((r) =>
            r.ok && (r.headers.get('content-type') ?? '').includes('json')
              ? r.json()
              : [],
          )
          .catch(() => [])
          .then((list) => {
            subjectCache.set(grade, list)
            return list
          }),
      )
    subjectPending.get(grade).then((list) => active && setSubjects(list))
    return () => {
      active = false
    }
  }, [grade])

  return subjects ?? []
}

export function isPlaceholder(text) {
  return /(Learning Indicator|Content Standard) [BK]|^Sub-strand [BK]/.test(
    text ?? '',
  )
}

export function useCurriculum(grade = DEFAULT_GRADE) {
  const [data, setData] = useState(cache.get(grade))

  useEffect(() => {
    let active = true
    // loadCore resolves immediately (microtask) when cached
    loadCore(grade).then((d) => active && setData(d))
    return () => {
      active = false
    }
  }, [grade])

  return {
    loading: !data,
    grade,
    subjects: data?.subjects ?? [],
    indicators: data?.indicators ?? [],
  }
}

/** Scheduled lessons (term/week/day) for subjects that have them extracted. */
export function useSchedules(grade = DEFAULT_GRADE) {
  const [lessons, setLessons] = useState(scheduleCache.get(grade))

  useEffect(() => {
    let active = true
    // loadSchedules resolves immediately (microtask) when cached
    loadSchedules(grade).then((l) => active && setLessons(l))
    return () => {
      active = false
    }
  }, [grade])

  return { loading: !lessons, lessons: lessons ?? [] }
}

/** Group a subject's flat indicators into Strand → Sub-strand → Content Standard → Indicators. */
export function buildTree(indicators, subjectId) {
  const strands = new Map()
  for (const ind of indicators) {
    if (ind.subjectId !== subjectId) continue
    if (!strands.has(ind.strandNumber)) {
      strands.set(ind.strandNumber, {
        number: ind.strandNumber,
        name: ind.strandName,
        subStrands: new Map(),
      })
    }
    const strand = strands.get(ind.strandNumber)
    if (!strand.subStrands.has(ind.subStrandNumber)) {
      strand.subStrands.set(ind.subStrandNumber, {
        number: ind.subStrandNumber,
        name: ind.subStrandName,
        standards: new Map(),
      })
    }
    const sub = strand.subStrands.get(ind.subStrandNumber)
    if (!sub.standards.has(ind.contentStandardCode)) {
      sub.standards.set(ind.contentStandardCode, {
        code: ind.contentStandardCode,
        description: ind.contentStandardDescription,
        indicators: [],
      })
    }
    sub.standards.get(ind.contentStandardCode).indicators.push(ind)
  }
  const byNumber = (a, b) => a.number - b.number
  return [...strands.values()].sort(byNumber).map((s) => ({
    ...s,
    subStrands: [...s.subStrands.values()].sort(byNumber).map((ss) => ({
      ...ss,
      standards: [...ss.standards.values()].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true }),
      ),
    })),
  }))
}
