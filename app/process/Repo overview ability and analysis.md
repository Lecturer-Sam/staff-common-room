Repo overview ability and analysis my repository.
Now I'll gather evidence about the repository structure and contents.## What this is

**Beacon** is a members-only web platform that helps Ghanaian teachers plan and deliver lessons aligned to the NaCCA (National Council for Curriculum and Assessment) standards-based curriculum. Teachers create Schemes of Learning and Lesson Plans, contribute to a shared Question Bank, download branded PDFs/Word files, discover teaching vacancies, and participate in a social feed — all organized around Basic grades 1–9.

### Stack

- **Languages:** JavaScript (75%), HTML (15%), Python (10%) for curriculum data generation  
- **Framework / runtime:** React 19 + Vite + React Router 7 on Firebase (Auth + Cloud Firestore)  
- **Notable libraries:** `jspdf` + `jspdf-autotable` (PDF export), `docx` (Word export), `pptxgenjs` (PowerPoint export), Tailwind CSS 4

## How it's organized

```
src/
  App.jsx                 # Route configuration (public pages + /portal protected layout)
  firebase.js             # Firebase SDK init from env vars
  context/AuthContext.jsx # Live auth state + profile subscription
  hooks/useCurriculum.js  # Cached curriculum/grades/schedules loaders
  lib/                    # Export utilities, grade labels, week key helpers
  components/             # Sidebar, PendingApproval, shared UI
  pages/                  # One page per screen (Feed, Curriculum, Forecasts, etc.)
seed/                     # Python curriculum build scripts
data/                     # Raw NaCCA extraction files (input only)
public/curriculum/        # Generated JSON curriculum database (served statically)
public/scratch/           # Standalone Scratch teaching resources
```

**How it fits together:** Users authenticate via Firebase, then subscribe to live profile data (role/status). The app loads curriculum from static JSON files in `public/curriculum/` — no Firestore reads billed for browsing. When a teacher creates a Scheme of Learning or Lesson Plan, it's written to `weekly_forecasts` or `lesson_plans` in Firestore. Export flows use `jspdf`, `docx`, or `pptxgenjs` to render branded documents. The Python build pipeline in `seed/` reads raw curriculum extractions and generates the JSON database that powers browsing and search.

## How to run it

1. **Install dependencies:**
   ```bash
   yarn
   ```

2. **Configure Firebase:** Create a project at console.firebase.google.com, enable Email/Password auth and Firestore, create a Web app, then add its config to `.env.local`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

