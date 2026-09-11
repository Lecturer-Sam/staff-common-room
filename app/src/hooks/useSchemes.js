import { useEffect, useState } from 'react'

// Pre-generated Schemes of Learning, one static file per grade, served from
// /curriculum/. Built by tools/build_app_curriculum.py from the enriched
// lesson library, so every row matches the lessons actually taught that week.
//
// Shape: { grade, teachingWeeksPerTerm, subjects: { [subjectId]: { [term]: rows[] } } }
//
// Row shape is identical to the rows ForecastForm already uses and to those
// produced by lib/schemeAuto.js — { week, kind, strand, subStrand,
// contentStandards, indicators, resources, indicatorIds }, plus
// { kind: 'special', label } rows for REVISION / EXAMINATION / VACATION.

const cache = new Map() // grade -> payload
const pending = new Map() // grade -> in-flight promise

function loadSchemes(grade) {
  if (cache.has(grade)) return Promise.resolve(cache.get(grade))
  if (!pending.has(grade)) {
    pending.set(
      grade,
      fetch(`/curriculum/${grade.toLowerCase()}_schemes.json`)
        .then((r) =>
          r.ok && (r.headers.get('content-type') ?? '').includes('json')
            ? r.json()
            : null,
        )
        .catch(() => null)
        .then((data) => {
          cache.set(grade, data)
          return data
        }),
    )
  }
  return pending.get(grade)
}

/**
 * The pre-generated scheme for one subject and term.
 *
 * `available` is false for subjects with no scheduled lessons (there is no
 * scheme to load) — callers should hide the action in that case rather than
 * offering a button that does nothing.
 */
export function useSchemes(grade, subjectId, term) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let active = true
    setRows(null)
    if (!grade || !subjectId || !term) {
      return () => {
        active = false
      }
    }
    loadSchemes(grade).then((data) => {
      if (!active) return
      const forSubject = data?.subjects?.[subjectId]
      const forTerm = forSubject?.[String(term)]
      setRows(Array.isArray(forTerm) ? forTerm : [])
    })
    return () => {
      active = false
    }
  }, [grade, subjectId, term])

  return {
    loading: rows === null,
    available: (rows?.length ?? 0) > 0,
    rows: rows ?? [],
  }
}
