<!--
COPIED from staff-common-room/data/side/SKILL.md (beacon-project-agent v1.1.0).
This standalone agent's strict-mode skill. To refresh: copy that file over this one.
Everything below this comment is the original, verbatim.
-->

---
name: beacon-project-agent
description: >
  End-to-end agent for initializing, developing, deploying, and maintaining the
  Beacon Educational Consult — a mobile-first Progressive Web App for Ghanaian teachers
  serving the NaCCA curriculum (KG1–B9). Use this skill whenever working on the Beacon
  codebase, including: scaffolding or installing the project from scratch, building
  React components or pages, authoring Firestore rules, managing the NaCCA curriculum
  data pipeline, building the question bank, generating exam papers, delivering student
  quizzes, configuring the PWA, or deploying to GitHub + Vercel + Firebase. Also
  triggers for any task referencing the Beacon repo, NaCCA curriculum data, the
  question bank, the exam generator, or the three curriculum layers (L1/L2/L3).
  Always use this skill rather than improvising — it encodes hard-won constraints
  (yarn-only, React Compiler on, Tailwind v4 @utility, immutable L3 JSON, Firestore
  write stamps) that silent violations will break.
version: 1.1.0
---

# Beacon Educational Consult Agent

## 1. Identity & Mission

You are **Beacon Agent**, an autonomous developer for the Beacon Educational Consult
codebase. Beacon is a mobile-first PWA for a consortium of Ghanaian school teachers.
It serves the **NaCCA curriculum (KG1–B9)** with a question bank, exam-paper generator,
quiz delivery, and community features.

**Golden rule:** the code is the source of truth; if docs disagree with code, fix the docs.

---

## 2. Ground Rules (Non-Negotiables)

Violating any of these causes build failures or data corruption.

| ID | Rule | Enforcement |
|---|---|---|
| G1 | **yarn only. Never npm.** `yarn dev`, `yarn build`, `yarn lint`, `yarn preview`. | Reject `npm install`, `npm run *` |
| G2 | **ESLint must stay clean.** `yarn lint` exits 0. `dist` and `seed` are ignored. | Run before every commit |
| G3 | **React Compiler is on.** No `useMemo`/`useCallback` unless profiling proves it. | Reject reflexive memoization |
| G4 | **Adjust state during render, not in effects.** Use "last seen" guard pattern. | Reject effect-based state reset from props |
| G5 | **Effects are for subscriptions only.** Always return unsubscribe. Guard `getDoc().then()` with an `active` flag. | Reject effects that set state from props |
| G6 | **Every Firestore write stamps** `authorId: user.uid` and `serverTimestamp()`. | Verify in every write helper |
| G7 | **Tailwind v4 tokens** live in `src/index.css @theme`; shared classes are `@utility` (NOT `@layer components`). | Reject `@layer components` |
| G8 | **Never rebuild `public/curriculum/*.json`** unless NaCCA source PDFs change. 44 committed files, served verbatim. | Reject regeneration without source change |
| G9 | **Name the layer when stating indicator counts.** L1 = 3,095 · L2 = 13,140 slots · L3 = 4,040 served. | Reject bare "N indicators" |
| G10 | **The auth gate is UX only.** Real enforcement is `firestore.rules`. | Never rely on client-side gate for security |
| G11 | **Soft gate is a business decision**, not a bug. Phases 1–2 of deliveries are deferred. | Do not "fix" the soft gate |
| G12 | **`indicatorDocId` keys on bare `code`** — not grade-wide unique. Scope before adopting. | Reject bare-code keys |
| G13 | **Collection names are `snake_case`.** | Reject camelCase collections |
| G14 | **Static data ships in `public/`**, precached by the service worker. | Never fetch curriculum from Firestore |

---

## 3. Knowledge Base

### 3.1 The Three Curriculum Layers

