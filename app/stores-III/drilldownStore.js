import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useDrilldownStore = create(
  persist(
    (set) => ({
      lastStandard: null, // { standardId, to, visitedAt }
      visitStandard: (standardId, to) =>
        set({ lastStandard: { standardId, to, visitedAt: new Date().toISOString() } }),
      clear: () => set({ lastStandard: null }),
    }),
    { name: 'nacca-drilldown' },
  ),
)