# Beacon Educational Consult — Teacher Network

A members-only web platform where Ghanaian teachers plan, share and consult
around the NaCCA Standards-Based Curriculum. Members browse the full
curriculum (Basic 1–9), generate termly Schemes of Learning and weekly Lesson
Plans in the nationally accepted formats, build a shared Question Bank, and
download everything as branded PDF, Word or PowerPoint files.

Built with React + Vite + Tailwind on Firebase (Auth + Firestore). The
curriculum database itself is static JSON served from the app — no reads
billed for browsing.

---

## Features

### Public website
- Landing page with membership application (sign-up → admin approval)
- **Teaching vacancies** — schools in the network advertise open positions;
  adverts appear publicly after admin approval, with application deadlines

### Membership plans (SaaS)
- **Free plan** — full curriculum access + 5 document downloads per month
- **Pro plan** — unlimited downloads, paid monthly via Mobile Money;
  members submit their MoMo reference on **Plans**, an admin confirms the
  payment on **Subscriptions** (manual gate today, gateway webhook later —
  see `docs/deliveries-roadmap.md`)
- Export quota is metered per member and enforced in the Firestore rules

### School workspaces (multi-tenancy)
- **Schools** — platform admins create a tenant per school; each gets a
  workspace with its member list and private content library
- **Membership** — admins / school admins assign approved teachers to a
  school; a `school_admin` role manages its own school's members
- **School-only sharing** — schemes, lesson plans ("My school only") and
  study notes ("Share with my school") can be shared inside the school
  without appearing to the wider network
- **Join codes** — managers generate a code that lets teachers join the
  school themselves; the workspace also shows per-subject curriculum
  coverage for the current term

### Classrooms & in-app quizzes (students)
- **Classrooms** — a teacher creates a class (6-char class code) and adds
  pupils by name; each pupil gets a synthetic login (class code + personal
  access code — no email needed)
- **Assign quizzes** — Quiz Maker output can be assigned to a classroom;
  pupils take it in-app with instant MCQ marking and per-question feedback
- **Results** — every sit is stored as an attempt with the student's full
  answers; teachers see per-quiz averages and the latest results on the
  Classrooms page, and **mark written (short/essay) answers** in a grading
  panel (marks stored on the attempt, MCQs stay auto-marked)

### Curriculum library
- Full NaCCA curriculum for **Basic 1–9**, every subject: strands,
  sub-strands, content standards, indicators (with competencies, resources,
  keywords and assessment notes)
- Grade tabs, expandable indicator cards, per-indicator links into lesson
  planning
- **Search** across indicators, schemes, plans, questions and slide lessons

### Documents (all download as branded PDF **and** editable Word)
- **Schemes of Learning** — termly, one row per week (Strand / Sub-strand /
  Content Standard / Indicators / Resources) with REVISION / EXAMINATION /
  VACATION rows, matching the printed national sample. Auto-generated from
  the curriculum database for subjects with extracted schedules (B1 Maths &
  Science), assembled via indicator pickers for the rest
- **Lesson Plans** — the national weekly format: header block (week ending,
  class size, duration, content standard, indicator, performance indicator,
  core competencies, T/L resources, new words, references) plus the
  DAYS × PHASES (Starter / Main / Plenary) table. Fully generated for
  scheduled subjects, including daily phase content
- **Clone & adapt** — one click copies any public scheme or plan into your
  own editable draft

### Question pipeline
- **Question Bank** — MCQ / short answer / essay questions tagged
  class → subject → strand → sub-strand → indicator, with marks. Every
  teacher must add 5 questions per week: reminder banners until complete,
  and an admin table of submissions by member (creator always visible)
- **Questions Generator** — pick scope + sections (type, count, marks) and
  assemble a shuffled exam paper; download as PDF/Word with optional marking
  scheme
- **Quiz Maker** — the same bank packaged as a classroom PowerPoint
  (.pptx): title slide, one slide per question, answer reveals or answer-key
  slide

### Community
- **Teacher Feed** — short posts with likes; carries the weekly question
  quota reminder and term-progress summary
- **One-minute lesson slides** — members author short slide lessons
  (up to 8 slides), submitted for admin approval, played in-app with a
  1-minute autoplay; viewers can 👍 / 👎 and comment
- **Personal author pages** — each member's profile and published slide
  lessons at `/portal/authors/:uid`
- **Term Progress Tracker** — tick weeks as taught per subject/term/class;
  the next week links straight into a pre-filled lesson plan

### Teaching resources
- **Scratch Playground** — interactive Scratch tutorial, block-category
  reference and Scratch 3 curriculum guide, embedded in the portal