3. **Apply Firestore security rules** from the README (enforces signup → pending, members can't change role/status, content approval flows).

4. **Bootstrap the first admin** by signing up through the app, then manually setting `role: "admin"` and `status: "approved"` in the `users` doc in Firestore.

5. **Start development:**
   ```bash
   yarn dev        # Runs on http://localhost:5173
   yarn build      # Production build
   yarn lint       # ESLint
   ```

## Try asking

- **How do I add B2–B9 indicator descriptions?** — The README notes B2–B9 descriptions are "extraction placeholders"; what's the current state of the data files and when can those be populated?
- **What does the weekly question quota enforce, and how does the reminder banner work?** — I see it mentioned in Feed and the Question Bank feature list but didn't trace the reminder logic.
- **How are Schemes of Learning auto-generated for B1 Math & Science?** — The README says "fully generated from schedules"; where does that code live and what does the generation logic do?

==========================================================================

For the above project, let's consider the following additions:

1/ Create a PWA that uses this webapp as a source for information retrieval. The PWA will host frontend and functionalities that will help teachers, generate weekly forecasts, schemes of learning, quiz/test/classwork/homework questions, and/or download them.
2/ The webapp will be used my the admin and members for data entry.
Let's brainstorm.

==========================================================================

I'll analyze the current Beacon setup and brainstorm a PWA architecture that complements it.Based on the current codebase and your vision, here's a comprehensive brainstorm for a **teacher-focused PWA** that complements the existing Beacon webapp:

---

## **Strategic Vision**

**Beacon Web Portal** (current): Admin + member data entry hub, curriculum management, approval workflows  
**Beacon Teacher PWA** (new): Mobile-first companion app for **offline-capable**, real-time content consumption and generation while teaching or planning at home

---

## **Key Distinctions & Synergies**

### **Portal (Data Authority)**
- Curriculum maintenance (extractions, indicator descriptions)
- Member approval / suspension / vacancies approval
- Question bank moderation (by admins)
- Slide lesson submission & approval
- Bulk data management

### **PWA (Teaching & Planning)**
- ✅ Browse curriculum offline  
- ✅ Generate forecasts/schemes from cached indicators
- ✅ Create lesson plans with auto-filled content standards
- ✅ Quick question generation + download (PDF/Word/PPTX)
- ✅ Quiz builder for instant classroom use
- ✅ Offline drafts → sync when online
- ✅ Push notifications (term deadlines, weekly quota reminders)
- ✅ Home screen shortcuts for fast access

---

## **Architecture Proposal**

```
beacon-monorepo/
├── packages/
│   ├── beacon-portal/         # Current React web app (no changes needed)
│   ├── beacon-pwa/            # New mobile app
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── QuickForecast.jsx     # "New scheme" — fill subject/term/grade
│   │   │   │   ├── PlanBuilder.jsx       # Lesson plan form (simplified UX)
│   │   │   │   ├── QuestionMaker.jsx     # Quick Q generation UI
│   │   │   │   ├── QuizBuilder.jsx       # Tap-to-add questions from bank
│   │   │   │   ├── Downloads.jsx         # PDF/Word/PPTX queue + history
│   │   │   │   └── Curriculum.jsx        # Offline-first indicator browser
│   │   │   ├── hooks/
│   │   │   │   ├── useSyncState.js       # Firebase sync + local cache (IndexedDB)
│   │   │   │   ├── useOffline.js         # Online/offline detection
│   │   │   │   ├── useExport.js          # jspdf/docx/pptxgenjs rendering
│   │   │   │   └── useCurriculumSync.js  # Keep curriculum JSON fresh
│   │   │   ├── db/
│   │   │   │   ├── sync.js               # IndexedDB sync engine
│   │   │   │   └── schema.js             # IndexedDB stores
│   │   │   ├── service-worker.js         # Offline fallback + push
│   │   │   └── manifest.json             # PWA metadata
│   │   └── package.json
│   └── beacon-api-bridge/     # Optional: Node helpers for export
│       ├── export-pdf.js
│       ├── export-docx.js
│       └── export-pptx.js
└── package.json (workspace root)
```

---

## **Core PWA Features (MVP)**

### **1. Offline-First Curriculum Browsing**
- **Service Worker** caches curriculum JSON on first load
- `useCurriculumSync` hook periodically syncs if online
- Browsing works 100% offline — tap subjects → strands → indicators
- Tap an indicator → pre-fills form fields (code, competencies, resources)

### **2. Quick Forecast Generator**
**Form (mobile-optimized):**
- Subject (dropdown, prefilled if navigated from curriculum)
- Grade (B1–B9, prefilled from profile)
- Term (1–3)
- Week range (auto-calculates revision/exam weeks)
- **"Auto-fill"** button → fetches B1 Math/Science schedules or prompts for indicator selector
- **"Save as draft"** → IndexedDB (offline)
- **"Publish"** → Firestore (if online) or queue for sync

**Output:**
- Downloadable PDF/Word with NaCCA format
- Share link (optional)

### **3. Lesson Plan Quick Builder**
**Simplified form (vs. current portal):**
- Subject + Indicator (autocomplete from cached curriculum)
- Class info (size, duration)
- Week details (auto-generated starter/main/plenary skeleton)
- Tap to edit each phase
- Optional: one-click "clone from public library" (if online)

**Output:**
- PDF (national format) ready to print
- Word (editable)
- Markdown dump (for notes)

### **4. Question Generator**
**UI:**
- Scope picker: Subject → Strand → Sub-strand → Indicator
- Question type: MCQ / Short / Essay
- "Generate batch" (pick # of each type + total marks)
- Browse from offline bank → tap to add
- Can edit questions in place before download
- Download as: PDF exam paper, Word, PPTX quiz slides

**Offline:**
- Questions typed in local form (no sync to bank required — optional feature)
- Draft questions saved to IndexedDB

### **5. Quiz Maker (PPTX Autoplay)**
- Same question selection flow
- Configure autoplay timing (reveal after N seconds)
- Download PPTX → play in classroom
- Optional: answer key sheet

### **6. Download Manager**
- Queue PDF/Word/PPTX exports
- If offline: queue locally, export to device storage when online
- History of recent downloads
- Quick re-download button for 7-day cache

### **7. Sync & Notification**
- **Push notifications:**
  - Weekly quota reminder (if member)
  - Term end warnings
  - Scheme deadline (admin-configurable)
- **IndexedDB sync:**
  - On-device drafts stored in IndexedDB
  - When online, detect unsaved changes
  - Batch sync to Firestore
  - Conflict resolution: "Use device version / Use server version / Merge"

---

## **Technical Implementation Details**

### **State Management: `useSyncState` Hook**
```javascript
// Example: Drafts auto-sync with Firestore + offline fallback
const [forecast, setForecast, { isSaving, lastSync, error }] = useSyncState(
  'forecasts',
  forecastId,
  { subject: '', term: 1, rows: [] }
)

// On blur/save, auto-syncs if online; queues if offline
```

### **Export Pipeline**
- **Client-side** (jspdf, docx, pptxgenjs): Instant, no server call
- **Server-side fallback** (Node + better-xlsx for complex layouts): Optional, if client libs are insufficient
- **Stream to device storage:** Use `navigator.storage.getDirectory()` (File System API) or `<a download>`

### **Offline Detection**
```javascript
const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return isOnline
}
```

### **Service Worker**
```javascript
// service-worker.js
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('beacon-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/curriculum/grades.json',
        '/curriculum/b1_subjects.json',
        // ... all curriculum files
      ])
    })
  )
})

self.addEventListener('fetch', (e) => {
  // Cache-first for static assets
  // Network-first for Firestore calls
})
```

---

## **User Flows**

### **Teacher: "I need a lesson plan for Monday"**
1. Open PWA
2. `Plans` tab → `+ New`
3. Tap subject → auto-fills from profile
4. Search indicator (offline curriculum) → tap "Class 4 / English / Story comprehension"
5. Form fills: content standard, indicator code, competencies
6. Fill phase content (Starter/Main/Plenary)
7. Tap "Download as PDF" → instant PDF
8. Print or share

### **Teacher: "Generate 10 mixed questions for a quiz"**
1. `Questions` tab → `Generator`
2. Subject → Strand → Sub-strand
3. Select: "5 MCQ (2 marks each) + 3 short answer (1 mark) + 2 essay (3 marks)"
4. Browse offline bank → tap to add or create new
5. "Make PPTX" → Slides with questions + answer key
6. Download → open in classroom PowerPoint

### **Teacher: "Draft a scheme but sync it later"**
1. `Forecasts` → `+ New scheme`
2. Offline mode (no internet)
3. Fill in all details
4. Tap "Save as draft"
5. Later (online): "Sync now" button appears
6. Choose: sync to Firestore as "draft" or "published"

### **Admin: "Review member submissions"**
1. Stay in **Portal** (no PWA needed for admin tasks)
2. PWA is teacher-centric

---

## **Roadmap & Phasing**

### **Phase 1 (MVP): 4–6 weeks**
- ✅ PWA scaffolding (Vite + manifest + SW)
- ✅ Curriculum offline + browser
- ✅ IndexedDB schema + sync hook
- ✅ Quick forecast generator (PDF export)
- ✅ Question bank quick-add + PPTX quiz
- ✅ Offline detection + sync queue

### **Phase 2: 2–3 weeks**
- Lesson plan builder (full form)
- Download manager (history + re-download)
- Push notifications setup (Firebase Cloud Messaging)
- Icon/branding polish

### **Phase 3: 1–2 weeks**
- Analytics (popular indicators, most-generated questions)
- Teacher sharing links ("Use my lesson plan")
- Batch export (multiple forecasts as one ZIP)

---

## **Shared Code & Integration**

### **Reuse from Portal**
- `src/lib/exporters/` → PDF/Word/PPTX functions (can be tree-shaken)
- `src/hooks/useCurriculum.js` → adapt to PWA (load from cache-first, not always fetch)
- `src/context/AuthContext.jsx` → wrap PWA auth (same Firebase config)
- `public/curriculum/` → symlink or copy JSON to PWA

### **Separate Concerns**
- **Portal**: Firestore writes (data entry, approvals, forms)
- **PWA**: Firestore reads + local drafts (consumption, generation, offline)

---

## **Questions to Clarify**

1. **Export server?** Should we keep exports client-side (faster, no server) or add a Node.js backend for complex/bulk exports?
2. **Offline drafts → auto-upload?** Or require explicit "Publish to Firestore"?
3. **Teacher collaboration?** Can two teachers co-edit a forecast in real-time (via Firestore), or is it single-author only?
4. **Platform scope?** iOS/Android app via React Native, or web PWA only (can be installed as app)?
5. **Admin in PWA?** Should admins have a lightweight approval UI in the PWA, or stay in Portal?

---

**This structure keeps the Portal lean** (data governance, approvals) while the PWA is **lean, fast, offline-capable, and teacher-focused.** What aspects would you like to explore first?







The Quote of the Day module is built and verified.

What was added
Preinstalled JSON database in public/quotes/ (offline, no server — same pattern as the curriculum):
quotes.json — 29 entries: famous education quotes (Mandela, Freire, Dewey…) plus Ghanaian/Adinkra proverbs, including Dr. Kwegyir Aggrey and Nea Onnim / Sankofa / Nyansapo with their meanings.
theories.json — 18 teaching theories (Constructivism, ZPD, Cognitive Load, Scaffolding, Bloom's, Growth Mindset, Formative Assessment…), each with an accurate definition, the theorist, and a Ghanaian-classroom application.
useWisdom.js — cached JSON loader + deterministic daily/weekly selection (dailyIndex, quoteOfTheDay, theoryOfTheWeek). Same pick for every teacher, changes at local midnight, works fully offline.
Wisdom.jsx — the page (route /portal/wisdom): a Quote-of-the-Day hero with a copy button (for pasting into WhatsApp staff groups), tabs for Quotes & Proverbs / Teaching Theories, live search, and a "Theory of the week" spotlight.
Wired in: sidebar link "Quote of the Day", a compact daily-quote widget on the Feed, and the service worker now precaches the quote files (bumped to v2) so the daily quote is available offline from first launch.