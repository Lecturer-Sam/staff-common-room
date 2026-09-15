import { create } from 'zustand'

/**
 * Quiz session store.
 *
 * Holds the state for a single active quiz attempt.
 * NOT persisted — if the user closes the app mid-quiz the session resets,
 * which is intentional (completed attempts are saved to Dexie separately).
 *
 * Lifecycle:
 *   startQuiz(questions, standardId, classId, subjectId)
 *   → answer(questionId, given)   (call for each answered question)
 *   → toggleFlag(questionId)      (optional)
 *   → goTo(index) / next() / prev()
 *   → finishQuiz()                (returns the attempt summary object)
 *   → resetQuiz()                 (clears state ready for next session)
 *
 * Usage:
 *   const { current, questions, answers } = useQuizStore()
 *   const answer = useQuizStore(s => s.answer)
 */
const useQuizStore = create((set, get) => ({
  // ── Session metadata ────────────────────────────────────────────────────
  standardId:  null,
  classId:     null,
  subjectId:   null,
  startTime:   null,   // Date.now() snapshot when quiz starts

  // ── Questions ───────────────────────────────────────────────────────────
  questions:   [],     // full question objects from Dexie
  current:     0,      // index of the displayed question

  // ── User responses ───────────────────────────────────────────────────────
  /** Map of questionId → given answer (same type as question.answer) */
  answers:     {},

  /** Set of flagged questionIds */
  flagged:     new Set(),

  // ── Status ───────────────────────────────────────────────────────────────
  /** 'idle' | 'active' | 'finished' */
  status:      'idle',

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Initialise a new quiz session. */
  startQuiz: (questions, standardId, classId, subjectId) =>
    set({
      questions,
      standardId,
      classId,
      subjectId,
      current:   0,
      answers:   {},
      flagged:   new Set(),
      startTime: Date.now(),
      status:    'active',
    }),

  /** Record the user's answer for a question. */
  answer: (questionId, given) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: given } })),

  /** Toggle the flagged state of a question. */
  toggleFlag: (questionId) =>
    set((s) => {
      const next = new Set(s.flagged)
      next.has(questionId) ? next.delete(questionId) : next.add(questionId)
      return { flagged: next }
    }),

  /** Jump to a specific question index. */
  goTo: (index) =>
    set((s) => ({
      current: Math.max(0, Math.min(index, s.questions.length - 1)),
    })),

  next: () =>
    set((s) => ({
      current: Math.min(s.current + 1, s.questions.length - 1),
    })),

  prev: () =>
    set((s) => ({ current: Math.max(s.current - 1, 0) })),

  /**
   * Mark the session as finished and return a summary object
   * ready to be saved as a Dexie `attempts` record.
   */
  finishQuiz: () => {
    const { questions, answers, startTime, standardId, classId, subjectId } = get()

    const timeSeconds = Math.round((Date.now() - startTime) / 1000)
    let score = 0

    const answerLog = questions.map((q) => {
      const given = answers[q.id] ?? null
      // Multi-select: compare sorted arrays; everything else: strict equality
      const correct =
        Array.isArray(q.answer) && Array.isArray(given)
          ? [...q.answer].sort().join() === [...given].sort().join()
          : given === q.answer
      if (correct) score++
      return { questionId: q.id, given, correct }
    })

    const attempt = {
      csId:        standardId,
      classId,
      subjectId,
      score,
      total:       questions.length,
      timeSeconds,
      answers:     answerLog,
      date:        new Date().toISOString().slice(0, 10), // 'YYYY-MM-DD'
      synced:      false,
    }

    set({ status: 'finished' })
    return attempt
  },

  /** Clear all session state. */
  resetQuiz: () =>
    set({
      standardId:  null,
      classId:     null,
      subjectId:   null,
      startTime:   null,
      questions:   [],
      current:     0,
      answers:     {},
      flagged:     new Set(),
      status:      'idle',
    }),
}))

export default useQuizStore