### Administration
- Member approval / suspension (Members page, admin only)
- Vacancy and slide-lesson approval queues
- Weekly question-bank submission overview

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7 |
| Backend | Firebase Authentication (email/password) + Cloud Firestore |
| Curriculum data | Static JSON in `public/curriculum/` (no Firestore reads) |
| PDF export | `jspdf` + `jspdf-autotable` |
| Word export | `docx` |
| PowerPoint export | `pptxgenjs` |

---

## Getting started

### 1. Install

```bash
yarn            # or npm install
```

### 2. Configure Firebase

Create a Firebase project at <https://console.firebase.google.com>, then:

1. **Authentication** → enable **Email/Password**
2. **Firestore Database** → create a database (production mode)
3. Project settings → add a **Web app** and copy the config values

Create `.env.local` in the project root:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Security rules

Paste the ruleset below into **Firestore → Rules**. It enforces: signup can
only create a *pending* member; members cannot change their own role/status;
private documents are visible only to their author and admins; vacancies are
publicly readable once published; member-submitted content (vacancies, slide
lessons) requires admin approval; subscription upgrades and renewals are
admin-only while the free-tier export meter is self-service but capped.

> ⚠️ The authoritative ruleset is **`firestore.rules`** in the repo root —
> the snippet below is illustrative and may lag behind it. When in doubt,
> copy the file. Also remember that editing rules (here or in the file)
> changes nothing in production until you run
> `firebase deploy --only firestore:rules,firestore:indexes`.

<details>
<summary>Complete Firestore rules</summary>

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function isAdmin() {
      return isSignedIn() && userDoc().role == 'admin';
    }
    function isApprovedMember() {
      return isSignedIn() &&
        (userDoc().status == 'approved' || userDoc().role == 'admin');
    }
    function isOwner() {
      return isSignedIn() && resource.data.authorId == request.auth.uid;
    }

    match /users/{userId} {
      allow get: if isSignedIn();
      allow list: if isAdmin();
      allow create: if isSignedIn() && request.auth.uid == userId
        && request.resource.data.role == 'member'
        && request.resource.data.status == 'pending';
      allow update: if isAdmin() ||
        (isSignedIn() && request.auth.uid == userId
          && request.resource.data.role == resource.data.role
          && request.resource.data.status == resource.data.status);
      allow delete: if isAdmin();
    }

    match /posts/{postId} {
      allow read: if isApprovedMember();
      allow create: if isApprovedMember()
        && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isOwner() || isAdmin();
    }

    match /weekly_forecasts/{schemeId} {
      allow read: if isAdmin() || (isApprovedMember()
        && (resource.data.visibility == 'public'
            || resource.data.authorId == request.auth.uid));
      allow create: if isApprovedMember()
        && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isOwner() || isAdmin();
    }

    match /lesson_plans/{planId} {
      allow read: if isAdmin() || (isApprovedMember()
        && (resource.data.visibility == 'public'
            || resource.data.authorId == request.auth.uid));
      allow create: if isApprovedMember()
        && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isOwner() || isAdmin();
    }

    match /questions/{questionId} {
      allow read: if isApprovedMember();
      allow create: if isApprovedMember()
        && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isOwner() || isAdmin();
    }

    match /vacancies/{vacancyId} {
      allow read: if resource.data.status == 'published' || isApprovedMember();
      allow create: if isApprovedMember()
        && request.resource.data.authorId == request.auth.uid
        && (request.resource.data.status == 'pending' || isAdmin());
      allow update, delete: if isOwner() || isAdmin();
    }

    match /lesson_slides/{slideId} {
      allow read: if isAdmin()
        || (isApprovedMember()
            && (resource.data.status == 'published'
                || resource.data.authorId == request.auth.uid));
      allow create: if isApprovedMember()
        && request.resource.data.authorId == request.auth.uid
        && (request.resource.data.status in ['draft', 'pending'] || isAdmin());
      allow update: if isOwner() || isAdmin()
        || (isApprovedMember()
            && request.resource.data.diff(resource.data).affectedKeys()
                 .hasOnly(['likes', 'dislikes']));
      allow delete: if isOwner() || isAdmin();

      match /comments/{commentId} {
        allow read, create: if isApprovedMember()
          && (request.method == 'get' || request.method == 'list'
              || request.resource.data.authorId == request.auth.uid);
        allow delete: if isAdmin()
          || (isSignedIn() && resource.data.authorId == request.auth.uid);
      }
    }

    match /progress/{userId} {
      allow read, write: if isSignedIn() && request.auth.uid == userId;
    }

    match /subscriptions/{userId} {
      allow get: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow list: if isAdmin();
      allow create: if isApprovedMember() && request.auth.uid == userId;
      // Members may cancel or meter their own exports (capped on free);
      // only an admin may activate or renew a paid plan.
      allow update: if isAdmin() || (isSignedIn() && request.auth.uid == userId);
      allow delete: if isAdmin();
    }
  }
}
```

</details>

> **Composite indexes:** some filtered queries (lesson plans by indicator,
> author pages, weekly quota counts) may prompt Firestore to create a
> composite index the first time they run — click the link in the browser
> console error and retry.

### 4. Bootstrap the first admin

Sign up through the app, then in **Firestore → `users` → your document** add:

- `role` (string) = `admin`
- `status` (string) = `approved`

The portal unlocks immediately (profiles are live-subscribed). All later
members are approved from the in-app **Members** page.

### 5. Run

```bash
yarn dev        # development server
yarn build      # production build
yarn lint       # eslint
```

---

## Curriculum data pipeline

The curriculum database is generated from extraction files in `data/` and
served statically from `public/curriculum/`:

```
public/curriculum/
  grades.json           # all grades + availability
  b1_subjects.json      # per grade: subject list with counts
  b1_indicators.json    # per grade: flat indicator list
  b1_schedules.json     # per grade: day-by-day lesson content (B1 only)
  b2_subjects.json … b9_indicators.json
