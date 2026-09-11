# NACCA QuizBank — Development Guide

One reference to build the Firebase migration from start to finish: what you're building, how the repo is shaped, and the exact task order to follow.

---

## 1. What you're building

NACCA QuizBank is an **offline-first PWA** for Ghana's JHS curriculum (Basic 7–9), plus a separate **Admin Portal** for curriculum authors. Both apps live in one monorepo and share one Firebase backend.

**Current state:** fully local — Dexie (IndexedDB) is the only data store, no user identity, all routes are open.

**Target state:** Firebase Auth gates the app; per-user quiz attempts sync through Firestore (offline-persistent); the question bank stays hybrid — bundled JSON on first install, with a background check for Firestore-published updates.

| | Before | After |
|---|---|---|
| Access | Open, no login | Login required (Email/Password + Google) |
| Attempts | Dexie `attempts` table | Firestore `users/{uid}/attempts`, offline-cached |
| Curriculum/questions | Dexie, seeded once | Dexie stays read-only cache; Firestore is checked in the background for updates |
| Admin | — | Separate Admin Portal, gated by `admins/{uid}` doc |

---

## 2. Tech stack

| Layer | Library | Version |
|---|---|---|
| Framework | React | 19 |
| Build | Vite + Rolldown | 8 |
| Styling | Tailwind CSS (`@theme` tokens) | 4 |
| Routing | React Router | 7 |
| Local database | Dexie (IndexedDB) | 4 |
| State | Zustand | 5 |
| Backend | Firebase (Auth + Firestore) | 11 |
| Charts | Recharts | 3 |
| CSV parsing | PapaParse | 5 |
| Icons | Lucide React | latest |
| PWA | vite-plugin-pwa (Workbox) | 1 |
| Validation | Zod | 4 |

---

## 3. Project structure

```
gh-quizzer/
│
├── src/                        End-user PWA source
│   ├── components/
│   │   ├── auth/               RequireAuth guard
│   │   ├── drilldown/          Class → Subject → Strand → SubStrand → Standard cards
│   │   ├── home/                ContinueLearning, Streak, WeakSubjects widgets
│   │   ├── layout/               AppShell, BottomNav, BreadcrumbStepper, GlobalSearch
│   │   ├── progress/              MasteryGrid, AttemptHistory, RadarChart
│   │   ├── pwa/                    InstallPrompt, SyncIndicator
│   │   ├── quiz/                    QuizPlayer, QuestionCard, OptionButton, Timer, FlagButton
│   │   └── results/                  ScoreRing, StrandBreakdown, WeakAreas
│   ├── contexts/AuthContext.jsx    Firebase auth state + operations for the whole tree
│   ├── db/
│   │   ├── dexie.js                IndexedDB schema (v3 — curriculum + questions + meta)
│   │   └── seed.js                 First-boot JSON → Dexie seeder with version gate
│   ├── lib/
│   │   ├── aggregate.js            Drill-down data loaders
│   │   ├── attemptsService.js      Firestore read/write for user attempts
│   │   ├── firebase.js             Firebase app init — exports auth, db, googleProvider
│   │   ├── grading.js              isCorrect(), gradeSession()
│   │   ├── progress.js             Mastery, streak, dashboard analytics
│   │   ├── questionSync.js         Background check for newer question pack
│   │   ├── questionsService.js     Firestore question reads with Dexie fallback
│   │   ├── results.js              Post-quiz breakdown builder
│   │   ├── search.js               Fuse.js full-text question search
│   │   └── validators.js           Zod schemas
│   ├── routes/                     Auth, DataManager, Home, More, Progress, Quiz, Results
│   ├── stores/                     drilldownStore, offlineStore, quizStore
│   ├── styles/index.css            Tailwind + design tokens
│   ├── App.jsx                     Route tree (RequireAuth wraps all app routes)
│   └── main.jsx                    Bootstrap: seed → checkForQuestionUpdates → render
│
├── admin/                          Admin Portal source
│   ├── components/                 AdminShell, RequireAdmin
│   ├── hooks/                      useAdminGuard, useCollection
│   ├── routes/                     AdminLogin, CsvImport, Curriculum, Dashboard,
│   │                                 PublishUpdate, QuestionEditor, Questions, Users
│   ├── App.jsx / main.jsx / styles.css
│
├── public/                         End-user static assets (curriculum.json, questions.json seeds)
├── firestore.rules
├── vite.config.js                  End-user config (PWA, chunk splitting)
├── vite.admin.config.js            Admin config (no PWA, port 5174)
├── vercel.json                     End-user Vercel deploy config
└── vercel.admin.json               Admin Vercel deploy config
```

