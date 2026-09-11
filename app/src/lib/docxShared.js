import { ImageRun, Paragraph, TextRun } from 'docx'

export const ORG_NAME = 'BEACON EDUCATIONAL CONSULT'
export const ORG_TAGLINE =
  'Teacher Network · Curriculum-aligned schemes & lesson plans'

/** Fetch the consortium logo as an ArrayBuffer (null on failure). */
export async function loadLogoBuffer() {
  try {
    const res = await fetch('/beaconlogo.png')
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

/** Split multi-line text into an array of Paragraphs for a table cell. */
export function cellParas(text, { bold = false, size = 16, align } = {}) {
  const lines = String(text ?? '').split('\n')
  return lines.map(
    (line) =>
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: line, bold, size })],
      }),
  )
}

/** Branded document header paragraphs (logo, org name, doc title, subtitle). */
export function docHeader({ logo, title, subtitle, extra }) {
  const out = []
  if (logo) {
    out.push(
      new Paragraph({
        alignment: 'center',
        children: [
          new ImageRun({
            data: logo,
            type: 'png',
            transformation: { width: 56, height: 56 },
          }),
        ],
      }),
    )
  }
  out.push(
    new Paragraph({
      alignment: 'center',
      children: [new TextRun({ text: ORG_NAME, bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: 'center',
      children: [new TextRun({ text: ORG_TAGLINE, size: 16, color: '64748B' })],
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      alignment: 'center',
      children: [new TextRun({ text: title, bold: true, size: 26 })],
    }),
    new Paragraph({
      alignment: 'center',
      children: [new TextRun({ text: subtitle, size: 20 })],
    }),
  )
  if (extra) {
    out.push(
      new Paragraph({
        alignment: 'center',
        children: [new TextRun({ text: extra, size: 16, color: '64748B' })],
      }),
    )
  }
  out.push(new Paragraph({ text: '' }))
  return out
}

/**
 * A prominent red banner marking a document as an unapproved sample. Prepended
 * to agent previews so a copy shown to a school cannot pass as the final,
 * paid-for delivery.
 */
export function sampleBanner() {
  return new Paragraph({
    alignment: 'center',
    children: [
      new TextRun({
        text: 'SAMPLE COPY — PENDING APPROVAL — NOT FOR DISTRIBUTION',
        bold: true,
        size: 22,
        color: 'DC2626',
      }),
    ],
  })
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const safeName = (s) => String(s).replace(/[^a-z0-9]+/gi, '-')
