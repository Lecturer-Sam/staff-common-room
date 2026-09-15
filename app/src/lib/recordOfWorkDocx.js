/**
 * Client-side Record of Work generation.
 *
 * Where a Scheme of Learning is the *plan*, the Record of Work is the *log* —
 * filled in as teaching happens and signed by the headteacher. It closes the
 * loop: plan → teach → record.
 *
 * Built from /curriculum/<grade>_schedules.json, which already carries every
 * teaching day of the year with its curriculum reference and activity summary,
 * so the teacher is left only the parts that must be handwritten: date,
 * evaluation and remarks.
 *
 * Column layout, week separators, band labels and truncation limits mirror
 * tools/generate_records_of_work.py, so the browser output matches the Python
 * one. Note the schedules file uses camelCase field names where the enriched
 * lesson files use snake_case; mapScheduleRow() bridges the two.
 */

import {
  AlignmentType,
  Document,
  Packer,
  PageBreak,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { cellParas, docHeader, loadLogoBuffer, safeName, saveBlob } from './docxShared'

// Landscape Letter, 11" x 8.5", 0.5" sides and 0.6" top/bottom.
const PAGE = {
  orientation: PageOrientation.LANDSCAPE,
  width: 15840, // 11in  (twips)
  height: 12240, // 8.5in
}
const MARGIN = { top: 864, right: 720, bottom: 864, left: 720 }

// Proportional widths, summing to 100. Kept in step with the Python
// COL_WIDTHS (inches out of 10.0 usable) so the table still fits the page.
const COL_WIDTHS = [5.5, 6.2, 2.9, 3.5, 12.7, 12.3, 14.1, 17.0, 9.5, 16.3]

const COL_HEADS = [
  'DATE',
  'DAY',
  'WK',
  'LES',
  'STRAND / SUB-STRAND',
  'CONTENT STANDARD & INDICATOR',
  'LEARNING OUTCOME(S)',
  'ACTIVITIES UNDERTAKEN',
  'T / L RESOURCES',
  'EVALUATION / REMARKS',
]

const HEAD_FILL = 'E2E8F0'
const NAVY = '002060'

// Matches BANDS in the Python generator.
const BANDS = {
  B1: 'Lower Primary',
  B2: 'Lower Primary',
  B3: 'Lower Primary',
  B4: 'Upper Primary',
  B5: 'Upper Primary',
  B6: 'Upper Primary',
  B7: 'JHS 1',
  B8: 'JHS 2',
  B9: 'JHS 3',
}

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
]

const ELLIPSIS = '…'

/** Collapse the PDF page markers and stray whitespace the sources carry. */
function clean(v) {
  if (typeof v !== 'string') return ''
  return v.replace(/\s*===\s*PAGE \d+\s*===[\s\S]*$/, '').replace(/\s+/g, ' ').trim()
}