---

## 4. Firestore data model

```
users/{uid}/attempts/{attemptId}
  standardId, subjectId, classId
  score, total, timeSeconds
  answers: [{questionId, given, correct}]
  date (ISO string), createdAt (server timestamp)

questions/{questionId}
  standardId, classId, subjectId
  type, stem, options[], answer, explanation
  difficulty, tags[], createdAt, updatedAt

classes/{id}  subjects/{id}  strands/{id}  subStrands/{id}  contentStandards/{id}
  — curriculum collections

questionUpdates/{version}
  version, downloadUrl, publishedAt, note

admins/{uid}
  email, createdAt   — managed manually in the Firebase console
```

---

## 5. Build order — 8 tasks

Work through these in order; each one is independently testable before moving on.

### Task 1 — Firebase SDK + config module
- `yarn add firebase@^11`
- `src/lib/firebase.js`: init app, export `auth`, `db` (via `initializeFirestore` with offline persistence enabled), `googleProvider`
- `.env.example` documenting `VITE_FIREBASE_*` vars; real values go in `.env.local` (gitignored)
- **Test:** import `auth`/`db` in the browser console — no init errors, `auth.currentUser` is `null`.

### Task 2 — AuthContext / AuthProvider
- `src/contexts/AuthContext.jsx`: `createContext` + `useAuth` hook
- `AuthProvider` subscribes to `onAuthStateChanged`; exposes `{ user, loading, signInWithEmail, signInWithGoogle, signUpWithEmail, signOut }`
- All Firebase auth calls live here — not scattered in components
- Wrap `<App />` in `<AuthProvider>` in `main.jsx`
- **Test:** temporary debug overlay showing `user?.email ?? 'unauthenticated'`, confirm it updates on manual sign-in.

### Task 3 — Auth UI (Login + Register)
- `src/routes/Auth.jsx`: tab toggle between Sign In / Sign Up
- Email/password form with Zod validation (reuse `validators.js` pattern)
- "Continue with Google" via `signInWithPopup` + `googleProvider`
- Map Firebase error codes (`auth/wrong-password`, `auth/email-already-in-use`, etc.) to readable messages
- Loading spinner on submit; use existing Tailwind design tokens
- **Test:** empty submit → validation errors; wrong password → Firebase error shown; Google sign-in → `useAuth().user` populated.

### Task 4 — Auth guard on routes
- `src/components/auth/RequireAuth.jsx`: shows spinner while `loading`, redirects to `/auth` if no `user`, else renders `<Outlet />`
- Wrap `AppShell` route in `<RequireAuth>` in `App.jsx`; add `/auth` as a public route
- Redirect to `/` (or originally-requested route) after login
- Add Sign Out button to `More.jsx`
- **Test:** visit `/` unauthenticated → redirected to `/auth`; log in → redirected to `/`; sign out → back to `/auth`.

### Task 5 — Attempts: Dexie → Firestore
- `src/lib/attemptsService.js`: `saveAttempt(uid, attempt)` via `addDoc` + `serverTimestamp()`; `getAttempts(uid)` via `onSnapshot`
- `Results.jsx`: replace Dexie write with `saveAttempt(user.uid, attempt)`
- Drop `attempts` from Dexie schema (`db.version(3)` migration); keep `meta` table for the seed gate
- Delete `src/lib/sync.js` and its references in `main.jsx` / `offlineStore.js`
- **Test:** complete a quiz online → attempt appears in the Firebase console; complete offline → sits in local cache, appears once back online.

### Task 6 — Analytics read from Firestore
- `attemptsService.js`: add `useAttempts(uid)` hook wrapping `onSnapshot`
- `progress.js`: take attempts as a parameter, stay pure (data-fetching moves to the hook)
- `Progress.jsx` / `Home.jsx`: use `useAttempts(user.uid)`
- `Results.jsx`: read the just-saved attempt from local component state, not a re-query
- `offlineStore.js`: drop `syncQueue`, keep only `isOnline`/`setOnline`
- **Test:** 3 quizzes → correct streak/mastery grid; same account on a second browser → same attempts visible.

