import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ORG_NAME = 'BEACON EDUCATIONAL CONSULT'
const ORG_TAGLINE = 'Teacher Network · Curriculum-aligned schemes & lesson plans'

async function loadLogoDataUrl() {
  try {
    const res = await fetch('/beaconlogo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Generate and download a Scheme of Learning PDF laid out like the
 * consortium's printed sample: branded header, then a table with one row
 * per week (Strand / Sub-strand / Content Standard / Indicators / Resources)
 * and full-width REVISION / EXAMINATION / VACATION rows.
 */
export async function downloadSchemePdf({
  subjectName,
  gradeLabel = 'Basic 1',
  term,
  rows,
  authorName,
  notes,
  watermark = false,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const logo = await loadLogoDataUrl()

  // ---- Branded header ----
  let y = 42
  if (logo) {
    doc.addImage(logo, 'PNG', margin, y - 14, 46, 46)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(ORG_NAME, pageWidth / 2, y, { align: 'center' })
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(ORG_TAGLINE, pageWidth / 2, y, { align: 'center' })
  y += 24
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('SCHEME OF LEARNING', pageWidth / 2, y, { align: 'center' })
  y += 18
  doc.setFontSize(11)
  doc.text(subjectName.toUpperCase(), pageWidth / 2, y, { align: 'center' })
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`TERM ${term}  ·  ${gradeLabel.toUpperCase()}`, pageWidth / 2, y, {
    align: 'center',
  })
  y += 14
  doc.setFontSize(8)
  doc.setTextColor(100)
  const prepared = [
    authorName ? `Prepared by ${authorName}` : null,
    new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  ]
    .filter(Boolean)
    .join('  ·  ')
  doc.text(prepared, pageWidth / 2, y, { align: 'center' })
  doc.setTextColor(0)
  y += 12

  // ---- Scheme table ----
  const body = (rows ?? []).map((row) =>
    row.kind === 'special'
      ? [
          { content: String(row.week ?? ''), styles: { fontStyle: 'bold' } },
          {
            content: row.label ?? '',
            colSpan: 5,
            styles: { halign: 'center', fontStyle: 'bold' },
          },
        ]
      : [
          String(row.week ?? ''),
          row.strand ?? '',
          row.subStrand ?? '',
          row.contentStandards ?? '',
          row.indicators ?? '',
          row.resources ?? '',
        ],
  )

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        'WEEKS',
        'STRAND',
        'SUB-STRANDS',
        'CONTENT STANDARD',
        'INDICATORS',
        'RESOURCES',
      ],
    ],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 4,
      valign: 'top',
      lineColor: [100, 116, 139],
      lineWidth: 0.5,
      textColor: 20,
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: 20,
      fontStyle: 'bolditalic',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold' },
      1: { cellWidth: 90 },
      2: { cellWidth: 110 },
      3: { cellWidth: 75 },
      4: { cellWidth: 75 },
      5: { cellWidth: 'auto' },
    },
  })

  // ---- Notes ----
  if (notes) {
    const endY = doc.lastAutoTable?.finalY ?? y
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes:', margin, endY + 18)
    doc.setFont('helvetica', 'normal')
    doc.text(
      doc.splitTextToSize(notes, pageWidth - margin * 2),
      margin,
      endY + 30,
    )
  }

  // ---- Page footer (+ optional SAMPLE watermark) ----
  const pageCount = doc.getNumberOfPages()
  const pageHeight = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    if (watermark) {
      doc.saveGraphicsState?.()
      doc.setGState?.(doc.GState({ opacity: 0.12 }))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(52)
      doc.setTextColor(220, 38, 38)
      doc.text('SAMPLE — PENDING APPROVAL', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 55,
      })
      doc.restoreGraphicsState?.()
      doc.setTextColor(0)
    }

    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text(
      `${ORG_NAME} — Scheme of Learning · ${subjectName} · Term ${term} · ${gradeLabel}`,
      margin,
      doc.internal.pageSize.getHeight() - 20,
    )
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'right' },
    )
  }

  const safe = (s) => String(s).replace(/[^a-z0-9]+/gi, '-')
  doc.save(
    `Scheme-of-Learning_${safe(subjectName)}_Term-${term}_${safe(gradeLabel)}${watermark ? '_SAMPLE' : ''}.pdf`,
  )
}
