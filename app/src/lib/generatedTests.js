import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Save a generated test snapshot — PRD §7
 * Snapshot ensures edited questions don't silently alter old papers.
 */

export async function saveGeneratedTest({ user, profile, filters, sections, allSelected, totalMarks, title, includeAnswerKey, templateId = 'ges_basic_v1', genTimeMs = null }) {
  if (!user) throw new Error('Not signed in')

  const payload = {
    authorId: user.uid,
    authorName: profile?.name || user.displayName || 'Teacher',
    schoolId: profile?.schoolId || null,
    title: title || `${filters?.grade || ''} ${filters?.subjectId || ''} Test`.trim(),
    filters: {
      grade: filters?.grade || null,
      subjectId: filters?.subjectId || null,
      strandName: filters?.strandName || null,
      subStrandName: filters?.subStrandName || null,
      contentStandardCode: filters?.contentStandardCode || null,
      indicatorCode: filters?.indicatorCode || null,
      type: filters?.type || null,
      difficulty: filters?.difficulty || null,
      count: filters?.count || allSelected?.length || 0,
      requestedCount: filters?.requestedCount || filters?.count || allSelected?.length || 0,
    },
    sections: sections.map((s) => ({
      type: s.type,
      label: s.label,
      instructions: s.instructions,
      questionIds: s.questions.map((q) => q.id),
    })),
    questions: (allSelected || []).map((q) => ({
      questionId: q.id,
      text: q.text || q.question,
      type: q.type,
      objectiveType: q.objectiveType || null,
      essayType: q.essayType || null,
      options: q.options || [],
      correctAnswer: q.correctAnswer || q.answer || '',
      markingGuide: q.markingGuide || '',
      marks: q.marks || 1,
      contentStandardCode: q.contentStandardCode || null,
      indicatorCode: q.indicatorCode || null,
      difficulty: q.difficulty || null,
      bloomLevel: q.bloomLevel || null,
    })),
    totalMarks,
    includeAnswerKey: !!includeAnswerKey,
    templateId,
    genTimeMs,
    createdAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, 'generated_tests'), payload)
  return ref.id
}