### Task 7 — Hybrid question bank updates
- Add `questionUpdates` collection (admin writes `{ version, downloadUrl, publishedAt }`)
- `src/lib/questionSync.js`: `checkForQuestionUpdates()` compares latest doc's `version` to `localStorage['nacca_seed_v']`; if newer, fetches JSON, re-seeds Dexie, bumps the gate
- Call once from `main.jsx` after initial seed, non-blocking; no-op when offline
- Rule: `questionUpdates` readable by any authenticated user, writable only via admin SDK
- **Test:** write a new `questionUpdates` doc manually → reload → DevTools confirms new JSON fetched and Dexie re-seeded.

### Task 8 — Security rules + final wiring
- Deploy `firestore.rules`:
  - `users/{uid}/attempts/{attemptId}` — read/write only if `request.auth.uid == uid`
  - `questionUpdates/{doc}` — read if authenticated, write never (admin SDK only)
- Audit for leftover Dexie `attempts` references
- Replace `SyncIndicator` with Firestore's `waitForPendingWrites` for pending-writes state
- `DataManager` CSV export reads from `useAttempts()` instead of Dexie
- Offline banner: "You're offline — your progress will sync when you reconnect."
- **Full smoke-test:** register → quiz → results → progress → sign out → sign in → progress persisted.
- **Security test:** attempt to read another user's attempts via the Firestore REST API → permission denied.

---

## 6. Firebase project setup (one-time, do before Task 1)

1. **Authentication** — enable Email/Password and Google sign-in providers
2. **Firestore** — create the database (production mode, choose region)
3. **First admin account** — after registering in the admin app, find your UID in Firebase Auth and manually create `admins/{uid}` in the Firestore console with an `email` field
4. Copy the Firebase config (Project Settings → Your apps → SDK setup) into `.env.local`

Key rules to have in mind while building (deployed properly in Task 8):
- `questions`, `classes`, `subjects`, `strands`, `subStrands`, `contentStandards` — any authenticated user reads; only admins write
- `admins/{uid}` — a user can read their own record; nobody writes from the client

---

## 7. Deploying — GitHub → Vercel (both apps)

### Push to GitHub
```bash
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Deploy the end-user app
1. [vercel.com/new](https://vercel.com/new) → import the repo
2. Framework preset: Vite · Build command: `yarn build` · Output directory: `dist` · Install command: `yarn install`
3. Add all six `VITE_FIREBASE_*` env vars
4. Deploy — `vercel.json` is picked up automatically (SPA rewrites, cache headers, service worker cache-control)

### Deploy the admin portal
1. Import the **same** repo again as a new Vercel project (e.g. `nacca-quizbank-admin`)
2. Framework preset: Other · Build command: `yarn build:admin` · Output directory: `dist-admin` · Install command: `yarn install`
3. Add the same `VITE_FIREBASE_*` env vars
4. `vercel.admin.json` isn't auto-detected — either paste its build/output settings into the dashboard override fields, or use a separate branch that renames it to `vercel.json`

### Add Firebase auth domains
After both deploys, go to **Firebase console → Authentication → Settings → Authorised domains** and add:
```
your-app.vercel.app
nacca-quizbank-admin.vercel.app
```
Add any custom domain here too, once configured.

### Continuous deployment
Both Vercel projects watch the same repo — every push to `main` rebuilds both, each running its own build command. No per-app branches needed.

---

## 8. Local dev cheatsheet

```bash
yarn dev          # end-user app — http://localhost:5173
yarn dev:admin    # admin portal — http://localhost:5174

yarn build        # end-user → dist/
yarn build:admin  # admin → dist-admin/

# Force end-user app to re-seed IndexedDB (browser console)
localStorage.removeItem('nacca_seed_v'); location.reload()

# Clear drilldown navigation state
localStorage.removeItem('nacca-drilldown'); location.reload()

# Wipe the quiz session
localStorage.removeItem('nacca-quiz'); location.reload()
```

---

## 9. Progress tracker

Check these off as you go:

- [ ] Task 1 — Firebase SDK + config module
- [ ] Task 2 — AuthContext / AuthProvider
- [ ] Task 3 — Auth UI (Login + Register)
- [ ] Task 4 — Auth guard on routes
- [ ] Task 5 — Attempts: Dexie → Firestore
- [ ] Task 6 — Analytics read from Firestore
- [ ] Task 7 — Hybrid question bank updates
- [ ] Task 8 — Security rules + final wiring
- [ ] GitHub repo pushed
- [ ] End-user app deployed to Vercel
- [ ] Admin portal deployed to Vercel
- [ ] Firebase authorised domains added