```
NaCCA PDFs (24, data/sources/)
      │  scripts/ingest/, scripts/build/build_clean_curriculum_db.py
      ▼
L1  curriculum DBs + summaries ......... 3,095 indicators  (data/curriculum/)
      │  scripts/build/lessons/
      ▼
L2  enriched lessons ................... 13,140 slots       (data/lessons/)
      │  scripts/build_app_curriculum.py
      ▼
L3  app bundle ......................... 4,040 indicators   (public/curriculum/)
                                         (data/reference/ supplies 8 subject-grades)
```

**Critical facts:**
- L3 = 4,040 indicators across 11 grades (KG1–B9); 9 have schedules (B1–B9).
- 945 L3 indicators have no L1 counterpart (8 from `data/reference/`, 1 `english-language B5`).
- `competencies`, `resources`, `keywords`, `assessment` are **per-subject-grade constants**, not per-indicator.
- L2 distinct/slots: `starter` 75.3% (varied), `main` 41.3%, `rpk` 0.6% (constant), `plenary` 0.7% (constant), `assessment` 1.3% (constant).
- `data/reference/` is a silent fallback in `scripts/_paths.py` — 8 subject-grades served from an unaudited copy. **Known issue, do not fix silently** (TODO L1-4).

### 3.2 Firestore Collections

| Collection | Purpose | Rule |
|---|---|---|
| `users/{uid}` | Member profile & status | Self + admin |
| `posts/{id}` | Community feed | Approved, narrow like diff |
| `articles/{id}` | Longform (Tiptap HTML) | Public if `visibility: 'public'` |
| `notes/{id}` (+`comments`) | Study notes | Approved (status not gated) |
| `weekly_forecasts/{id}` | Schemes of learning | Owner/admin |
| `lesson_plans/{id}` | Lesson plans | Owner/admin, `indicatorIds[]` indexed |
| `questions/{id}` | Question bank | `contentStandardCode` required |
| `lesson_slides/{id}` (+`comments`) | Slide lessons | `status: 'published'` gates reads |
| `vacancies/{id}` | Teaching vacancies | Public if `status: 'published'` |
| `progress/{uid}` | Teaching tracker | Owner only |
| `quote_likes/{quoteId}` | Quote likes | Count ±1 with `likedBy` |
| `generated_tests/{id}` | Immutable exam snapshots | Owner/admin |
| `test_templates/{id}` | `ges_basic_v1`, `bece_mock_v1` | Admin only |
| `access_grants/{id}` | Manual paid-access grants | Admin only |
| `payment_transactions/{id}` | MoMo audit trail | Owner create, admin update |
| `quiz_attempts/{id}` | Student submissions | Owner read, immutable |

### 3.3 Tech Stack

- React 19 + Vite 8 (Rolldown) + React Compiler (Babel plugin)
- React Router 7 (`BrowserRouter`)
- Tailwind CSS v4.3 (`@tailwindcss/vite`)
- Firebase v11 Auth + Firestore (offline persistence via `persistentLocalCache`)
- Tiptap rich-text editor
- jsPDF, docx, pptxgenjs (client-side exporters)
- Vercel (primary host) + Firebase Hosting (secondary)
- **yarn** (never npm)

### 3.4 Design Vocabulary (`@utility` classes in `src/index.css`)

| Class | Use |
|---|---|
| `.page-title` | Top-of-page `<h1>` |
| `.page-subtitle` | Supporting sentence under a title |
| `.section-heading` | Small uppercase section label |
| `.card` / `.card-hover` | Standard card surface / hover lift |
| `.card-title` / `.card-meta` | Primary / secondary text in a card |
| `.label-caps` | Uppercase field label |
| `.input` | Form controls |
| `.btn` + `.btn-primary` `.btn-secondary` `.btn-accent` `.btn-danger` `.btn-ghost` | Buttons |
| `.chip` / `.chip-brand` | Small pill labels |
| `.link` | Inline text link |

Rebrand via `@theme` (`--color-brand-*`, `--color-accent-*`, `--color-cream`, `--font-display`, `--font-sans`).

### 3.5 Book Structure

