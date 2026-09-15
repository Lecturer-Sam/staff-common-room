

## NACCA QuizBank — Build Roadmap
---

### Phase 1 — Foundation & Data Layer (Week 1)
The hardest invisible work. Get data flowing before touching UI.

1. **Install missing packages** — `react-router-dom`, `zustand`, `dexie`, `fuse.js`, `papaparse`, `lucide-react`, `vite-plugin-pwa`
2. **Copy data files** — move `update/data/*.json` → `public/data/` so Vite serves them statically
3. **Dexie schema** — 7 tables: `classes`, `subjects`, `strands`, `subStrands`, `contentStandards`, `questions`, `attempts`
4. **Seed script** — first-boot fetch + `bulkPut` into Dexie, version-gated so it only runs once
5. **3 Zustand stores** — `drilldownStore` (path state), `quizStore` (session state), `offlineStore` (sync queue)
6. **AppShell + BottomNav + OfflineIndicator** — the outer shell
7. **5 drill-down routes** — `ClassGrid → SubjectGrid → StrandList → SubStrandList → ContentStandardList`, each reading live from Dexie

**Exit:** Click from B7 all the way to a Content Standard and see real questions loaded.

---

### Phase 2 — Quiz Engine & Results (Week 2)
The feature users actually touch.

- `QuizPlayer` with `QuestionCard`, `OptionButton` (4 states), `Timer`, `FlagButton`, `QuestionMap`
- Support all 4 question types from your data: `mcq`, `num`, `tf`, `multi`
- Results screen: `ScoreRing` SVG animation, strand breakdown bars, weak-area list
- Save each attempt to Dexie `attempts` table
- Framer Motion page transitions + option tap feedback

**Exit:** Full quiz from start to results. Attempt persisted in IndexedDB.

---

### Phase 3 — Offline-First PWA & Data Manager (Week 3)
Makes it a real installable classroom tool.

- `vite-plugin-pwa` + Workbox config + `manifest.webmanifest`
- `InstallPrompt` component (captures `beforeinstallprompt`)
- Background sync queue — attempts save offline, flush on reconnect
- **Data Manager screen** — drag-drop `.json`/`.csv`/`.md`, Zod validation, PapaParse for CSV, preview table, import → Dexie, export button
- Fuse.js global search across content standards and strands

**Exit:** Installs on Android Chrome, works in airplane mode, can import a new data pack.

---

### Phase 4 — Progress & Analytics (Week 4)
Turns it from a quiz tool into a learning tracker.

- Home screen with "Continue Learning" cards and streak counter
- Progress screen with mastery grid (all standards colour-coded), attempt history, Recharts radar chart
- Multi-class switcher with lazy-loaded data packs per class
- CSV export for teachers

**Exit:** Meaningful progress visible on return. Teacher can export results.

---

### Recommended first action

Run this once to unblock Phase 1:

```bash
yarn add react-router-dom zustand dexie fuse.js papaparse lucide-react
yarn add -D vite-plugin-pwa
```


Then start with `src/db/dexie.ts` and `src/db/seed.ts` — once data flows, everything else follows naturally.



Let me read the full data files first so the schema and seed script match the actual shape of the data exactly.The data files aren't in the repo yet — the tools generate them. Let me check the build tools to understand the exact schema they produce.Now I have a perfect picture of every field. Let me also check if packages need to be installed yet.All packages are already in `package.json`. Let me check if they're actually installed in `node_modules`.They're declared but not installed — this is a Yarn PnP workspace. Let me install them properly.Yarn PnP finished. Now generate the data files from the Python tools, then copy them to `public/data/`.409 items, no orphans. Now copy to `public/data/`.Now writing `db.js` and `seed.js`. Let me create the `src/db/` directory and both files.Clean build — 20 modules, no errors, PWA service worker generated. `db.js` and `seed.js` are being picked up correctly by Vite.All done. Here's a summary of what was built:

---

**`src/db/db.js`** — Dexie v1 schema with 7 tables:

| Table | Primary key | Key indexes |
|---|---|---|
| `classes` | `&id` | `code`, `order` |
| `subjects` | `&id` | `code` |
| `strands` | `&id` | `classId`, `subjectId`, `[classId+subjectId]` |
| `subStrands` | `&id` | `strandId`, `[classId+subjectId]` |
| `contentStandards` | `&id` | `code`, `[classId+subjectId]`, `subStrandId` |
| `questions` | `&id` | `csId`, `type`, `difficulty`, `[csId+difficulty]`, `*tags` (multi-entry) |
| `attempts` | `++id` (auto) | `csId`, `date`, `synced` |

**`src/db/seed.js`** — two exports:
- `seedIfNeeded({ force, onProgress })` — checks `localStorage` for `nacca_seed_v = '1.0.0'`, fetches both JSON files in parallel, writes all 6 curriculum tables in a single Dexie transaction with `bulkPut`. Safe to call on every app boot — skips instantly if already seeded.
- `resetSeed()` — clears the seed flag and wipes curriculum tables, but **preserves `attempts`** so user history survives a data refresh.

