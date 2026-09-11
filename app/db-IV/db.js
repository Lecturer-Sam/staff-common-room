import Dexie from 'dexie'

/**
 * NACCA QuizBank — IndexedDB schema
 *
 * Table index notation:
 *   &id        primary key (auto-indexed, unique)
 *   field      regular index (non-unique)
 *   [a+b]      compound index
 *   *tags      multi-entry index (array field — lets you query by individual tag)
 *
 * Version history:
 *   v1 — initial schema (all 7 tables)
 */
const db = new Dexie('NaccaQuizBank')

db.version(1).stores({
  // ── Curriculum hierarchy ─────────────────────────────────────────────────

  /**
   * classes
   * { id, code, name, label, order }
   * e.g. { id:'jhs1', code:'B7', name:'JHS 1', label:'Basic 7', order:1 }
   */
  classes: '&id, code, order',

  /**
   * subjects
   * { id, code, name, icon, colour, blurb }
   * e.g. { id:'mathematics', code:'MA', name:'Mathematics', icon:'sigma', ... }
   */
  subjects: '&id, code',

  /**
   * strands
   * { id, classId, subjectId, num, name, code }
   * e.g. { id:'jhs1-mathematics-s1', classId:'jhs1', subjectId:'mathematics', num:1,
   *         name:'Number', code:'B7.1' }
   */
  strands: '&id, classId, subjectId, [classId+subjectId]',

  /**
   * subStrands
   * { id, strandId, classId, subjectId, num, name, code }
   * e.g. { id:'jhs1-mathematics-s1-ss1', strandId:'jhs1-mathematics-s1',
   *         classId:'jhs1', subjectId:'mathematics', num:1,
   *         name:'Number and Number Systems', code:'B7.1.1' }
   */
  subStrands: '&id, strandId, classId, subjectId, [classId+subjectId]',

  /**
   * contentStandards
   * { id, subStrandId, strandId, classId, subjectId, code, title,
   *   indicators, coreCompetencies }
   * e.g. { id:'jhs1-mathematics-b7-1-1-1', code:'B7.1.1.1',
   *         title:'Demonstrate an understanding of integers...', ... }
   */
  contentStandards:
    '&id, subStrandId, strandId, classId, subjectId, code, [classId+subjectId]',

  // ── Questions ────────────────────────────────────────────────────────────

  /**
   * questions
   * { id, csId, classId, subjectId, type, difficulty, stem,
   *   options, answer, explanation, tags }
   *
   * type     : 'mcq' | 'multi' | 'tf' | 'num' | 'short'
   * difficulty: 'easy' | 'medium' | 'hard'
   * answer   : number (mcq/tf index) | number[] (multi) | number (num) | string[] (short)
   * options  : string[]  (empty [] for num/short)
   * *tags    : multi-entry index — query individual tags
   */
  questions:
    '&id, csId, classId, subjectId, type, difficulty, [classId+subjectId], [csId+difficulty], *tags',

  // ── User data ────────────────────────────────────────────────────────────

  /**
   * attempts
   * { id, csId, classId, subjectId, score, total, timeSeconds,
   *   answers, date, synced }
   *
   * id        : auto-incremented primary key  (++ prefix)
   * csId      : content standard attempted
   * score     : number of correct answers
   * total     : total questions in the attempt
   * timeSeconds: elapsed time
   * answers   : array of { questionId, given, correct } for review
   * date      : ISO date string  e.g. '2026-09-06'
   * synced    : boolean — false until flushed to a backend / exported
   */
  attempts: '++id, csId, classId, subjectId, date, synced',
})

export default db