```

Two build scripts in `seed/`:

| Script | Input | Output |
|---|---|---|
| `build_curriculum.py` | original B1 extraction files | `b1_*.json` |
| `build_grades.py` | `data/{subject}_{grade}_curriculum_db_clean.json` (+ `_summary.json`) | `b2–b9_*.json` + `grades.json` |

Re-run after updating any extraction file:

```bash
python seed/build_grades.py
```

**Current data status**

- **B1**: complete — full descriptions, plus day-by-day teaching schedules
  (starter/main/plenary, RPK, assessment) for Mathematics and Science, which
  power fully-generated schemes and lesson plans
- **B2–B9**: complete — strands, standards, indicator codes **and full
  indicator descriptions** (verified: 0 pending across every grade). The
  earlier "(description pending extraction)" state has been resolved by the
  `seed/enrich_from_raw.py` pipeline.
- **KG1/KG2**: extracted (one subject each). **Nursery**: not yet extracted.

---

## Firestore collections

| Collection | Contents |
|---|---|
| `users` | Member profiles (`role`, `status`, school, subjects, bio) |
| `posts` | Teacher Feed posts |
| `weekly_forecasts` | Schemes of Learning (`kind: 'scheme'`; older docs are legacy) |
| `lesson_plans` | Lesson plans (`kind: 'plan-v2'`; older docs are legacy) |
| `questions` | Question Bank (grade/subject/strand tags, `weekKey` for the weekly quota) |
| `vacancies` | Job adverts (`status`: pending → published → closed) |
| `schools` | Tenants for the school workspaces (identity only; membership lives on `users.schoolId`) |
| `classrooms` | Teacher's pupil groups (`joinCode`, `teacherId`, grade/subject) |
| `quizzes` | Quizzes assigned to a classroom (question snapshot from the bank) |
| `quiz_attempts` | Immutable student quiz results (auto-marked MCQ score) |
| `lesson_slides` (+ `comments` subcollection) | One-minute slide lessons with reactions |
| `subscriptions` | SaaS billing ledger, one doc per member (plan, status, MoMo reference, monthly export meter; doc id = uid) |
| `progress` | Per-member taught-weeks tracker (doc id = uid) |

---

## Project structure

```
src/
  App.jsx                 # routes (public + /portal protected layout)
  firebase.js             # Firebase init from .env
  context/AuthContext.jsx # auth + live profile subscription
  hooks/useCurriculum.js  # cached curriculum/grades/schedules loaders
  lib/                    # exporters (PDF/Word/pptx), grade labels, week keys
  components/             # Navbar, PendingApproval
  pages/                  # one file per screen
seed/                     # curriculum build scripts
data/                     # raw extraction files (input only)
public/curriculum/        # generated curriculum database (served statically)
public/scratch/           # Scratch teaching resources (standalone pages)
```

---

## Roadmap

See [`TODO.md`](TODO.md). Remaining: email notifications via Cloud Functions
(requires the Blaze plan) and Nursery/KG extraction, plus real descriptions
for B2–B9.

---

Curriculum source: National Council for Curriculum and Assessment (NaCCA),
Ministry of Education, Republic of Ghana.


git remote add origin https://github.com/Lecturer-Sam/beacon-consult.git
git branch -M main
git push -u origin main

git init
git add .
git commit -m "Initial commit — Beacon Partner Portal"
git branch -M main
git remote add origin https://github.com/Lecturer-Sam/beacon-consult.git
git push -u origin main