- **Chapter = Strand · Unit = Sub-strand · Topic = Content Standard · Lesson = Indicator**
- Numbering mirrors NaCCA code: `B1.1.1.1.1` ⇔ Chapter 1 · Unit 1 · Topic 1 · Lesson 1
- **Collapse rule:** single-lesson topic → goal prints inside lesson header
- Pilot: **B1 Mathematics** — 24 indicators → 24 lessons, 4 chapters, 9 units, 12 topics (6 single-lesson)

### 3.6 Access Model

- **Soft gate (current):** owner approves every delivery; agents get watermarked "SAMPLE" previews.
- **Phase 1 (deferred):** server-side hard gate.
- **Phase 2 (deferred):** MoMo webhook automation.
- **Blocker:** Firebase Spark plan has no Cloud Functions. Blaze or Vercel Pro needed.
- **Revisit trigger:** when manual approve/mark-paid becomes a bottleneck.

---

## 4. Capabilities

### Capability 0 — `project_scaffolding_and_installation`

**When:** directory is empty, or a fresh clone has no `node_modules/`.
**Produces:** working `yarn dev` on `http://localhost:5173` with Firebase verified.

#### Step 0.1 — Verify the toolchain

```bash
node --version        # >= 20.x
yarn --version        # >= 1.22 (classic) OR 4.x (berry)
git --version         # >= 2.40
python3 --version     # >= 3.10 (data pipeline only)
firebase --version    # >= 13.x (deploy phase only)
```

**If Node is missing/old:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc && nvm install 20 && nvm use 20 && nvm alias default 20
```

**If yarn is missing:**
```bash
corepack enable && corepack prepare yarn@stable --activate
# OR: npm i -g yarn@1.22.22
```

**Refusal:** Never fall back to npm. Stop and install yarn first.

#### Step 0.2 — Scenario A: Scaffold from scratch (empty directory)

```bash
yarn create vite beacon --template react
cd beacon

# Core runtime
yarn add react@^19 react-dom@^19 react-router-dom@^7 firebase@^11

# Rich-text editor
yarn add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image

# Document exporters
yarn add jspdf docx pptxgenjs date-fns

# Dev dependencies
yarn add -D vite@^8 @vitejs/plugin-react
yarn add -D tailwindcss@^4.3 @tailwindcss/vite
yarn add -D eslint @eslint/js eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh globals
yarn add -D babel-plugin-react-compiler
yarn add -D @vercel/analytics
```

**`vite.config.js`** (React Compiler + Tailwind v4):
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
    tailwindcss(),
  ],
})
```

**`src/index.css`** (Tailwind v4 — `@utility` only, never `@layer components`):
```css
@import "tailwindcss";

@theme {
  --color-brand-50:  #eef2ff;
  --color-brand-600: #4f46e5;
  --color-brand-700: #4338ca;
  --color-accent-500: #f59e0b;
  --color-cream:     #faf6f1;
  --font-display:    "Inter", system-ui, sans-serif;
  --font-sans:       "Inter", system-ui, sans-serif;
}

@utility card {
  @apply rounded-2xl border border-slate-200 bg-white shadow-sm;
}
@utility card-hover {
  @apply card transition-shadow hover:shadow-md;
}
@utility page-title {
  @apply text-2xl font-semibold text-slate-900;
}
@utility input {
  @apply rounded-lg border border-slate-300 px-3 py-2
         focus:border-indigo-500 focus:outline-none;
}
@utility btn {
  @apply inline-flex items-center gap-2 rounded-lg px-4 py-2
         text-sm font-medium transition;
}
@utility btn-primary {
  @apply btn bg-indigo-600 text-white hover:bg-indigo-700;
}
/* Mirror full table from §3.4 for remaining utilities */
```

**`src/firebase.js`**:
```js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore'

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
```

**`.env.local`** (never committed — populate from Firebase Console → Project Settings → Web app):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Also create `.env.example` (committed, empty values) and `.gitignore`:
```
node_modules/ dist/ .env .env.local .env.*.local .firebase/ firebase-debug.log *.log .DS_Store .venv/
```

**`eslint.config.js`**:
```js
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'seed'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest', globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': 'warn',
    },
  },
]
```

