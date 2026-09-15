// Index discipline: only indexes the query paths below actually use. 
// Difficulty filtering happens in memory (409 rows total — indexing it is pure write-cost).

import Dexie from 'dexie'

export const db = new Dexie('extraClassesGH')

db.version(1).stores({
  classes: 'id, code, order',
  subjects: 'id, code',
  strands: 'id, [classId+subjectId], num',
  subStrands: 'id, strandId, num',
  contentStandards: 'id, subStrandId, strandId',
  questions: 'id, csId, [classId+subjectId]',
  meta: 'key',
})

db.version(2).stores({
  attempts: 'id, standardId, subjectId, classId, date',
})

// v3 — Stage 4: attempts moved to Firestore (users/{uid}/attempts).
// `null` = drop the table. No upgrader needed: local attempts were anonymous
// test data with no uid to attribute them to — deliberately discarded.
db.version(3).stores({
  attempts: null,
})