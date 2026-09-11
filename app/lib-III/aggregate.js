import { db } from '../db/dexie'

// Class / subject level
export const getClasses = () => db.classes.orderBy('order').toArray()
export const getSubjects = () => db.subjects.orderBy('code').toArray()

// Drill-down levels (matches the index list in dexie.js)
export const getStrands = (classId, subjectId) =>
  db.strands.where('[classId+subjectId]').equals([classId, subjectId]).sortBy('num')

export const getSubStrands = (strandId) =>
  db.subStrands.where('strandId').equals(strandId).sortBy('num')

export const getStandards = (subStrandId) =>
  db.contentStandards.where('subStrandId').equals(subStrandId).toArray()

export const getStandardsForStrand = (strandId) =>
  db.contentStandards.where('strandId').equals(strandId).toArray()

// Question level
export const getQuestionsForStandard = (csId) =>
  db.questions.where('csId').equals(csId).toArray()

export const getQuestionsForStrand = async (strandId) => {
  const standards = await getStandardsForStrand(strandId)
  return db.questions.where('csId').anyOf(standards.map((s) => s.id)).toArray()
}

export const getQuestionCount = (csId) =>
  db.questions.where('csId').equals(csId).count()

export const getSeedMeta = () => db.meta.get('seedVersion')