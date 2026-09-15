/**
 * Client-side Scheme of Learning generation.
 *
 * Builds the document in the browser from the pre-generated scheme rows that
 * tools/build_app_curriculum.py ships to /curriculum/<grade>_schemes.json,
 * using the `docx` library already used elsewhere in the app. No server is
 * involved, so this works on a static deployment with no Python host.
 *
 * The rows are the same ones the Python generator (tools/generate_schemes.py)
 * produces, because both read the same enriched lesson library. That keeps the
 * output identical whether the document is built here or by the service.
 */

import { gradeLabel } from './grades'

const cache = new Map() // grade -> payload
const pending = new Map() // grade -> in-flight promise

/** Fetch and cache one grade's scheme file. Never rejects. */
export function loadSchemes(grade) {
  if (!grade) return Promise.resolve(null)
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
 * Narrow a grade's subject list to the ones that actually have a scheme.
 *
 * Most grades list ten subjects but only seven have scheduled lessons, so
 * offering all ten would let a teacher pick one and download an empty table.
 */
export function withSchemes(subjects, schemeData) {
  const ids = Object.keys(schemeData?.subjects ?? {})
  if (!ids.length) return []
  return (subjects ?? []).filter((s) => ids.includes(s.id))
}

/**
 * The rows for one subject and term.
 *
 * With no term the three terms are concatenated in order, which is what a
 * "full year" scheme means — the row shape carries no term of its own.
 */
export function schemeRows(schemeData, subjectId, term) {
  const byTerm = schemeData?.subjects?.[subjectId]
  if (!byTerm) return []
  if (term) return byTerm[String(term)] ?? []
  return ['1', '2', '3'].flatMap((t) => byTerm[t] ?? [])
}

/**
 * Build one .docx per requested subject.
 *
 * Returns [{ blob, filename, subjectName }] without saving anything, so the
 * caller can download a single file or bundle several into a zip.
 */
export async function buildSchemeFiles({
  grade,
  subjectId, // '' means every subject that has a scheme
  subjects,
  term,
  authorName,
  notes,
}) {
  const data = await loadSchemes(grade)
  const wanted = withSchemes(subjects, data)
  const chosen = subjectId ? wanted.filter((s) => s.id === subjectId) : wanted

  if (!chosen.length) {
    throw new Error('No scheme is available for that grade and subject yet.')
  }

  // The exporter is heavy; only pull it in when there is work to do.
  const { buildSchemeDocx } = await import('./schemeDocx')

  const label = gradeLabel(grade)
  const out = []
  for (const s of chosen) {
    const rows = schemeRows(data, s.id, term)
    if (!rows.length) continue
    const { blob, filename } = await buildSchemeDocx({
      subjectName: s.name,
      gradeLabel: label,
      term: term || '1-3',
      rows,
      authorName,
      notes,
    })
    out.push({ blob, filename, subjectName: s.name })
  }

  if (!out.length) {
    throw new Error('That scheme has no rows to print yet.')
  }
  return out
}

/** Save one file, or zip several. Returns what was saved, for the toast. */
export async function downloadSchemes(args) {
  const files = await buildSchemeFiles(args)

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
  const filename = `Schemes-of-Learning_${gradeLabel(args.grade).replace(/\s+/g, '-')}${args.term ? `_Term-${args.term}` : ''}.zip`
  saveBlob(blob, filename)
  return { filename, isZip: true, count: files.length }
}
