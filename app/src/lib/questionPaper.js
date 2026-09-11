import jsPDF from 'jspdf'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import {
  ORG_NAME,
  cellParas,
  docHeader,
  loadLogoBuffer,
  safeName,
  saveBlob,
} from './docxShared'

const LETTERS = ['A', 'B', 'C', 'D']

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
 * paper = {
 *   schoolName, title, subtitle, duration, instructions,
 *   sections: [{ label, instructions, questions: [{ number, question, type,
 *                options, answer, marks }] }],
 *   totalMarks,
 * }
 */

// ---------------- PDF ----------------

export async function downloadPaperPdf(paper, { includeAnswers = false } = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const width = pageWidth - margin * 2
  let y = 40

  const ensure = (needed) => {
    if (y + needed > pageHeight - 40) {
      doc.addPage()
      y = 48
    }
  }
  const writeLines = (text, { size = 10, bold = false, indent = 0, gap = 3 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(String(text), width - indent)
    for (const line of lines) {
      ensure(size + 4)
      doc.text(line, margin + indent, y)
      y += size + gap
    }
  }

  const logo = await loadLogoDataUrl()
  if (logo) doc.addImage(logo, 'PNG', margin, y - 10, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(paper.schoolName || ORG_NAME, pageWidth / 2, y, { align: 'center' })
  y += 16
  doc.setFontSize(12)
  doc.text(paper.title, pageWidth / 2, y, { align: 'center' })
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(paper.subtitle, pageWidth / 2, y, { align: 'center' })
  y += 13
  doc.setFontSize(9)
  doc.setTextColor(90)
  doc.text(
    [
      paper.duration ? `Duration: ${paper.duration}` : null,
      `Total marks: ${paper.totalMarks}`,
    ]
      .filter(Boolean)
      .join('   ·   '),
    pageWidth / 2,
    y,
    { align: 'center' },
  )
  doc.setTextColor(0)
  y += 8
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  if (paper.instructions) {
    writeLines(paper.instructions, { size: 9 })
    y += 6
  }

  for (const section of paper.sections) {
    ensure(40)
    writeLines(section.label, { size: 11, bold: true })
    if (section.instructions) writeLines(section.instructions, { size: 9 })
    y += 4
    for (const q of section.questions) {
      ensure(30)
      writeLines(
        `${q.number}. ${q.question}   [${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}]`,
        { size: 10 },
      )
      if (q.type === 'mcq') {
        q.options.forEach((opt, i) => {
          if (opt) writeLines(`${LETTERS[i]}. ${opt}`, { size: 10, indent: 18 })
        })
      } else {
        // response space
        y += q.type === 'essay' ? 60 : 24
      }
      y += 8
    }
    y += 6
  }

  if (includeAnswers) {
    doc.addPage()
    y = 48
    writeLines('MARKING SCHEME', { size: 12, bold: true })
    y += 4
    for (const section of paper.sections) {
      writeLines(section.label, { size: 10, bold: true })
      for (const q of section.questions) {
        writeLines(
          `${q.number}. ${q.answer || '(no answer provided)'}  [${q.marks}]`,
          { size: 9, indent: 10 },
        )
      }
      y += 6
    }
  }

  // footer
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text(`${ORG_NAME} · ${paper.subtitle}`, margin, pageHeight - 20)
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, pageHeight - 20, {
      align: 'right',
    })
  }
  doc.setTextColor(0)

  doc.save(`${safeName(paper.title)}_${safeName(paper.subtitle)}.pdf`)
}

// ---------------- DOCX ----------------

export async function downloadPaperDocx(paper, { includeAnswers = false } = {}) {
  const logo = await loadLogoBuffer()
  const children = [
    ...docHeader({
      logo,
      title: paper.title.toUpperCase(),
      subtitle: paper.subtitle,
      extra: [
        paper.schoolName,
        paper.duration ? `Duration: ${paper.duration}` : null,
        `Total marks: ${paper.totalMarks}`,
      ]
        .filter(Boolean)
        .join('  ·  '),
    }),
  ]

  if (paper.instructions) {
    children.push(...cellParas(paper.instructions, { size: 18 }))
    children.push(new Paragraph({ text: '' }))
  }

  for (const section of paper.sections) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.label, bold: true, size: 24 })],
      }),
    )
    if (section.instructions) {
      children.push(...cellParas(section.instructions, { size: 18 }))
    }
    children.push(new Paragraph({ text: '' }))
    for (const q of section.questions) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${q.number}. ${q.question}   [${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}]`,
              size: 20,
            }),
          ],
        }),
      )
      if (q.type === 'mcq') {
        q.options.forEach((opt, i) => {
          if (opt) {
            children.push(
              new Paragraph({
                indent: { left: 360 },
                children: [
                  new TextRun({ text: `${LETTERS[i]}. ${opt}`, size: 20 }),
                ],
              }),
            )
          }
        })
      } else {
        const blanks = q.type === 'essay' ? 4 : 1
        for (let i = 0; i < blanks; i++) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '……………………………………………………………………………………………………………',
                  size: 20,
                  color: '94A3B8',
                }),
              ],
            }),
          )
        }
      }
      children.push(new Paragraph({ text: '' }))
    }
  }

  if (includeAnswers) {
    children.push(
      new Paragraph({ pageBreakBefore: true, children: [
        new TextRun({ text: 'MARKING SCHEME', bold: true, size: 26 }),
      ]}),
      new Paragraph({ text: '' }),
    )
    for (const section of paper.sections) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.label, bold: true, size: 20 })],
        }),
      )
      for (const q of section.questions) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${q.number}. ${q.answer || '(no answer provided)'}  [${q.marks}]`,
                size: 18,
              }),
            ],
          }),
        )
      }
      children.push(new Paragraph({ text: '' }))
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveBlob(blob, `${safeName(paper.title)}_${safeName(paper.subtitle)}.docx`)
}
