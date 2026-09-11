import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Scoped question-bank fetches for the generators (QuestionGenerator,
 * QuizMaker). Historically both pages pulled up to 1,000 questions on mount
 * and filtered client-side — that burns Firestore reads and silently
 * truncates once the bank passes 1,000.
 *
 * These helpers push the `grade` + `subjectId` filters into the query so we
 * only read the slice a teacher is actually working with. Equality-only
 * queries need no composite index in Firestore (single-field indexes merge
 * automatically), so this works without any index changes.
 *
 * Every helper returns `{ items, truncated }`: Firestore reports no total
 * count, so a full page means "there may be more" and callers surface that
 * honestly instead of pretending the bank is complete.
 */

/** Hard ceiling for a single scoped fetch (well above any real class bank). */
export const SCOPE_LIMIT = 500

function toList(snap) {
  const items = []
  snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
  return items
}

/**
 * Questions for one subject (across classes). This is the workhorse for the
 * generators' strand/sub-strand pickers and the assembled paper/quiz pool.
 *
 * Only `subjectId` is filtered server-side on purpose: legacy questions may
 * omit `grade` and the UI treats those as B1 (`q.grade ?? 'B1'`), so a
 * server-side `where('grade', ==)` would silently drop them. Grade filtering
 * therefore stays client-side in the callers' memos, preserving behaviour.
 * Single-field equality needs no composite index.
 */
export async function fetchQuestionsByScope({ subjectId }) {
  const snap = await getDocs(
    query(
      collection(db, 'questions'),
      where('subjectId', '==', subjectId),
      limit(SCOPE_LIMIT),
    ),
  )
  const items = toList(snap)
  return { items, truncated: snap.size >= SCOPE_LIMIT }
}

/**
 * Fallback used when a scope hasn't been chosen yet (e.g. the Quiz Maker's
 * initial state before a subject is picked) or when a scoped index is
 * unavailable. Still bounded — never unbounded.
 */
export async function fetchRecentQuestions(max = SCOPE_LIMIT) {
  const snap = await getDocs(query(collection(db, 'questions'), limit(max)))
  const items = toList(snap)
  return { items, truncated: snap.size >= max }
}
