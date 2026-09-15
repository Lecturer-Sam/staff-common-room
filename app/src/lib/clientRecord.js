/**
 * Client-side Record of Work generation.
 *
 * Companion to lib/clientScheme.js, and the same idea: the data already ships
 * in /curriculum/<grade>_schedules.json, so the document can be assembled in
 * the browser with no Python host.
 *
 * The schedules file is the largest in the bundle (~3 MB per grade) because it
 * holds every lesson of the year, so it is only fetched when someone actually
 * asks for a record — never to populate a dropdown.
 */

import { gradeLabel } from './grades'

const cache = new Map() // grade -> lessons[]
const pending = new Map()

/** Fetch and cache one grade's schedules. Never rejects. */
export function loadSchedules(grade) {
  if (!grade) return Promise.resolve(null)
  if (cache.has(grade)) return Promise.resolve(cache.get(grade))
  if (!pending.has(grade)) {
    pending.set(
      grade,
      fetch(`/curriculum/${grade.toLowerCase()}_schedules.json`)
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
 * Narrow a grade's subject list to the ones that actually have schedules.
 *
 * Every grade lists about ten subjects, but only some have scheduled lessons.
 * Offering the rest would produce an empty ledger.
 */
export function withSchedules(subjects, lessons) {
  const ids = new Set((lessons ?? []).map((l) => l?.subjectId).filter(Boolean))
  if (!ids.size) return []
  return (subjects ?? []).filter((s) => ids.has(s.id))
}

/** Just the lessons for one subject (and optionally one term). */
export function lessonsFor(lessons, subjectId, term) {
  return (lessons ?? []).filter(
    (l) =>
      l?.subjectId === subjectId &&
      (term == null || Number(l?.term) === Number(term)),
  )
}

/** Build one .docx per requested subject, without saving anything. */
export async function buildRecordFiles({
  grade,
  subjectId, // '' means every subject that has schedules
  subjects,
  term,
  school,
  teacher,
  className,
  year,
}) {
  const lessons = await loadSchedules(grade)
  const usable = withSchedules(subjects, lessons)
  const chosen = subjectId ? usable.filter((s) => s.id === subjectId) : usable

  if (!chosen.length) {
    throw new Error('No record of work is available for that grade and subject yet.')
  }

  // The exporter is heavy; only pull it in when there is work to do.
  const { buildRecordDocx } = await import('./recordOfWorkDocx')

  const label = gradeLabel(grade)
  const out = []
  for (const s of chosen) {
    const rows = lessonsFor(lessons, s.id, term)
    if (!rows.length) continue
    const { blob, filename } = await buildRecordDocx({
      subjectName: s.name,
      grade,
      gradeLabel: label,
      term,
      lessons: rows,
      school,
      teacher,
      className,
      year,
    })
    out.push({ blob, filename, subjectName: s.name })
  }

  if (!out.length) {
    throw new Error('That record of work has no scheduled lessons yet.')
  }
  return out
}

/** Save one file, or zip several. Returns what was saved, for the toast. */
export async function downloadRecords(args) {
  const files = await buildRecordFiles(args)

  if (files.length === 1) {
    const { saveBlob } = await import('./docxShared')
    saveBlob(files[0].blob, files[0].filename)
    return { filename: files[0].filename, isZip: false, count: 1 }
  }

  const { default: JSZip } = await import('jszip')
  const { saveBlob } = await import('./docxShared')

  const zip = new JSZip()
  for (const f of files) zip.file(f.filename, f.blob)

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `Records-of-Work_${gradeLabel(args.grade).replace(/\s+/g, '-')}${args.term ? `_Term-${args.term}` : ''}.zip`
  saveBlob(blob, filename)
  return { filename, isZip: true, count: files.length }
}