function trunc(text, n) {
  const t = clean(text)
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+$/, '')}${ELLIPSIS}`
}

/** Strip the boilerplate prefix from the performance indicator. */
function outcome(lesson) {
  const p = clean(lesson?.performanceIndicator)
    .replace(/^By the end of the lesson,?\s*learners?\s*will be able to:?\s*/i, '')
  return trunc(p, 150)
}

/** A brief, printable summary of what the period covers. */
function activities(lesson) {
  const main = lesson?.main ?? []
  const plen = lesson?.plenary ?? []
  const out = []
  if (main[0]) out.push(trunc(main[0], 130))
  if (main[1]) out.push(trunc(main[1], 130))
  if (plen[0]) out.push(trunc(plen[0], 95))
  return out
}

/**
 * One schedule row -> the shape the table renderer expects.
 * Python reads snake_case from the enriched files; the bundle is camelCase.
 */
export function mapScheduleRow(lesson) {
  return {
    kind: 'day',
    week: lesson?.week,
    day: lesson?.day ?? '',
    lessonNum: lesson?.lessonNum,
    strand: clean(lesson?.strandName),
    subStrand: clean(lesson?.subStrandName),
    contentStandardCode: lesson?.contentStandardCode ?? '',
    indicatorCode: lesson?.indicatorCode ?? '',
    indicatorText: clean(lesson?.indicatorDescription),
    outcome: outcome(lesson),
    activities: activities(lesson),
    resources: trunc(lesson?.resources, 110),
    isRevision: Boolean(lesson?.isRevision),
  }
}

/**
 * Week separator rows + one row per teaching day, for one term.
 * `term` may be omitted to cover the whole year.
 */
export function buildRows(lessons, term) {
  const byWeek = new Map()
  for (const l of lessons ?? []) {
    if (term != null && Number(l?.term) !== Number(term)) continue
    const w = l?.week
    if (!byWeek.has(w)) byWeek.set(w, [])
    byWeek.get(w).push(l)
  }

  const rows = []
  for (const week of [...byWeek.keys()].sort((a, b) => Number(a) - Number(b))) {
    rows.push({ kind: 'week', week })
    const days = byWeek.get(week).sort((a, b) => {
      const ia = DAY_ORDER.indexOf(a?.day)
      const ib = DAY_ORDER.indexOf(b?.day)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
    for (const l of days) rows.push(mapScheduleRow(l))
  }
  return rows
}

function cell(text, { bold, fill, span, width, size = 13, align } = {}) {
  return new TableCell({
    columnSpan: span,
    shading: fill ? { fill } : undefined,
    width: width != null ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: cellParas(text, { bold, size, align }),
  })
}

function tableFor(rows) {
  const header = new TableRow({
    tableHeader: true,
    children: COL_HEADS.map((h, i) =>
      cell(h, { bold: true, fill: HEAD_FILL, width: COL_WIDTHS[i], align: 'center' }),
    ),
  })

  const body = rows.map((row) => {
    if (row.kind === 'week') {
      // "WEEK n" then a merged "Week Ending" strip across the rest.
      return new TableRow({
        children: [
          cell(`WEEK ${row.week}`, { bold: true, fill: HEAD_FILL, width: COL_WIDTHS[0], size: 14 }),
          cell('Week Ending: ______________________', {
            bold: true,
            fill: HEAD_FILL,
            span: COL_HEADS.length - 1,
            width: COL_WIDTHS.slice(1).reduce((a, b) => a + b, 0),
            size: 14,
          }),
        ],
      })
    }

    return new TableRow({
      children: [
        cell('', { width: COL_WIDTHS[0] }), // date — filled in by hand
        cell(row.day, { width: COL_WIDTHS[1], size: 14 }),
        cell(String(row.week ?? ''), { width: COL_WIDTHS[2] }),
        cell(String(row.lessonNum ?? ''), { width: COL_WIDTHS[3] }),
        cell([row.strand, row.subStrand].filter(Boolean).join('\n'), { width: COL_WIDTHS[4] }),
        cell(
          [row.contentStandardCode, row.indicatorCode, trunc(row.indicatorText, 95)]
            .filter(Boolean)
            .join('\n'),
          { width: COL_WIDTHS[5] },
        ),
        cell(row.outcome, { width: COL_WIDTHS[6] }),
        cell(row.activities.join('\n'), { width: COL_WIDTHS[7] }),
        cell(row.resources, { width: COL_WIDTHS[8] }),
        cell('', { width: COL_WIDTHS[9] }), // evaluation — filled in by hand
      ],
    })
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...body],
  })
}

function para(text, { size = 18, bold, italics, align = 'center', before, after } = {}) {
  return new Paragraph({
    alignment: AlignmentType[align.toUpperCase()] ?? AlignmentType.CENTER,
    spacing: { before, after },
    children: [new TextRun({ text, size, bold, italics, color: bold ? NAVY : undefined })],
  })
}

/** 'School: Achimota' when supplied, 'School: ______' when not. */
function field(label, value, width = 22) {
  return value ? `${label}: ${value}` : `${label}: ${'_'.repeat(width)}`
}

function termHeading(term, subjectName, gradeNum) {
  return `TERM ${term}  ·  ${subjectName.toUpperCase()}  ·  BASIC ${gradeNum}`
}

/**
 * Build the document and hand back the bytes instead of saving them, so
 * callers can zip several subjects together.
 */
export async function buildRecordDocx({
  subjectName,
  grade = 'B4',
  gradeLabel,
  term,
  lessons,
  school,
  teacher,
  className,
  year,
}) {
  const logo = await loadLogoBuffer()
  const gradeNum = String(grade).replace(/^B/i, '')
  const label = gradeLabel ?? `Basic ${gradeNum}`
  const terms = term ? [Number(term)] : [1, 2, 3]

  const children = [
    ...docHeader({
      logo,
      title: 'RECORD OF WORK',
      subtitle: `${subjectName} · ${label} · ${BANDS[grade] ?? ''}`.replace(/\s+·\s+$/, ''),
    }),
    para(
      `${field('School', school, 38)}      ${field('Class', className, 12)}      ${field('Academic Year', year, 10)}`,
      { size: 18, bold: true },
    ),
    para(
      `${field('Teacher', teacher, 36)}      Subject: ${subjectName}      ${field('Term', term ? String(term) : '', 6)}`,
      { size: 18, bold: true },
    ),
    para(
      'Pre-printed from the Beacon lesson library: every teaching day of the year is listed with its curriculum reference and activity summary. Complete the DATE and EVALUATION / REMARKS column as you teach, and have the headteacher sign at the end of each week.',
      { size: 16, italics: true, before: 120, after: 120 },
    ),
  ]

  terms.forEach((t, i) => {
    if (i > 0 || terms.length > 1) children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(para(termHeading(t, subjectName, gradeNum), { size: 24, bold: true, after: 60 }))
    children.push(tableFor(buildRows(lessons, t)))
  })

  children.push(
    para(
      "Class Teacher's Signature: ____________________      Date: ____________            Headteacher's Signature: ____________________      Date: ____________",
      { size: 18, bold: true, before: 200 },
    ),
  )

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: PAGE, margin: MARGIN } },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `Record-of-Work_${safeName(subjectName)}_${term ? `Term-${term}` : 'Full-year'}_${safeName(label)}.docx`
  return { blob, filename }
}

/** Build and save in one step. */
export async function downloadRecordDocx(args) {
  const { blob, filename } = await buildRecordDocx(args)
  saveBlob(blob, filename)
  return filename
}