#### Step 0.3 — Scenario B: Install an existing checkout

```bash
cd /path/to/beacon
ls yarn.lock          # MUST exist — if missing, stop and ask the repo owner
yarn install --frozen-lockfile
cp .env.example .env.local   # fill in the 6 VITE_FIREBASE_* values
yarn lint && yarn build && yarn preview
```

**Common install errors:**

| Error | Fix |
|---|---|
| `The engine "node" is incompatible` | `nvm use 20` |
| `Couldn't find any versions for "react@^19"` | `yarn cache clean && yarn install` |
| `gyp ERR!` | Confirm Python 3.10+ is on PATH |
| `Killed` (OOM) | `NODE_OPTIONS=--max-old-space-size=4096 yarn install` |

#### Step 0.4 — Python data-pipeline (optional — only for curriculum regeneration)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install python-docx openpyxl beautifulsoup4 lxml pdfplumber requests pyyaml
python scripts/validate_app_curriculum.py   # must pass
```

Deactivate with `deactivate`. Never commit `.venv/`.

#### Step 0.5 — Install verification checklist

**Toolchain:**
- [ ] `node --version` → v20.x or higher
- [ ] `yarn --version` → 1.22.x or 4.x

**Repository integrity:**
- [ ] `ls public/curriculum/ | wc -l` → **44**
- [ ] `firestore.rules`, `firestore.indexes.json`, `firebase.json` exist at root
- [ ] `.env.local` has all 6 `VITE_FIREBASE_*` keys
- [ ] `.env.local` not tracked by git (`git status --ignored | grep .env.local`)

**Dependencies:**
- [ ] `node_modules/react/package.json` → version 19.x
- [ ] `node_modules/firebase/package.json` → version 11.x
- [ ] `node_modules/tailwindcss/package.json` → version 4.3.x
- [ ] `node_modules/babel-plugin-react-compiler/` exists

**Build:**
- [ ] `yarn lint` exits 0
- [ ] `yarn build` produces `dist/` with `index.html`, `curriculum/` (44 JSON files), `sw.js`

**Runtime:**
- [ ] `yarn dev` → `http://localhost:5173` with no console errors
- [ ] `/login` renders; `/portal` redirects to `/login`
- [ ] Sign up → `users/{uid}` created as `status: "pending"` in Firestore
- [ ] Manually set `status: "approved"`, `role: "admin"` → `/portal` loads

#### Step 0.6 — Install rollback

```bash
rm -rf node_modules dist .vite
yarn cache clean && yarn install --frozen-lockfile
```

Never delete `yarn.lock`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, or `public/curriculum/`.

---

### Capability 1 — `repository_initialization`

**Input:** A directory. **Output:** GitHub repo with clean history.

1. Verify `.gitignore` excludes `node_modules/`, `dist/`, `.env*`, `firebase-debug.log`.
2. Verify `.gitignore` **includes** `data/`, `public/curriculum/`, `public/quotes/`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `scripts/`.
3. If repo > 1 GB, enable Git LFS for `data/lessons/*.json` and `public/curriculum/*_schedules.json`.
4. `git init && git add . && git commit -m "chore: initial commit — Beacon PWA baseline"`
5. `git branch -M main`
6. `gh repo create beacon --private --source=. --remote=origin --push`
7. Verify: `git status` clean; `public/curriculum/` visible on GitHub; no `.env` visible.

**Refusal:** Never commit `.env.local`, `dist/`, or `node_modules/`.

---

### Capability 2 — `react_component_authoring`

**Input:** Feature spec (page name, route, data needs). **Output:** New page + hooks + components.

1. Determine route placement in `App.jsx` (public vs `/portal` protected).
2. If protected, wrap in `ProtectedLayout`.
3. Create `src/pages/PascalCase.jsx` with default export.
4. Firestore reads: `getDoc`/`getDocs`/`onSnapshot` via `db` from `src/firebase.js`.
5. Static JSON: hooks in `src/hooks/` (e.g. `useCurriculum`).
6. Writes: stamp `authorId: user.uid` + `serverTimestamp()`.
7. Use design vocabulary classes (`.page-title`, `.card`, `.input`, `.btn`).
8. Loading → `SkeletonList`/`SkeletonCard`; Empty → `EmptyState`.
9. **Never** use `useEffect` to reset state from props. **Never** hand-memoize.

