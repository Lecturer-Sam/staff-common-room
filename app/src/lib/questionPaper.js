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
import { getTemplate, buildHeader, buildSectionInstructions, formatMarks } from './testTemplate'

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
 *   schoolName, title, subtitle, subjectName, gradeLabel, duration, instructions,
 *   sections: [{ label, instructions, questions: [{ number, text/question, type, options, correctAnswer/answer, markingGuide, marks, contentStandardCode }] }],
 *   totalMarks, template: {id, name, header, instructions, formatting}
 * }
 */

// ---------------- PDF — with template configurability ----------------

export async function downloadPaperPdf(paper, { includeAnswers = false, template: templateOverride, separateAnswerKey = false } = {}) {
  const template = templateOverride ? (typeof templateOverride === 'string' ? getTemplate(templateOverride) : templateOverride) : (paper.template ? (typeof paper.template === 'string' ? getTemplate(paper.template) : paper.template) : getTemplate('ges_basic_v1'))
  const header = buildHeader(template, paper)

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
  const writeLines = (text, { size = 10, bold = false, indent = 0, gap = 3, color = 0 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    if (color !== 0) doc.setTextColor(color)
    const lines = doc.splitTextToSize(String(text), width - indent)
    for (const line of lines) {
      ensure(size + 4)
      doc.text(line, margin + indent, y)
      y += size + gap
    }
    if (color !== 0) doc.setTextColor(0)
  }

  // Header — school name locked if member has schoolId (PRD Phase 4)
  const logo = template.header.showLogo ? await loadLogoDataUrl() : null
  if (logo) doc.addImage(logo, 'PNG', margin, y - 10, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(header.schoolName || ORG_NAME, pageWidth / 2, y, { align: 'center' })
  y += 16
  doc.setFontSize(12)
  doc.text(header.title, pageWidth / 2, y, { align: 'center' })
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(header.subtitle, pageWidth / 2, y, { align: 'center' })
  y += 13
  doc.setFontSize(9)
  doc.setTextColor(90)
  const metaLine = [
    header.duration && template.header.showDuration ? `Duration: ${header.duration}` : null,
    template.header.showTotalMarks ? `Total marks: ${header.totalMarks}` : null,
    template.header.showDate ? `Date: ${header.date}` : null,
    template.name ? `Template: ${template.name}` : null,
  ].filter(Boolean).join('   ·   ')
  doc.text(metaLine, pageWidth / 2, y, { align: 'center' })
  doc.setTextColor(0)
  y += 8
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  if (header.instructions) {
    writeLines(header.instructions, { size: 9, color: 60 })
    y += 6
  }

  // Sections — numbering continuous across sections per template
  for (const section of paper.sections) {
    ensure(40)
    writeLines(section.label, { size: 11, bold: true })
    const secInstr = section.instructions || buildSectionInstructions(template, section.type || 'mcq')
    if (secInstr) writeLines(secInstr, { size: 9, color: 80 })
    y += 4
    for (const q of section.questions) {
      ensure(30)
      const marksStr = formatMarks(q.marks, template)
      const csSuffix = q.contentStandardCode ? ` [${q.contentStandardCode}]` : ''
      writeLines(`${q.number}. ${q.text || q.question}   ${marksStr}${csSuffix}`, { size: 10 })
      if (q.type === 'mcq' || q.type === 'objective') {
        ;(q.options || []).forEach((opt, i) => {
          if (opt) writeLines(`${LETTERS[i]}. ${opt}`, { size: 10, indent: 18 })
        })
      } else {
        // response space — per template, essay gets more space
        const space = q.type === 'essay' || q.essayType === 'long' ? 80 : q.essayType === 'structured' ? 60 : 24
        y += space
      }
      y += 8
    }
    y += 6
  }

  // Coverage summary — if template says showCoverageSummary (BECE mock)
  if (template.formatting.footer.showCoverageSummary) {
    ensure(60)
    y += 10
    doc.setLineWidth(0.4)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10
    writeLines('Coverage Summary (for audit)', { size: 10, bold: true })
    const csMap = {}
    paper.sections.forEach((s) => s.questions.forEach((q) => {
      if (q.contentStandardCode) csMap[q.contentStandardCode] = (csMap[q.contentStandardCode] || 0) + 1
    }))
    const csList = Object.entries(csMap).map(([cs, count]) => `${cs}: ${count} Qs`).join(', ')
    if (csList) writeLines(csList, { size: 8, color: 80 })
  }

  // Answer key — either inline (legacy) or separate handled by separate function
  if (includeAnswers && !separateAnswerKey) {
    doc.addPage()
    y = 48
    writeLines('MARKING SCHEME — TEACHER ONLY', { size: 12, bold: true })
    y += 4
    writeLines(`This marking scheme is for teacher use only. Do not distribute to students. Paper: ${header.title} · ${header.subtitle}`, { size: 8, color: 180 })
    y += 8
    for (const section of paper.sections) {
      writeLines(section.label, { size: 10, bold: true })
      for (const q of section.questions) {
        const answer = q.markingGuide || q.correctAnswer || q.answer || '(no answer provided)'
        writeLines(`${q.number}. ${answer}  ${formatMarks(q.marks, template)}`, { size: 9, indent: 10 })
      }
      y += 6
    }
  }

  // Footer — page numbers + org + subtitle
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text(`${ORG_NAME} · ${paper.subtitle}`, margin, pageHeight - 20)
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, pageHeight - 20, { align: 'right' })
    if (template.formatting.footer.showPageNumbers) {
      // already showing
    }
  }
  doc.setTextColor(0)

  const filename = `${safeName(header.schoolName)}_${safeName(paper.title)}_${safeName(paper.subtitle)}.pdf`
  doc.save(filename)
  return filename
}

