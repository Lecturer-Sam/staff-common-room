--- ## NACCA QuizBank — Build Roadmap
---

### Phase 1 — Foundation & Data Layer (Week 1)
The hardest invisible work. Get data flowing before touching UI.

1. **Install missing packages** — `react-router-dom`, `zustand`, `dexie`, `fuse.js`, `papaparse`, `lucide-react`, `vite-plugin-pwa`

yarn add react-router-dom zustand dexie fuse.js papaparse lucide-react
yarn add -D vite-plugin-pwa


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