import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Scoped question-bank fetches for the generators (QuestionGenerator,
 * QuizMaker) — PRD v1 extended with contentStandardCode, type, difficulty.
 *
 * Historically both pages pulled up to 1,000 questions on mount
 * and filtered client-side — that burns Firestore reads and silently
 * truncates once the bank passes 1,000.
 *
 * These helpers push filters into the query so we only read the slice
 * a teacher is actually working with. Equality-only queries need no
 * composite index; multi-field equality needs composites defined in
 * firestore.indexes.json (see docs/QUESTION_BANK_PRD.md §6).
 *
 * Every helper returns { items, truncated }.
 */

export const SCOPE_LIMIT = 500
export const BANK_LIMIT = 1000

function toList(snap) {
  const items = []
  snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
  return items
}

/**
 * Questions for one subject (across classes). Workhorse for generators.
 * Only subjectId filtered server-side originally to preserve legacy docs
 * that omit grade. Now we also support contentStandardCode filtering
 * when available (new PRD critical rule).
 */
export async function fetchQuestionsByScope({ subjectId }) {
  const snap = await getDocs(
    query(
      collection(db, 'questions'),
      where('subjectId', '==', subjectId),
      where('status', '==', 'published'),
      limit(SCOPE_LIMIT),
    ),
  )
  const items = toList(snap)
  return { items, truncated: snap.size >= SCOPE_LIMIT }
}

/**
 * PRD v1: filter by grade + subject + contentStandard + type + difficulty + status.
 * Used by new QuestionGenerator that resolves curriculum selection path.
 * All filters are equality — composites required (see firestore.indexes.json).
 */
export async function fetchQuestionsByFilters({
  grade,
  subjectId,
  contentStandardCode,
  indicatorCode,
  type, // objective | essay | mcq | short | essay (legacy compat handled client-side)
  difficulty,
  status = 'published',
  max = SCOPE_LIMIT,
} = {}) {
  const clauses = []
  if (grade) clauses.push(where('grade', '==', grade))
  if (subjectId) clauses.push(where('subjectId', '==', subjectId))
  if (contentStandardCode) clauses.push(where('contentStandardCode', '==', contentStandardCode))
  if (indicatorCode) clauses.push(where('indicatorCode', '==', indicatorCode))
  if (type) {
    // new schema: objective/essay, but also legacy mcq/short/essay — handle both
    // If type is objective, we need to fetch mcq + true_false + fill_blank + objective
    // For simplicity, server filters exact type, client merges.
    // Here we filter if caller passes exact legacy type; for 'objective' we skip server filter and filter client-side.
    if (['mcq', 'short', 'essay', 'true_false', 'fill_blank'].includes(type)) {
      clauses.push(where('type', '==', type))
    } else if (type === 'essay') {
      // new essay includes short/structured/long — skip server filter, client handles
    } else if (type === 'objective') {
      // skip, client handles
    } else {
      clauses.push(where('type', '==', type))
    }
  }
  if (difficulty) clauses.push(where('difficulty', '==', difficulty))
  if (status) clauses.push(where('status', '==', status))

  // Firestore requires at least one where; if none, fallback to recent
  if (clauses.length === 0) {
    return fetchRecentQuestions(max)
  }

  try {
    const snap = await getDocs(query(collection(db, 'questions'), ...clauses, limit(max)))
    let items = toList(snap)
    // Client-side refinement for objective/essay umbrella types
    if (type === 'objective') {
      items = items.filter((q) => ['objective', 'mcq', 'true_false', 'fill_blank'].includes(q.type))
    } else if (type === 'essay') {
      items = items.filter((q) => ['essay', 'short', 'essay_legacy'].includes(q.type) || q.essayType)
    }
    return { items, truncated: snap.size >= max }
  } catch (err) {
    console.warn('fetchQuestionsByFilters composite may be missing, falling back to subject-only:', err.message)
    // Fallback: try subject only if available
    if (subjectId) return fetchQuestionsByScope({ subjectId })
    return fetchRecentQuestions(max)
  }
}

/**
 * Content-standard precise fetch — the PRD critical path.
 * grade + subjectId + contentStandardCode + status = most selective.
 */
export async function fetchQuestionsByContentStandard({ grade, subjectId, contentStandardCode, type, max = SCOPE_LIMIT }) {
  return fetchQuestionsByFilters({ grade, subjectId, contentStandardCode, type, max })
}

/**
 * Fallback bounded fetch.
 */
export async function fetchRecentQuestions(max = SCOPE_LIMIT) {
  const snap = await getDocs(query(collection(db, 'questions'), where('status', '==', 'published'), limit(max)))
  const items = toList(snap)
  return { items, truncated: snap.size >= max }
}

/**
 * Admin: fetch all including draft/pending for review queue.
 */
export async function fetchQuestionsForReview({ status = 'pending', max = 200 } = {}) {
  const snap = await getDocs(query(collection(db, 'questions'), where('status', '==', status), limit(max)))
  return { items: toList(snap), truncated: snap.size >= max }
}

/**
 * Coverage audit: count per content standard.
 */
export async function fetchQuestionCoverage({ grade, subjectId }) {
  const { items } = await fetchQuestionsByFilters({ grade, subjectId, status: 'published', max: BANK_LIMIT })
  const coverage = {}
  items.forEach((q) => {
    const cs = q.contentStandardCode || 'unknown'
    coverage[cs] = (coverage[cs] || 0) + 1
  })
  return { total: items.length, coverage, items }
}
