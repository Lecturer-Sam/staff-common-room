import {
  Document,
  Packer,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from 'docx'
import {
  cellParas,
  docHeader,
  loadLogoBuffer,
  safeName,
  sampleBanner,
  saveBlob,
} from './docxShared'

const HEAD_FILL = 'E2E8F0'

function cell(text, { bold, fill, span, width, align } = {}) {
  return new TableCell({
    columnSpan: span,
    shading: fill ? { fill } : undefined,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: cellParas(text, { bold, align }),
  })
}

const labelled = (label, value, opts = {}) =>
  cell(`${label}: ${value ?? ''}`, opts)

/**
 * Editable Word version of the Lesson Plan in the nationally accepted
 * format: header block then DAYS × PHASES table. Landscape A4.
 */
export async function downloadLessonPlanDocx({
  subjectName,
  gradeLabel = 'Basic 1',
  term,
  week,
  header = {},
  days = [],
  authorName,
  watermark = false,
}) {
  const logo = await loadLogoBuffer()
  const H = header

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          labelled('Week Ending', H.weekEnding, { span: 2 }),
          labelled('Class', gradeLabel),
          labelled('Class Size', H.classSize),
          labelled('Subject', subjectName, { span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelled('Duration', H.duration, { span: 2 }),
          labelled('Strand', H.strand, { span: 2 }),
          labelled('Sub Strand', H.subStrand, { span: 2 }),
        ],
      }),
      new TableRow({
        children: [
          labelled('Content Standard', H.contentStandard, { span: 3 }),
          labelled('Indicator', H.indicator, { span: 2 }),
          labelled('Lesson', H.lessonLabel),
        ],
      }),
      new TableRow({
        children: [
          labelled('Performance Indicator', H.performanceIndicator, {
            span: 3,
          }),
          labelled('Core Competencies', H.competencies, { span: 3 }),
        ],
      }),
      new TableRow({
        children: [
          labelled('Teaching / Learning Resources', H.resources, { span: 6 }),
        ],
      }),
      new TableRow({
        children: [
          labelled('New words', H.newWords, { span: 3 }),
          labelled('References', H.references, { span: 3 }),
        ],
      }),
    ],
  })

  const daysTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell('DAYS', { bold: true, fill: HEAD_FILL, width: 10 }),
          cell('PHASE 1: STARTER (Preparing the brain for learning)', {
            bold: true,
            fill: HEAD_FILL,
            width: 28,
          }),
          cell('PHASE 2: MAIN (New learning including assessment)', {
            bold: true,
            fill: HEAD_FILL,
            width: 34,
          }),
          cell('PHASE 3: PLENARY / REFLECTION', {
            bold: true,
            fill: HEAD_FILL,
            width: 28,
          }),
        ],
      }),
      ...days.map(
        (d) =>
          new TableRow({
            children: [
              cell(d.day, { bold: true }),
              cell(d.starter ?? ''),
              cell(d.main ?? ''),
              cell(d.plenary ?? ''),
            ],
          }),
      ),
    ],
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: 'landscape' } },
        },
        children: [
          ...(watermark ? [sampleBanner()] : []),
          ...docHeader({
            logo,
            title: `LESSON PLAN — ${subjectName.toUpperCase()}`,
            subtitle: `TERM ${term} · WEEK ${week} · ${gradeLabel.toUpperCase()}`,
            extra: authorName ? `Prepared by ${authorName}` : undefined,
          }),
          headerTable,
          ...cellParas(' '),
          daysTable,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveBlob(
    blob,
    `Lesson-Plan_${safeName(subjectName)}_Term-${term}_Week-${week}_${safeName(gradeLabel)}${watermark ? '_SAMPLE' : ''}.docx`,
  )
}