// Separate answer key PDF — teacher-only output (PRD decision 5)
export async function downloadAnswerKeyPdf(paper, { template: templateOverride } = {}) {
  const template = templateOverride ? (typeof templateOverride === 'string' ? getTemplate(templateOverride) : templateOverride) : (paper.template ? (typeof paper.template === 'string' ? getTemplate(paper.template) : paper.template) : getTemplate('ges_basic_v1'))
  const header = buildHeader(template, paper)

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
  const writeLines = (text, { size = 10, bold = false, indent = 0, gap = 3, color = 0 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    if (color !== 0) doc.setTextColor(color)
    const lines = doc.splitTextToSize(String(text), width - indent)
    for (const line of lines) {
      ensure(size + 4)
      doc.text(line, margin + indent, y)
      y += size + gap
    }
    if (color !== 0) doc.setTextColor(0)
  }

  const logo = template.header.showLogo ? await loadLogoDataUrl() : null
  if (logo) doc.addImage(logo, 'PNG', margin, y - 10, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(header.schoolName || ORG_NAME, pageWidth / 2, y, { align: 'center' })
  y += 16
  doc.setFontSize(12)
  doc.text(`MARKING SCHEME — ${header.title}`, pageWidth / 2, y, { align: 'center' })
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(header.subtitle, pageWidth / 2, y, { align: 'center' })
  y += 13
  doc.setFontSize(9)
  doc.setTextColor(180)
  doc.text('TEACHER ONLY — DO NOT DISTRIBUTE TO STUDENTS', pageWidth / 2, y, { align: 'center' })
  doc.setTextColor(0)
  y += 8
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  for (const section of paper.sections) {
    ensure(30)
    writeLines(section.label, { size: 11, bold: true })
    for (const q of section.questions) {
      ensure(20)
      const answer = q.markingGuide || q.correctAnswer || q.answer || '(no answer provided)'
      const cs = q.contentStandardCode ? ` [${q.contentStandardCode}]` : ''
      writeLines(`${q.number}. ${answer}  ${formatMarks(q.marks, template)}${cs}`, { size: 9, indent: 10 })
      if (q.type === 'essay' && q.markingGuide && q.markingGuide.length > 100) {
        // For long essay, show full guide indented
        writeLines(`Guide: ${q.markingGuide}`, { size: 8, indent: 20, color: 60 })
      }
    }
    y += 8
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text(`${ORG_NAME} · MARKING SCHEME · ${paper.subtitle}`, margin, pageHeight - 20)
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, pageHeight - 20, { align: 'right' })
  }
  doc.setTextColor(0)

  const filename = `${safeName(header.schoolName)}_${safeName(paper.title)}_MARKING_SCHEME.pdf`
  doc.save(filename)
  return filename
}

// ---------------- DOCX — with template support ----------------

export async function downloadPaperDocx(paper, { includeAnswers = false, template: templateOverride } = {}) {
  const template = templateOverride ? (typeof templateOverride === 'string' ? getTemplate(templateOverride) : templateOverride) : (paper.template ? (typeof paper.template === 'string' ? getTemplate(paper.template) : paper.template) : getTemplate('ges_basic_v1'))
  const header = buildHeader(template, paper)

  const logo = await loadLogoBuffer()
  const children = [
    ...docHeader({
      logo,
      title: header.title.toUpperCase(),
      subtitle: header.subtitle,
      extra: [
        header.schoolName,
        header.duration && template.header.showDuration ? `Duration: ${header.duration}` : null,
        template.header.showTotalMarks ? `Total marks: ${header.totalMarks}` : null,
        template.name ? `Template: ${template.name}` : null,
      ].filter(Boolean).join('  ·  '),
    }),
  ]

  if (header.instructions) {
    children.push(...cellParas(header.instructions, { size: 18 }))
    children.push(new Paragraph({ text: '' }))
  }

  for (const section of paper.sections) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.label, bold: true, size: 24 })],
      }),
    )
    const secInstr = section.instructions || buildSectionInstructions(template, section.type || 'mcq')
    if (secInstr) {
      children.push(...cellParas(secInstr, { size: 18 }))
    }
    children.push(new Paragraph({ text: '' }))
    for (const q of section.questions) {
      const marksStr = formatMarks(q.marks, template)
      const csSuffix = q.contentStandardCode ? ` [${q.contentStandardCode}]` : ''
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${q.number}. ${q.text || q.question}   ${marksStr}${csSuffix}`,
              size: 20,
            }),
          ],
        }),
      )
      if (q.type === 'mcq' || q.type === 'objective') {
        ;(q.options || []).forEach((opt, i) => {
          if (opt) {
            children.push(
              new Paragraph({
                indent: { left: 360 },
                children: [new TextRun({ text: `${LETTERS[i]}. ${opt}`, size: 20 })],
              }),
            )
          }
        })
      } else {
        const blanks = q.essayType === 'long' ? 4 : q.essayType === 'structured' ? 3 : q.type === 'essay' ? 3 : 1
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

  // Coverage summary if template says so
  if (template.formatting.footer.showCoverageSummary) {
    children.push(
      new Paragraph({ text: '' }),
      new Paragraph({ children: [new TextRun({ text: 'Coverage Summary (for audit)', bold: true, size: 22 })] }),
    )
    const csMap = {}
    paper.sections.forEach((s) => s.questions.forEach((q) => {
      if (q.contentStandardCode) csMap[q.contentStandardCode] = (csMap[q.contentStandardCode] || 0) + 1
    }))
    const csList = Object.entries(csMap).map(([cs, count]) => `${cs}: ${count} Qs`).join(', ')
    if (csList) children.push(...cellParas(csList, { size: 16 }))
  }

  if (includeAnswers) {
    children.push(
      new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: 'MARKING SCHEME — TEACHER ONLY — DO NOT DISTRIBUTE', bold: true, size: 26, color: 'DC2626' })] }),
      new Paragraph({ text: '' }),
    )
    for (const section of paper.sections) {
      children.push(new Paragraph({ children: [new TextRun({ text: section.label, bold: true, size: 20 })] }))
      for (const q of section.questions) {
        const answer = q.markingGuide || q.correctAnswer || q.answer || '(no answer provided)'
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${q.number}. ${answer}  ${formatMarks(q.marks, template)}${q.contentStandardCode ? ` [${q.contentStandardCode}]` : ''}`, size: 18 })],
          }),
        )
      }
      children.push(new Paragraph({ text: '' }))
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const filename = `${safeName(header.schoolName)}_${safeName(paper.title)}_${safeName(paper.subtitle)}.docx`
  saveBlob(blob, filename)
  return filename
}

