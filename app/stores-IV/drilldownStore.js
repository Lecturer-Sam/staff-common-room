import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Drill-down navigation store.
 *
 * Tracks the user's position in the 5-level curriculum hierarchy:
 *   classId → subjectId → strandId → subStrandId → standardId
 *
 * Persisted to localStorage so a page refresh returns the user to
 * exactly where they left off.
 *
 * Usage:
 *   const classId    = useDrilldownStore(s => s.classId)
 *   const setClass   = useDrilldownStore(s => s.setClass)
 *   const resetBelow = useDrilldownStore(s => s.resetBelow)
 */
const useDrilldownStore = create(
  persist(
    (set) => ({
      // ── Current path ────────────────────────────────────────────────────
      classId:    null,   // e.g. 'jhs1'
      subjectId:  null,   // e.g. 'mathematics'
      strandId:   null,   // e.g. 'jhs1-mathematics-s1'
      subStrandId: null,  // e.g. 'jhs1-mathematics-s1-ss1'
      standardId: null,   // e.g. 'jhs1-mathematics-b7-1-1-1'

      // ── Setters (each clears everything below it) ────────────────────────
      setClass: (classId) =>
        set({ classId, subjectId: null, strandId: null, subStrandId: null, standardId: null }),

      setSubject: (subjectId) =>
        set({ subjectId, strandId: null, subStrandId: null, standardId: null }),

      setStrand: (strandId) =>
        set({ strandId, subStrandId: null, standardId: null }),

      setSubStrand: (subStrandId) =>
        set({ subStrandId, standardId: null }),

      setStandard: (standardId) =>
        set({ standardId }),

      /**
       * Reset from a given level downward.
       * level: 'class' | 'subject' | 'strand' | 'subStrand' | 'standard'
       */
      resetBelow: (level) => {
        const resets = {
          class:     { classId: null, subjectId: null, strandId: null, subStrandId: null, standardId: null },
          subject:   { subjectId: null, strandId: null, subStrandId: null, standardId: null },
          strand:    { strandId: null, subStrandId: null, standardId: null },
          subStrand: { subStrandId: null, standardId: null },
          standard:  { standardId: null },
        }
        set(resets[level] ?? {})
      },

      /** Wipe the entire path back to the top. */
      resetAll: () =>
        set({ classId: null, subjectId: null, strandId: null, subStrandId: null, standardId: null }),
    }),
    {
      name: 'nacca-drilldown',  // localStorage key
    },
  ),
)

export default useDrilldownStore
