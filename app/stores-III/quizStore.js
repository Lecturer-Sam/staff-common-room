import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useQuizStore = create(
  persist(
    (set) => ({
      phase: 'idle', // 'idle' | 'active'
      standard: null, // { id, code, title, subjectId, classId, subjectName, subjectColour }
      questions: [],
      current: 0,
      answers: {}, // { questionId: number | number[] | string }
      flags: [],
      elapsed: 0, // seconds

      start: (standard, questions) =>
        set({ phase: 'active', standard, questions, current: 0, answers: {}, flags: [], elapsed: 0 }),

      answer: (questionId, given) =>
        set((s) => ({ answers: { ...s.answers, [questionId]: given } })),

      toggleFlag: (questionId) =>
        set((s) => ({
          flags: s.flags.includes(questionId)
            ? s.flags.filter((f) => f !== questionId)
            : [...s.flags, questionId],
        })),

      next: () => set((s) => ({ current: Math.min(s.current + 1, s.questions.length - 1) })),
      prev: () => set((s) => ({ current: Math.max(s.current - 1, 0) })),
      goto: (i) => set({ current: i }),
      tick: () => set((s) => (s.phase === 'active' ? { elapsed: s.elapsed + 1 } : {})),

      clearSession: () =>
        set({ phase: 'idle', standard: null, questions: [], current: 0, answers: {}, flags: [], elapsed: 0 }),
    }),
    { name: 'nacca-quiz' },
  ),
)