export async function downloadAnswerKeyDocx(paper, { template: templateOverride } = {}) {
  const template = templateOverride ? (typeof templateOverride === 'string' ? getTemplate(templateOverride) : templateOverride) : (paper.template ? (typeof paper.template === 'string' ? getTemplate(paper.template) : paper.template) : getTemplate('ges_basic_v1'))
  const header = buildHeader(template, paper)

  const logo = await loadLogoBuffer()
  const children = [
    ...docHeader({
      logo,
      title: `MARKING SCHEME — ${header.title.toUpperCase()}`,
      subtitle: header.subtitle,
      extra: `TEACHER ONLY — DO NOT DISTRIBUTE · ${header.schoolName} · Total marks: ${header.totalMarks}`,
    }),
    new Paragraph({ text: '' }),
    new Paragraph({ children: [new TextRun({ text: 'This marking scheme is for teacher use only.', bold: true, size: 20, color: 'DC2626' })] }),
    new Paragraph({ text: '' }),
  ]

  for (const section of paper.sections) {
    children.push(new Paragraph({ children: [new TextRun({ text: section.label, bold: true, size: 22 })] }))
    for (const q of section.questions) {
      const answer = q.markingGuide || q.correctAnswer || q.answer || '(no answer provided)'
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${q.number}. ${answer}  ${formatMarks(q.marks, template)}${q.contentStandardCode ? ` [${q.contentStandardCode}]` : ''}`, size: 18 })],
        }),
      )
      if (q.markingGuide && q.markingGuide.length > 100) {
        children.push(...cellParas(`Guide: ${q.markingGuide}`, { size: 16 }))
      }
    }
    children.push(new Paragraph({ text: '' }))
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const filename = `${safeName(header.schoolName)}_${safeName(paper.title)}_MARKING_SCHEME.docx`
  saveBlob(blob, filename)
  return filename
}
