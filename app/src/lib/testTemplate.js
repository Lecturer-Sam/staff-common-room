/**
 * Test Template Engine — PRD §7
 * Configurable formatting so exam style can change without code rewrites.
 * Templates live in Firestore `test_templates/{id}` but we ship a default
 * fallback for offline / first-run.
 */

export const DEFAULT_TEMPLATE = {
  id: 'ges_basic_v1',
  name: 'GES Basic - Standard',
  version: 1,
  header: {
    showLogo: true,
    logoPath: '/beaconlogo.png',
    schoolNameField: 'schoolName', // dynamic
    titleField: 'title',
    subtitleFields: ['subjectName', 'gradeLabel'], // joined with ·
    showDuration: true,
    showTotalMarks: true,
    showDate: false,
  },
  instructions: {
    general: 'Answer all questions. Write your name and index number on the answer sheet.',
    objective: 'Choose the correct answer from the options A to D.',
    short: 'Answer the following questions briefly in the space provided.',
    essay: 'Answer the following questions in detail.',
    structured: 'Answer all questions in this section.',
  },
  formatting: {
    numbering: '1,2,3 continuous across sections', // or per-section
    sections: {
      labelStyle: 'SECTION A — OBJECTIVE',
      instructionsItalic: true,
    },
    question: {
      marksInBrackets: true, // [2 marks]
      optionsLayout: 'vertical', // vertical list A-D
      showAnswerKey: false, // default no
    },
    footer: {
      showCoverageSummary: false,
      showPageNumbers: true,
    },
    fonts: {
      header: 'bold',
      body: 'normal',
    },
  },
  isDefault: true,
}

export const TEMPLATES = {
  ges_basic_v1: DEFAULT_TEMPLATE,
  bece_mock_v1: {
    ...DEFAULT_TEMPLATE,
    id: 'bece_mock_v1',
    name: 'BECE Mock - WAEC Style',
    instructions: {
      general: 'Answer all questions. Time allowed: as indicated. This paper follows the BECE format.',
      objective: 'Each question is followed by four options lettered A to D. Find the correct option for each question and shade in pencil on your answer sheet the answer space which bears the same letter as the option you have chosen.',
      short: 'Answer all questions in this section.',
      essay: 'Answer three questions only in this section.',
      structured: 'Answer all questions.',
    },
    formatting: {
      ...DEFAULT_TEMPLATE.formatting,
      footer: { showCoverageSummary: true, showPageNumbers: true },
    },
  },
}

/**
 * Resolve a template by id, falling back to default.
 */
export function getTemplate(id = 'ges_basic_v1') {
  return TEMPLATES[id] || DEFAULT_TEMPLATE
}

/**
 * Build header data for a paper using template + runtime data.
 */
export function buildHeader(template, paperData) {
  const t = typeof template === 'string' ? getTemplate(template) : template
  return {
    schoolName: paperData.schoolName || 'Beacon Educational Consult',
    title: paperData.title || 'End of Term Assessment',
    subtitle: paperData.subtitle || `${paperData.subjectName || ''} · ${paperData.gradeLabel || paperData.grade || ''}`.trim(),
    duration: paperData.duration || '',
    totalMarks: paperData.totalMarks || 0,
    date: paperData.date || new Date().toLocaleDateString(),
    instructions: paperData.instructions || t.instructions.general,
    showLogo: t.header.showLogo,
    logoPath: t.header.logoPath,
  }
}

/**
 * Build section instructions using template.
 */
export function buildSectionInstructions(template, sectionType) {
  const t = typeof template === 'string' ? getTemplate(template) : template
  const map = {
    mcq: t.instructions.objective,
    objective: t.instructions.objective,
    true_false: t.instructions.objective,
    fill_blank: t.instructions.short,
    short: t.instructions.short,
    essay: t.instructions.essay,
    structured: t.instructions.structured,
    long: t.instructions.essay,
  }
  return map[sectionType] || t.instructions.general
}

/**
 * Format marks display.
 */
export function formatMarks(marks, template = DEFAULT_TEMPLATE) {
  const t = typeof template === 'string' ? getTemplate(template) : template
  if (t.formatting.question.marksInBrackets) {
    return `[${marks} ${marks === 1 ? 'mark' : 'marks'}]`
  }
  return `${marks} ${marks === 1 ? 'mark' : 'marks'}`
}