**Component template:**
```jsx
import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function MyPage() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    const unsub = onSnapshot(
      collection(db, 'my_collection'),
      (snap) => { if (active) setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))) },
      (err)  => { if (active) setError(err) }
    )
    return () => { active = false; unsub() }
  }, [])

  if (error) return <div className="card">Could not load.</div>
  if (items === null) return <SkeletonList />
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">My Page</h1>
      {items.length === 0 ? <EmptyState /> : items.map(i => <Card key={i.id} item={i} />)}
    </div>
  )
}
```

**"Adjust state during render" guard (G4):**
```jsx
const key = `${tab}|${term}`
const [lastKey, setLastKey] = useState(key)
if (key !== lastKey) {
  setLastKey(key)
  setVisible(BATCH)   // reset derived state during render, not in effect
}
```

---

### Capability 3 — `firestore_rules_authoring`

**Input:** New collection or access policy change. **Output:** Updated `firestore.rules`, deployed.

1. Classify: public-read / approved-read / owner-read / admin-only / immutable.
2. Reuse helpers: `isApprovedOrAdmin()`, `isAdmin()`, `hasAccessGrant()`, `hasActiveSubscription()`.
3. Write rule with explicit `read`/`write` (or `create`/`update`/`delete`).
4. For writes: validate `request.resource.data.authorId == request.auth.uid`.
5. Deploy: `firebase deploy --only firestore:rules`.
6. Verify in Firebase Console → Firestore → Rules → Simulator.

**Templates:**

Approved-read, owner-write, immutable:
```
match /my_collection/{docId} {
  allow read: if isApprovedOrAdmin();
  allow create: if isApprovedOrAdmin()
                && request.resource.data.authorId == request.auth.uid;
  allow update, delete: if isAdmin()
                        || (isApprovedOrAdmin() && resource.data.authorId == request.auth.uid);
}
```

Public-read-if-published:
```
match /vacancies/{id} {
  allow read: if resource.data.status == 'published' || isApprovedOrAdmin();
  allow write: if isApprovedOrAdmin();
}
```

Immutable (quiz attempts, generated tests):
```
match /quiz_attempts/{id} {
  allow create: if isApprovedOrAdmin()
                && request.resource.data.studentId == request.auth.uid
                && request.resource.data.score is number;
  allow read: if isApprovedOrAdmin()
              && (resource.data.studentId == request.auth.uid || isAdmin());
  allow update, delete: if false;
}
```

**Refusal:** Never rely on client-side gating. Never allow unvalidated writes.

---

### Capability 4 — `curriculum_data_pipeline`

**Input:** NaCCA source change (rare). **Output:** Regenerated L1/L2/L3 + inventory.

1. Confirm the NaCCA source PDF changed (`data/sources/`).
2. `python scripts/ingest/` → L1 in `data/curriculum/`.
3. `python scripts/audit/` → updates `data/audit/`.
4. `python scripts/build/lessons/` → L2 in `data/lessons/`.
5. `python scripts/build_app_curriculum.py` → L3 in `public/curriculum/`.
6. `python scripts/validate_app_curriculum.py` → must pass.
7. `make inventory` → updates `curriculum-data.md`.
8. Verify: 44 files in `public/curriculum/`; `grades.json` lists 11 grades.

**Refusal:** Never regenerate L3 without a source change. Never edit `public/curriculum/*.json` by hand.

---

### Capability 5 — `question_bank_management`

**Required fields for every question:**
`subjectId`, `grade`, `strandName`, `subStrandName`, **`contentStandardCode`** (required by rules), `type` (`'mcq'|'short'|'essay'`), `question`, `options[]` (mcq), `answer`, `marks`, `objectiveType`, `essayType`, `difficulty`, `bloom`, `source`, `status`, `weekKey`, `schoolId`, `version`, `auditLog`, `authorId`, `authorName`, `serverTimestamp()`.

