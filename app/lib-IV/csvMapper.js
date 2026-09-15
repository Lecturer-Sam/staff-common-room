import Papa from 'papaparse'

/**
 * Expected CSV columns (case-insensitive header matching):
 *
 *   csId        — content standard id  e.g. "jhs1-mathematics-b7-1-1-1"
 *   classId     — e.g. "jhs1"
 *   subjectId   — e.g. "mathematics"
 *   type        — mcq | multi | tf | num | short
 *   difficulty  — easy | medium | hard
 *   stem        — question text
 *   optionA…D   — option text (blank for num/short)
 *   answer      — 0-based index for mcq/tf, comma-separated indices for multi,
 *                 number for num, text for short
 *   explanation — explanation text
 *   tags        — comma-separated tag list
 *
 * Returns { rows: QuestionObject[], errors: string[] }
 */

const VALID_TYPES       = new Set(['mcq', 'multi', 'tf', 'num', 'short'])
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard'])

/** Normalise a header string to lowercase with no spaces */
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '')

/** Parse the raw answer field into the right JS type for each question type */
function parseAnswer(raw, type) {
  const s = String(raw ?? '').trim()
  switch (type) {
    case 'mcq':
    case 'tf':
      return parseInt(s, 10)
    case 'multi':
      return s.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n))
    case 'num':
      return parseFloat(s)
    case 'short':
      return s.split(',').map((x) => x.trim()).filter(Boolean)
    default:
      return s
  }
}

/**
 * Parse a CSV string (or File) and map rows to question objects.
 *
 * @param {string|File} input
 * @returns {Promise<{ rows: object[], errors: string[] }>}
 */
export async function parseCSV(input) {
  return new Promise((resolve) => {
    const config = {
      header: true,
      skipEmptyLines: true,
      transformHeader: norm,
      complete({ data, errors: parseErrors }) {
        const errors = parseErrors.map((e) => `Parse error row ${e.row}: ${e.message}`)
        const rows   = []
        let counter  = 1

        data.forEach((raw, i) => {
          const rowNum = i + 2 // 1-based + header row

          const type       = norm(raw.type)
          const difficulty = norm(raw.difficulty)
          const csId       = String(raw.csid ?? '').trim()
          const classId    = String(raw.classid ?? '').trim()
          const subjectId  = String(raw.subjectid ?? '').trim()
          const stem       = String(raw.stem ?? '').trim()

          // ── Validation ──────────────────────────────────────────────────
          if (!csId)                         { errors.push(`Row ${rowNum}: csId is required`); return }
          if (!classId)                      { errors.push(`Row ${rowNum}: classId is required`); return }
          if (!subjectId)                    { errors.push(`Row ${rowNum}: subjectId is required`); return }
          if (!stem)                         { errors.push(`Row ${rowNum}: stem is required`); return }
          if (!VALID_TYPES.has(type))        { errors.push(`Row ${rowNum}: invalid type "${raw.type}"`); return }
          if (!VALID_DIFFICULTIES.has(difficulty)) {
            errors.push(`Row ${rowNum}: invalid difficulty "${raw.difficulty}"`); return
          }

          // ── Build options array ──────────────────────────────────────────
          const options = ['optiona', 'optionb', 'optionc', 'optiond', 'optione', 'optionf']
            .map((k) => String(raw[k] ?? '').trim())
            .filter(Boolean)

          // ── Build row ────────────────────────────────────────────────────
          const subjectCode = subjectId.slice(0, 2).toLowerCase()
          const classCode   = classId.replace('jhs', 'b')
          const id          = `${subjectCode}-${classCode}-csv${String(counter++).padStart(3, '0')}`

          rows.push({
            id,
            csId,
            classId,
            subjectId,
            type,
            difficulty,
            stem,
            options,
            answer:      parseAnswer(raw.answer, type),
            explanation: String(raw.explanation ?? '').trim(),
            tags:        String(raw.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
          })
        })

        resolve({ rows, errors })
      },
    }

    if (typeof input === 'string') {
      Papa.parse(input, config)
    } else {
      Papa.parse(input, config)  // File object — PapaParse handles it natively
    }
  })
}

/**
 * Export an array of question objects as a CSV string.
 * Columns match the import format so exported files can be re-imported.
 */
export function questionsToCSV(questions) {
  const rows = questions.map((q) => ({
    id:          q.id,
    csId:        q.csId,
    classId:     q.classId,
    subjectId:   q.subjectId,
    type:        q.type,
    difficulty:  q.difficulty,
    stem:        q.stem,
    optionA:     q.options?.[0] ?? '',
    optionB:     q.options?.[1] ?? '',
    optionC:     q.options?.[2] ?? '',
    optionD:     q.options?.[3] ?? '',
    answer:      Array.isArray(q.answer) ? q.answer.join(',') : String(q.answer ?? ''),
    explanation: q.explanation ?? '',
    tags:        (q.tags ?? []).join(','),
  }))
  return Papa.unparse(rows)
}
