import PptxGenJS from 'pptxgenjs'
import { safeName } from './docxShared'

const ORG = 'BEACON EDUCATIONAL CONSULT'
const INDIGO = '4338CA'
const DARK = '1E1B4B'
const AMBER = 'F59E0B'
const SLATE = '475569'
const GREEN = '059669'
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
 * quiz = { schoolName, title, subtitle, questions: [{ number, question, type,
 *          options, answer, marks }] }
 * revealAnswers: 'after-each' | 'end' | 'none'
 */
export async function downloadQuizPptx(quiz, { revealAnswers = 'after-each' } = {}) {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  const logo = await loadLogoDataUrl()

  // ---- Title slide ----
  const title = pptx.addSlide()
  title.background = { color: DARK }
  if (logo) {
    title.addImage({ data: logo, x: 4.35, y: 0.55, w: 1.3, h: 1.3 })
  }
  title.addText(ORG, {
    x: 0.5, y: 2.0, w: 9, h: 0.5,
    align: 'center', color: 'FFFFFF', fontSize: 20, bold: true,
  })
  title.addText(quiz.title, {
    x: 0.5, y: 2.6, w: 9, h: 0.9,
    align: 'center', color: AMBER, fontSize: 36, bold: true,
  })
  title.addText(
    [quiz.subtitle, quiz.schoolName].filter(Boolean).join('  ·  '),
    { x: 0.5, y: 3.6, w: 9, h: 0.5, align: 'center', color: 'CBD5E1', fontSize: 16 },
  )

  // ---- Question slides ----
  for (const q of quiz.questions) {
    const s = pptx.addSlide()
    s.background = { color: 'FFFFFF' }
    // top bar
    s.addShape('rect', { x: 0, y: 0, w: 10, h: 0.55, fill: { color: INDIGO } })
    s.addText(`Question ${q.number}`, {
      x: 0.3, y: 0.02, w: 4, h: 0.5, color: 'FFFFFF', fontSize: 16, bold: true,
    })
    s.addText(`${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}`, {
      x: 7.6, y: 0.02, w: 2.1, h: 0.5, align: 'right', color: 'FFFFFF', fontSize: 13,
    })
    s.addText(q.question, {
      x: 0.6, y: 0.9, w: 8.8, h: q.type === 'mcq' ? 1.7 : 2.4,
      color: '0F172A', fontSize: q.question.length > 160 ? 18 : 22, bold: true,
      valign: 'top',
    })
    if (q.type === 'mcq') {
      const opts = q.options
        .map((o, i) => ({ letter: LETTERS[i], text: o }))
        .filter((o) => o.text)
      opts.forEach((o, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        s.addText(`${o.letter}.  ${o.text}`, {
          x: 0.6 + col * 4.5, y: 2.8 + row * 1.0, w: 4.3, h: 0.85,
          fontSize: 16, color: SLATE, valign: 'middle',
          fill: { color: 'F1F5F9' }, line: { color: 'CBD5E1', width: 0.75 },
        })
      })
    } else {
      s.addText(
        q.type === 'essay' ? 'Discuss / write your answer…' : 'Write your answer…',
        { x: 0.6, y: 3.4, w: 8.8, h: 0.5, fontSize: 14, italic: true, color: '94A3B8' },
      )
    }
    s.addText(ORG, {
      x: 0.3, y: 5.25, w: 9.4, h: 0.3, align: 'center', fontSize: 9, color: '94A3B8',
    })

    // ---- Answer slide after each question ----
    if (revealAnswers === 'after-each') {
      const a = pptx.addSlide()
      a.background = { color: 'F0FDF4' }
      a.addShape('rect', { x: 0, y: 0, w: 10, h: 0.55, fill: { color: GREEN } })
      a.addText(`Answer — Question ${q.number}`, {
        x: 0.3, y: 0.02, w: 6, h: 0.5, color: 'FFFFFF', fontSize: 16, bold: true,
      })
      const answerText =
        q.type === 'mcq'
          ? `${q.answer}.  ${q.options[LETTERS.indexOf(q.answer)] ?? ''}`
          : q.answer || '(model answer not provided)'
      a.addText(answerText, {
        x: 0.6, y: 1.6, w: 8.8, h: 2.4,
        align: 'center', valign: 'middle',
        color: GREEN, fontSize: 28, bold: true,
      })
    }
  }

  // ---- Answer key at the end ----
  if (revealAnswers === 'end') {
    const a = pptx.addSlide()
    a.background = { color: DARK }
    a.addText('ANSWER KEY', {
      x: 0.5, y: 0.4, w: 9, h: 0.6, align: 'center', color: AMBER, fontSize: 28, bold: true,
    })
    const lines = quiz.questions.map((q) => {
      const ans =
        q.type === 'mcq'
          ? `${q.answer}. ${q.options[LETTERS.indexOf(q.answer)] ?? ''}`
          : q.answer || '—'
      return `${q.number}. ${ans}`
    })
    const half = Math.ceil(lines.length / 2)
    a.addText(lines.slice(0, half).join('\n'), {
      x: 0.7, y: 1.3, w: 4.3, h: 3.8, color: 'FFFFFF', fontSize: 14, valign: 'top',
    })
    if (lines.length > half) {
      a.addText(lines.slice(half).join('\n'), {
        x: 5.2, y: 1.3, w: 4.3, h: 3.8, color: 'FFFFFF', fontSize: 14, valign: 'top',
      })
    }
  }

  // ---- Closing slide ----
  const end = pptx.addSlide()
  end.background = { color: DARK }
  end.addText('Well done!', {
    x: 0.5, y: 2.2, w: 9, h: 0.8, align: 'center', color: AMBER, fontSize: 40, bold: true,
  })
  end.addText(ORG, {
    x: 0.5, y: 3.2, w: 9, h: 0.5, align: 'center', color: 'CBD5E1', fontSize: 14,
  })

  await pptx.writeFile({
    fileName: `Quiz_${safeName(quiz.title)}_${safeName(quiz.subtitle)}.pptx`,
  })
}