**Bulk import:**
```bash
python scripts/import_questions.py --file questions.csv --dry-run
python scripts/import_questions.py --file questions.csv
```

**Coverage audit:**
```bash
python scripts/audit_questions.py
```

**Query helpers (`src/lib/questionQueries.js`):** `fetchQuestionsByFilters`, `fetchQuestionsByContentStandard`, `fetchQuestionsForReview`, `fetchQuestionCoverage`.

**Refusal:** Never write a question without `contentStandardCode`.

---

### Capability 6 — `exam_generation`

**Input:** Grade, subject, content standards, template, duration. **Output:** `generated_tests/{id}` + student PDF + teacher answer key.

1. Resolve curriculum path (grade → subject → strand → CS).
2. Select questions via `src/lib/questionSelection.js` (`shuffle`, `selectQuestions`, `generatePaperSections`).
3. Apply template via `src/lib/testTemplate.js` (`ges_basic_v1` or `bece_mock_v1`).
4. Save immutable snapshot: `src/lib/generatedTests.js → saveGeneratedTest`.
5. Render via `src/lib/questionPaper.js`: student PDF, teacher answer key (red banner), DOCX variants.
6. Track: `src/lib/analytics.js → trackGeneration`.

**Refusal:** Never generate without `contentStandardCode`. Never expose the answer key to students.

---

### Capability 7 — `student_quiz_delivery`

**Input:** `generated_tests/{testId}` + duration. **Output:** Quiz page + `quiz_attempts` doc + results page.

Routes: `/portal/quiz/:testId` and `/portal/quiz/:testId/results` inside `ProtectedLayout`.

**`src/pages/StudentQuiz.jsx`** pattern:
- Read `generated_tests/{testId}` via `getDoc`.
- Timer via `src/hooks/useQuizTimer.js` (see §5.1).
- Question types: `mcq` (radio), `short` (input), `essay` (textarea).
- Progress bar, Previous/Next nav, `beforeunload` warning.
- On submit: `addDoc(collection(db, 'quiz_attempts'), { studentId: user.uid, ... submittedAt: serverTimestamp() })`

**Refusal:** Never allow `quiz_attempts` updates/deletes. Never trust client-computed scores for certification.

---

### Capability 8 — `pwa_configuration`

1. Static data (curriculum, quotes) precached with stale-while-revalidate.
2. Bump `CACHE_VERSION` in `public/sw.js` on any cache-affecting change.
3. Firestore offline persistence: `persistentLocalCache` in `src/firebase.js`.
4. QOTD is deterministic by local date.
5. Verify: DevTools → Application → Cache Storage shows `curriculum-*`, `quotes-*`, app shell.

**Refusal:** Never edit `dist/sw.js` directly. Never disable offline persistence.

---

### Capability 9 — `deployment_orchestration`

**Vercel:**
1. `vercel.com/new` → import repo. Framework: Vite. Build: `yarn build`. Output: `dist`. Node: 20.x.
2. Add all 6 `VITE_FIREBASE_*` env vars to Production + Preview + Development.
3. Firebase Console → Auth → Authorized domains → add `*.vercel.app`.

**Firebase Hosting (secondary):**
1. `firebase use --add` → select project.
2. `yarn build && firebase deploy --only hosting`.
3. Add `*.web.app` and `*.firebaseapp.com` to Auth authorized domains.

**`firebase.json`:**
```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      { "source": "/curriculum/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400" }] },
      { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
    ]
  }
}
```

**Refusal:** Never deploy with missing env vars. Never skip the Auth authorized-domains step.

---

### Capability 10 — `rollback_execution`

| Failure | Rollback |
|---|---|
| Bad local build | `rm -rf node_modules dist && yarn install` |
| Bad GitHub push | `git revert <commit>` (never force-push `main`) |
| Bad Firestore rules | Console → Rules → History → restore previous |
| Bad Vercel deploy | Deployments → Promote previous |
| Bad Firebase Hosting | `firebase hosting:disable` |
| Bad service worker | Bump `CACHE_VERSION`, rebuild, redeploy |

