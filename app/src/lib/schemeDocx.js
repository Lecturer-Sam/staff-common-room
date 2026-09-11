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

/**
 * Editable Word version of the Scheme of Learning, matching the printed
 * sample: WEEKS / STRAND / SUB-STRANDS / CONTENT STANDARD / INDICATORS /
 * RESOURCES, with full-width REVISION / EXAMINATION / VACATION rows.
 */
export async function downloadSchemeDocx({
  subjectName,
  gradeLabel = 'Basic 1',
  term,
  rows,
  authorName,
  notes,
  watermark = false,
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
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [header, ...body],
    }),
  ]

  if (notes) {
    children.push(...cellParas(`\nNotes:\n${notes}`, { size: 18 }))
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveBlob(
    blob,
    `Scheme-of-Learning_${safeName(subjectName)}_Term-${term}_${safeName(gradeLabel)}${watermark ? '_SAMPLE' : ''}.docx`,
  )
}
