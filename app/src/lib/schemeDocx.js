import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
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

/**
 * Editable Word version of the Scheme of Learning, matching the printed
 * sample: WEEKS / STRAND / SUB-STRANDS / CONTENT STANDARD / INDICATORS /
 * RESOURCES, with full-width REVISION / EXAMINATION / VACATION rows.
 */
export function schemeFilename({ subjectName, term, gradeLabel, watermark }) {
  return `Scheme-of-Learning_${safeName(subjectName)}_Term-${term}_${safeName(gradeLabel)}${watermark ? '_SAMPLE' : ''}.docx`
}

/**
 * Build the document and hand back the bytes instead of saving them.
 *
 * `generateMaterials` needs this rather than downloadSchemeDocx: when a
 * teacher asks for every subject in a grade the files are bundled into one
 * .zip, which is impossible if the exporter saves each one as it goes.
 */
/** 'School: Achimota' when supplied, 'School: ______' when not. */
export function field(label, value, width = 22) {
  return value ? `${label}: ${value}` : `${label}: ${'_'.repeat(width)}`
}

export async function buildSchemeDocx({
  subjectName,
  gradeLabel = 'Basic 1',
  term,
  rows,
  authorName,
  notes,
  watermark = false,
  // Cover branding. Each falls back to a handwritten blank, matching the
  // Python generator — see field() in tools/generate_schemes.py.
  school,
  className,
  year,
  hod,
}) {
  const logo = await loadLogoBuffer()

  const header = new TableRow({
    tableHeader: true,
    children: [
      cell('WEEKS', { bold: true, fill: HEAD_FILL, width: 7 }),
      cell('STRAND', { bold: true, fill: HEAD_FILL, width: 17 }),
      cell('SUB-STRANDS', { bold: true, fill: HEAD_FILL, width: 21 }),
      cell('CONTENT STANDARD', { bold: true, fill: HEAD_FILL, width: 14 }),
      cell('INDICATORS', { bold: true, fill: HEAD_FILL, width: 14 }),
      cell('RESOURCES', { bold: true, fill: HEAD_FILL, width: 27 }),
    ],
  })

  const body = (rows ?? []).map((row) =>
    row.kind === 'special'
      ? new TableRow({
          children: [
            cell(row.week ?? '', { bold: true }),
            cell(row.label ?? '', {
              bold: true,
              span: 5,
              align: 'center',
              fill: 'F8FAFC',
            }),
          ],
        })
      : new TableRow({
          children: [
            cell(row.week ?? '', { bold: true }),
            cell(row.strand ?? ''),
            cell(row.subStrand ?? ''),
            cell(row.contentStandards ?? ''),
            cell(row.indicators ?? ''),
            cell(row.resources ?? ''),
          ],
        }),
  )

  const children = [
    ...(watermark ? [sampleBanner()] : []),
    ...docHeader({
      logo,
      title: 'SCHEME OF LEARNING',
      subtitle: `${subjectName.toUpperCase()} · TERM ${term} · ${gradeLabel.toUpperCase()}`,
      extra: authorName ? `Prepared by ${authorName}` : undefined,
    }),
  ]

  // Cover fields, only when at least one was supplied — a plain export stays
  // exactly as it was.
  const hasBranding = school || className || year || hod || authorName
  if (hasBranding) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: [
              field('School', school, 38),
              field('Class', className, 12),
              field('Academic Year', year, 10),
            ].join('      '),
            bold: true,
            size: 18,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: [
              field('Teacher', authorName, 36),
              field('HoD', hod, 20),
            ].join('      '),
            bold: true,
            size: 18,
          }),
        ],
      }),
    )
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [header, ...body],
    }),
  )

  if (notes) {
    children.push(...cellParas(`\nNotes:\n${notes}`, { size: 18 }))
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  return {
    blob,
    filename: schemeFilename({ subjectName, term, gradeLabel, watermark }),
  }
}

/** Build and save in one step — the path the forecast screen uses. */
export async function downloadSchemeDocx(args) {
  const { blob, filename } = await buildSchemeDocx(args)
  saveBlob(blob, filename)
}