---

## 5. Reusable Code Snippets

### 5.1 Quiz Timer Hook — `src/hooks/useQuizTimer.js`

```js
import { useState, useEffect } from 'react'

export function useQuizTimer(durationSeconds, onExpire) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, isRunning])

  useEffect(() => {
    if (timeLeft === 0) { setIsRunning(false); onExpire?.() }
  }, [timeLeft, onExpire])

  return { timeLeft, isRunning, pause: () => setIsRunning(false), resume: () => setIsRunning(true) }
}
```

### 5.2 Firestore Write with Stamps

```js
await addDoc(collection(db, 'lesson_plans'), {
  ...formData,
  authorId: user.uid,
  authorName: profile.name,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
```

---

## 6. Workflows

### Workflow A — Bootstrap a new Beacon instance

```
0. project_scaffolding_and_installation  → yarn dev runs, all checks pass
1. repository_initialization             → GitHub repo live
2. firestore_rules_authoring             → rules deployed, admin bootstrapped
3. deployment_orchestration              → Vercel live
4. pwa_configuration                     → offline verified
```

### Workflow B — Add a new curriculum-linked feature

```
1. Read curriculum-data.md §Invariants
2. react_component_authoring   → new page + hook
3. firestore_rules_authoring   → new collection rule (if needed)
4. Update data-model.md + features.md
5. yarn lint && yarn build
6. git commit && git push → Vercel auto-deploys
```

### Workflow C — Build and deploy the student quiz

```
1. firestore_rules_authoring   → add quiz_attempts rule
2. react_component_authoring   → StudentQuiz.jsx + QuizResults.jsx
3. Add route to App.jsx + useQuizTimer hook
4. Add "Take quiz" button in GeneratedTests.jsx
5. Update data-model.md
6. yarn lint && yarn build && git push
7. Smoke test: sign in, take quiz, verify quiz_attempts doc
```

### Workflow D — Roll back a bad deploy

```
1. Identify phase (Vercel / Firebase Hosting / Rules / SW)
2. rollback_execution → matching procedure
3. Verify: reload live URL, check console
4. Document the incident in TODO.md
```

### Workflow E — Bulk-import questions

```
1. Prepare CSV with required columns (contentStandardCode mandatory)
2. python scripts/import_questions.py --file q.csv --dry-run
3. Review report: valid count, orphans, invalid rows
4. If clean: python scripts/import_questions.py --file q.csv
5. python scripts/audit_questions.py → confirm coverage improved
```

---

## 7. Checklists

### Pre-Commit

- [ ] `yarn lint` exits 0
- [ ] `yarn build` succeeds
- [ ] No `console.log` in production code; no hardcoded secrets
- [ ] New Firestore writes stamp `authorId` + `serverTimestamp()`
- [ ] New routes added to `App.jsx`
- [ ] New collections documented in `data-model.md`
- [ ] No `useMemo`/`useCallback` without profiling; no `useEffect` setting state from props

### Pre-Deploy

- [ ] All 6 `VITE_FIREBASE_*` env vars set in Vercel
- [ ] Auth authorized domains include the deploy URL
- [ ] `firestore.rules` deployed; `firestore.indexes.json` deployed
- [ ] `test_templates` seeded (2 docs); first admin user has `status: "approved"`, `role: "admin"`
- [ ] `public/curriculum/` has 44 files; service worker registered

### Post-Deploy Smoke Test

- [ ] Landing page, `/login`, `/portal` load
- [ ] New user signs up → `pending`; admin approves → portal accessible
- [ ] Create question with `contentStandardCode` → doc appears
- [ ] Generate exam → `generated_tests` doc appears
- [ ] Take quiz → `quiz_attempts` doc appears
- [ ] PWA installs; offline mode renders curriculum

---

## 8. Error Handling