**Next step from the roadmap:** wire `seedIfNeeded()` into `src/main.jsx` before `ReactDOM.createRoot` renders, then start the Zustand stores and routing.



Next up from the roadmap: Zustand stores, AppShell, routing, and wiring `seedIfNeeded` into `main.jsx`. Let me plan this out before touching files.All stores, layout, and routing files can be written in parallel — no dependencies between them at this point.Tasks 4–10 have no interdependencies so I'll write them all in parallel, then do one build check.Now the layout components:

Create src/stores/drilldownStore.js — Zustand store for 5-level drill-down path, persisted to localStorage
NEXT
Create src/stores/quizStore.js — Zustand store for active quiz session state
Create src/stores/offlineStore.js — Zustand store for online status and sync queue
Rewrite src/index.css — clear defaults, add @import tailwindcss, define design tokens
Rewrite src/main.jsx — call seedIfNeeded() before render, wrap with RouterProvider
Create src/components/layout/BottomNav.jsx — 4-tab nav matching mockup
Create src/components/layout/OfflineIndicator.jsx — online/offline status dot
Create src/components/layout/AppShell.jsx — root layout with BottomNav and Outlet
Create src/router.jsx — route tree: AppShell wrapping Home, Practice, Progress, More stubs
Rewrite src/App.jsx to export the RouterProvider using the router config
Verify build compiles cleanly

New-Item -ItemType Directory -Force -Path "c:\Users\KING\Documents\devs\pwas\quizza\src\stores" | Out-Null
New-Item -ItemType Directory -Force -Path "c:\Users\KING\Documents\devs\pwas\quizza\src\components\layout" | Out-Null
New-Item -ItemType Directory -Force -Path "c:\Users\KING\Documents\devs\pwas\quizza\src\routes" | Out-Null
Write-Host "Directories ready"


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
 


import { create } from 'zustand'
import { persist } from 'zustand/middleware'
 
/**
 * Offline / sync store.
 *
 * Tracks the device's network status and a queue of attempt records
 * that haven't been synced yet (because the device was offline).
 *
 * The sync queue is persisted to localStorage so it survives page
 * refreshes. When the device comes back online the queue can be
 * flushed to a backend or exported as CSV.
 *
 * Usage:
 *   const isOnline    = useOfflineStore(s => s.isOnline)
 *   const queueLength = useOfflineStore(s => s.syncQueue.length)
 *   const enqueue     = useOfflineStore(s => s.enqueue)
 */
const useOfflineStore = create(
  persist(
    (set, get) => ({
      // ── Network status ────────────────────────────────────────────────────
      /** Reflects navigator.onLine — updated by event listeners in AppShell. */
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
 
      setOnline:  (val) => set({ isOnline: val }),
 
      // ── Sync queue ────────────────────────────────────────────────────────
      /**
       * Array of attempt objects waiting to be synced.
       * Each item mirrors the Dexie `attempts` table shape plus a local `_queuedAt`.
       */
      syncQueue: [],
 
      /** Add an attempt to the sync queue. */
      enqueue: (attempt) =>
        set((s) => ({
          syncQueue: [...s.syncQueue, { ...attempt, _queuedAt: Date.now() }],
        })),
 
      /** Remove one or more items from the queue by their _queuedAt timestamp. */
      dequeue: (queuedAt) =>
        set((s) => ({
          syncQueue: s.syncQueue.filter((item) => item._queuedAt !== queuedAt),
        })),
 
      /** Flush the entire queue (e.g. after a successful bulk sync). */
      clearQueue: () => set({ syncQueue: [] }),
 
      /** Convenience: how many items are waiting. */
      get pendingCount() {
        return get().syncQueue.length
      },
    }),
    {
      name: 'nacca-offline',
      // Only persist the queue — isOnline is derived from navigator.onLine on boot
      partialize: (s) => ({ syncQueue: s.syncQueue }),
    },
  ),
)
 
export default useOfflineStore
 


Phase 1 continuation — stores, shell, routing, main.jsx wiring
3/11
Create src/stores/drilldownStore.js — Zustand store for 5-level drill-down path, persisted to localStorage
Create src/stores/quizStore.js — Zustand store for active quiz session state
Create src/stores/offlineStore.js — Zustand store for online status and sync queue
Rewrite src/index.css — clear defaults, add @import tailwindcss, define design tokens
NEXT
Rewrite src/main.jsx — call seedIfNeeded() before render, wrap with RouterProvider
Create src/components/layout/BottomNav.jsx — 4-tab nav matching mockup
Create src/components/layout/OfflineIndicator.jsx — online/offline status dot
Create src/components/layout/AppShell.jsx — root layout with BottomNav and Outlet
Create src/router.jsx — route tree: AppShell wrapping Home, Practice, Progress, More stubs
Rewrite src/App.jsx to export the RouterProvider using the router config

Verify build compiles cleanly


src/stores/drilldownStore.js
src/stores/offlineStore.js
src/stores/quizStore.js