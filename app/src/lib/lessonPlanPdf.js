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

const label = (t, v) => ({
  content: `${t}: ${v ?? ''}`,
})

/**
 * Generate and download a Lesson Plan PDF following the nationally accepted
 * format: header block (week ending, class, strand, content standard,
 * indicator, performance indicator, competencies, resources, new words,
 * references) followed by the DAYS × PHASES table. Fields the system could
 * not generate are printed with blank space for handwriting.
 */
export async function downloadLessonPlanPdf({
  subjectName,
  gradeLabel = 'Basic 1',
  term,
  week,
  header = {},
  days = [],
  authorName,
  watermark = false,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 36
  const logo = await loadLogoDataUrl()

  // ---- Branded header ----
  let y = 40
  if (logo) doc.addImage(logo, 'PNG', margin, y - 14, 42, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(ORG_NAME, pageWidth / 2, y, { align: 'center' })
  y += 13
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(ORG_TAGLINE, pageWidth / 2, y, { align: 'center' })
  y += 18
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(
    `LESSON PLAN — ${subjectName.toUpperCase()}`,
    pageWidth / 2,
    y,
    { align: 'center' },
  )
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `TERM ${term} · WEEK ${week} · ${gradeLabel.toUpperCase()}${authorName ? ` · Prepared by ${authorName}` : ''}`,
    pageWidth / 2,
    y,
    { align: 'center' },
  )
  y += 12

  // ---- Header block (6 logical columns) ----
  const H = header
  const headerBody = [
    [
      { ...label('Week Ending', H.weekEnding), colSpan: 2 },
      { ...label('Class', gradeLabel), colSpan: 1 },
      { ...label('Class Size', H.classSize), colSpan: 1 },
      { ...label('Subject', subjectName), colSpan: 2 },
    ],
    [
      { ...label('Duration', H.duration), colSpan: 2 },
      { ...label('Strand', H.strand), colSpan: 2 },
      { ...label('Sub Strand', H.subStrand), colSpan: 2 },
    ],
    [
      { ...label('Content Standard', H.contentStandard), colSpan: 3 },
      { ...label('Indicator', H.indicator), colSpan: 2 },
      { ...label('Lesson', H.lessonLabel), colSpan: 1 },
    ],
    [
      { ...label('Performance Indicator', H.performanceIndicator), colSpan: 3 },
      { ...label('Core Competencies', H.competencies), colSpan: 3 },
    ],
    [{ ...label('Teaching / Learning Resources', H.resources), colSpan: 6 }],
    [
      { ...label('New words', H.newWords), colSpan: 3 },
      { ...label('References', H.references), colSpan: 3 },
    ],
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: headerBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      valign: 'top',
      lineColor: [100, 116, 139],
      lineWidth: 0.5,
      textColor: 20,
      minCellHeight: 18,
    },
  })

  // ---- Days × phases table ----
  const daysBody = days.map((d) => [
    { content: d.day, styles: { fontStyle: 'bold' } },
    d.starter ?? '',
    d.main ?? '',
    d.plenary ?? '',
  ])

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY ?? y) + 10,
    margin: { left: margin, right: margin },
    head: [
      [
        'DAYS',
        'PHASE 1: STARTER (Preparing the brain for learning)',
        'PHASE 2: MAIN (New learning including assessment)',
        'PHASE 3: PLENARY / REFLECTION',
      ],
    ],
    body: daysBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      valign: 'top',
      lineColor: [100, 116, 139],
      lineWidth: 0.5,
      textColor: 20,
      minCellHeight: 60,
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: 20,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 64 },
    },
  })

  // ---- Page footer (+ optional SAMPLE watermark) ----
  const pageCount = doc.getNumberOfPages()
  const pageHeight = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    if (watermark) {
      doc.saveGraphicsState?.()
      doc.setGState?.(doc.GState({ opacity: 0.12 }))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(60)
      doc.setTextColor(220, 38, 38)
      doc.text('SAMPLE — PENDING APPROVAL', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 20,
      })
      doc.restoreGraphicsState?.()
      doc.setTextColor(0)
    }

    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text(
      `${ORG_NAME} — Lesson Plan · ${subjectName} · Term ${term}, Week ${week} · ${gradeLabel}`,
      margin,
      doc.internal.pageSize.getHeight() - 18,
    )
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 18,
      { align: 'right' },
    )
  }

  const safe = (s) => String(s).replace(/[^a-z0-9]+/gi, '-')
  doc.save(
    `Lesson-Plan_${safe(subjectName)}_Term-${term}_Week-${week}_${safe(gradeLabel)}${watermark ? '_SAMPLE' : ''}.pdf`,
  )
}