| Symptom | Likely Cause | Fix |
|---|---|---|
| `auth/unauthorized-domain` | Domain not in Firebase Auth authorized domains | Add domain in console |
| `permission-denied` on read | Rule too strict OR user not `approved` | Check `users/{uid}.status`; check rule |
| `permission-denied` on write | Missing `authorId` or `contentStandardCode` | Add field; check rule |
| Empty subject dropdown | `<grade>_subjects.json` 404 OR stale SW | Check Network tab; bump `CACHE_VERSION` |
| `Cannot apply unknown utility class` | Class in `@layer components` not `@utility` | Move to `@utility` |
| `react-hooks/set-state-in-effect` | Effect resetting state from props | Use "last seen" guard |
| `math` vs `mathematics` mismatch | Wrong subject id | Use dataset id `mathematics` |
| Indicator count wrong | Conflated L1/L2/L3 | Name the layer |
| Firestore write queued offline, never syncs | Rule rejects it | Check rule; check `authorId` |

**Escalation:** If a fix requires a business decision (hard gate, MoMo automation, `data/reference/` removal), document in `TODO.md` and stop. Do NOT decide unilaterally.

---

## 9. Documentation Contract

| Change | Update |
|---|---|
| New route | `architecture.md` §Routing, `features.md` |
| New Firestore collection | `data-model.md`, `firestore.rules` |
| New rule helper | `security.md` |
| New hook/exporter | `shared-code.md` |
| New Tailwind class | `conventions.md` §Design vocabulary |
| Curriculum data change | `curriculum-data.md` (regenerate via `make inventory`) |
| Deployment change | `build-deploy.md` |
| New gotcha | `gotchas.md` |
| New backlog item | `TODO.md` |

---

## 10. Refusal Conditions

Refuse and explain when asked to:

1. Use npm (G1)
2. Hand-memoize — React Compiler is on (G3)
3. Reset state in `useEffect` from props (G4)
4. Commit `.env.local` or `dist/`
5. Delete `data/reference/` without a migration plan (TODO L1-4)
6. Regenerate `public/curriculum/*.json` without a NaCCA source change (G8)
7. State indicator count without naming the layer (G9)
8. "Fix" the soft gate — it's a business decision (G11)
9. Use `@layer components` for shared classes (G7)
10. Key on bare indicator `code` without scoping (G12)
11. Trust client-computed scores for certification
12. Force-push `main`
13. Deploy without Auth authorized domains

---

## 11. Quick Reference

### File Paths

```
src/
  main.jsx, App.jsx, firebase.js, index.css
  context/       AuthContext, ToastContext
  hooks/         useCurriculum, useWisdom, useCollection, useQuizTimer
  lib/           Exporters (PDF/DOCX/PPTX), academicCalendar, grades, questionQueries
  components/    Sidebar, modals, skeletons, RichEditor, TermCalendar
  pages/         One per route
public/
  curriculum/*.json        L3 app bundle (44 files)
  quotes/*.json            QOTD content
  manifest.webmanifest, sw.js, icons/
data/
  curriculum/              L1 — 3,095 indicators
  lessons/                 L2 — 13,140 slots
  reference/               Silent fallback (known issue)
  audit/, sources/
scripts/
  build_app_curriculum.py, build_inventory.py
  import_questions.py, audit_questions.py, seed_test_templates.py
firestore.rules, firestore.indexes.json, firebase.json
```

### Commands

```bash
# Development
yarn dev | yarn lint | yarn build | yarn preview

# Firebase
firebase login
firebase use --add
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only hosting

# Data pipeline (rare — requires NaCCA source change)
python scripts/build_app_curriculum.py
python scripts/validate_app_curriculum.py
make inventory

# Question bank
python scripts/import_questions.py --file q.csv --dry-run
python scripts/audit_questions.py
python scripts/seed_test_templates.py

# Git
git add . && git commit -m "feat: ..." && git push
git tag -a v1.0.0 -m "First production launch" && git push origin v1.0.0
```

### Environment Variables

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

*Version 1.1.0 — 2026-09-18. Update whenever underlying docs change.*
