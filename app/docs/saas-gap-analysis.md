# SaaS gap analysis — "Software as a Service" document vs. this repo

Companion to [data-model.md](data-model.md), [features.md](features.md) and
[deliveries-roadmap.md](deliveries-roadmap.md). Answers one question:

> Can we adopt the SaaS document's recommendations by modifying this repository,
> with the goal of a subscription SaaS on the NaCCA curriculum?

**Short answer: yes.** The repo is *already* a SaaS in delivery terms (cloud-hosted,
browser access, PWA, provider-managed data). What it lacks are the three things that
make it a *business*: **subscriptions/billing, multi-tenancy, and student-side
classrooms**. Everything else in the document is either built or a small extension.

---

## 1. The document's asks, scored against the codebase

### Core focus areas

| Document asks for | Repo status | Evidence | Gap |
|---|---|---|---|
| **Curriculum database** aligned to NaCCA (subjects, topics, indicators, rubrics) — suggests SQL | ✅ **Built, stronger than asked** — KG1/KG2 + B1–B9: strands → sub-strands → content standards → indicators with competencies, resources, keywords, assessment notes. Static JSON, zero read-cost. | `public/curriculum/*.json`, `seed/build_grades.py`, `src/hooks/useCurriculum.js` | B2–B9 indicator *descriptions* are extraction placeholders; Nursery–KG partly done (KG1/KG2 exist, 1 subject each) |
| **Lesson planning tools** (starter/main/plenary, reminders, completion tracking, scheme integration) | ✅ **Built** — national weekly format: header block + DAYS × PHASES (Starter/Main/Plenary), indicator-linked, pre-fill from schemes, PDF/Word export | `src/pages/LessonPlanForm.jsx`, `src/lib/lessonPlanPdf.js`, `schemeAuto.js` | ⚠️ No lesson-*prep* reminders (only in-app banners, e.g. weekly question quota in `Feed.jsx`); real notifications need Cloud Functions (Blaze plan) |
| **Classroom management** — virtual classroom per teacher, student access to materials | 🟡 **Half** — teacher-side library exists (schemes, plans, notes, articles, author pages); **no student accounts, no classrooms** | `src/pages/Notes.jsx`, `AuthorPage.jsx` | 🔴 Largest gap: `users` has only `member`/`admin` roles; everything is behind teacher-only `ProtectedLayout` |
| **Assessment integration** — BECE-style exam generator, marking schemes, automated feedback | 🟡 **Mostly** — Question Bank tagged to indicator level; QuestionGenerator assembles shuffled papers with optional marking scheme (PDF/Word); QuizMaker builds PPTX quizzes. B7–B9 = BECE grades | `src/pages/QuestionGenerator.jsx`, `QuizMaker.jsx`, `src/lib/questionPaper.js`, `quizPptx.js` | ⚠️ No automated marking/feedback — papers are downloaded, not sat in-app; no score capture |

### SaaS-specific features

| Document asks for | Repo status | Gap |
|---|---|---|
| **Multi-tenancy** (schools/teachers, separate accounts) | 🟡 Single-tenant teacher network today. `school` is a free-text string on signup/profile, not an entity. Deliveries module (agent↔owner commissions) is the first B2B-ish plumbing | 🔴 Needs a `schools` collection, per-school scoping of content, and a `school_admin` role. Firestore rules already show the pattern (per-user ownership); tenancy = repeating it at school level |
| **Scalability** (cloud growth) | ✅ Vercel + Firebase scale fine; static curriculum costs nothing to serve | ⚠️ Pre-scaling debt documented in [IDENTIFIED-ISSUES.md](IDENTIFIED-ISSUES.md): `limit(1000)` bulk fetches in `Search.jsx`/`QuestionGenerator.jsx`, client-side filtering, sync export generation. Fix before marketing push |
| **Accessibility / mobile-first** | ✅ **Strong** — Tailwind responsive UI, installable PWA, offline shell + cached curriculum (built for low-connectivity Ghanaian classrooms) | None material — this *is* the repo's design driver |
| **Collaboration** (shared plans, peer review, co-teaching) | ✅ **Built** — public schemes/plans with one-click clone & adapt, Feed, articles, notes with comments, author pages | Peer *review* (ratings/approval of a colleague's plan) is absent; likes/dislikes exist |
| **Analytics dashboard** | 🟡 **Teacher-side only** — Term Progress Tracker (weeks taught), admin weekly question-submission table | 🔴 No student analytics (no student data yet); no school-level admin dashboards |

### Suggested first modules

| Document's module | Repo status | Verdict |
|---|---|---|
| 1. Timetable builder (drag-and-drop, reminders) | 🔴 Missing, but foundations exist: 2026/2027 academic calendar (`src/lib/academicCalendar.js`), Calendar pages, B1 day-by-day schedules | **Build — good first *new* feature**; data model is small (periods × days × subject/teacher) |
| 2. Schemes of Learning library | ✅ Built (`weekly_forecasts`, public library, clone via `?from=`) | Skip — done |
| 3. Automated reminders | 🟡 In-app banners only | Build with FCM push / email via Cloud Functions; needs **Blaze plan** (see deliveries-roadmap decision) |
| 4. User roles (teacher/student/admin) | 🟡 `member`/`admin` + `pending/approved/suspended` lifecycle built and enforced in `firestore.rules` | Extend: add `student` and `school_admin` roles + rules |

---

## 2. Where we *diverge* from the document

1. **"Build a structured SQL database."** Don't migrate to SQL. The repo's split —
   static JSON for the read-only curriculum, Firestore for user content — is cheaper,
   already scaled, and enforced by security rules. A Postgres migration is a backend
   rewrite with no user-visible benefit at this stage. Keep Firestore; if relational
   queries ever hurt (e.g. timetabling conflicts), BigQuery/Firestore aggregation can
   be added later without rework.
2. **"Prototype the lesson creation workflow first."** It already exists end-to-end
   (form → saved doc → PDF/Word export). Prototyping energy should go to the *missing*
   SaaS layer instead: subscriptions or the timetable builder.
3. **"ER diagram."** Firestore is schemaless, so a classical ER diagram fits poorly;
   [data-model.md](data-model.md) already serves as the authoritative entity map. A
   Mermaid entity-relationship figure can be added there cheaply if needed for
   stakeholders/GES meetings — it's a documentation task, not a blocker.

## 3. Challenges from the document, mapped to our reality

| Document's SaaS challenge | Our exposure | Mitigation (in-repo) |
|---|---|---|
| Data security on external servers | Member content + (later) student data in Firebase | Rules exist and are strict; ⚠️ **deployed rules ≠ committed rules** ([gotchas.md](gotchas.md)) — wire `firebase deploy --only firestore:rules` into releases; add tenant-isolation rules with tenancy |
| Limited customization | Per-school branding/term dates will be requested | `subjectThemes.js` + calendar config are centralised; make them per-tenant settings later |
| Internet dependence | Core design constraint already | PWA offline shell + precached curriculum — keep this a selling point in pilots |

---

## 4. Adoption plan — what to modify, in order

### Phase 0 — Hardening (protect what's built) — ✅ shipped
- **SearchPanel reads**: the panel renders on the Feed, and it used to fetch
  schemes + plans + up to 1,000 questions **on every mount**. Now it fetches
  lazily (only when a query is submitted) and keeps a module-level cache with
  a 5-minute TTL, so repeat searches / Feed re-visits cost zero extra reads.
  A visible notice appears when the question bank hits the 1,000 cap.
- **Generators**: QuestionGenerator and QuizMaker pulled up to 1,000
  questions on mount and filtered client-side. They now fetch lazily (only
  once a subject is chosen) and scope the query server-side with
  `where('subjectId','==',…)` via `lib/questionQueries.js` — bounded at
  `SCOPE_LIMIT`, with a bounded full-bank fallback if the scoped query
  fails, and an honest "bank truncated" flag instead of silent truncation.
  Grade stays filtered client-side because legacy questions may omit
  `grade` (UI defaults them to B1).
  The Question Bank browse page still reads the bank once (its admin quota
  overview needs the broad set) but now renders in 50-item batches and shows
  a truncation notice when the 1,000 cap is hit.
- **Rules deploy**: added `yarn deploy:rules` and made it an explicit part of
  every release that touches rules/indexes (see [build-deploy.md](build-deploy.md)).
- **Curriculum descriptions**: B2–B9 are already complete (0 pending) — no
  re-run needed; README "data status" corrected.

### Phase 1 — Subscriptions (this is what makes it a SaaS) — ✅ shipped v1
Implemented in-repo: `subscriptions/{uid}` ledger, Free/Pro/School catalogue
(`lib/subscriptions.js`), `/portal/subscription` member page with MoMo upgrade
requests and usage meter, `/portal/billing` admin approval queue, rules-side
export metering + free cap, and the `useExportGate()` gate wired into all four
download paths (agent previews exempt). Free limit: 5 clean downloads/month.
Remaining Phase-1 work: real merchant MoMo number in `PAYMENT_INSTRUCTIONS`,
deploy the updated rules, and later the gateway webhook (see
[deliveries-roadmap.md](deliveries-roadmap.md)).

Original scope:
- New collections: `plans` (catalogue), `subscriptions/{uid}` (plan, status, renewsAt,
  source = MoMo gateway reference).
- Feature gates client-side (free: browse curriculum + 5 exports/mo; paid: unlimited
  exports, generators, analytics) + **rules-side** checks via a `isSubscribed()` helper.
- Payments: Mobile Money through **Paystack, Hubtel or Flutterwave** (per-transaction
  fees only, ~1.95%, no monthly fee — same analysis already done in
  [deliveries-roadmap.md](deliveries-roadmap.md) for Phase-2 MoMo automation). Start
  with the manual "Mark as paid" pattern already proven in Deliveries, add webhooks after.
- ⚠️ Server-side gating (Cloud Function to flip subscription state from webhook) requires
  the **Blaze plan** — same revisit trigger documented for Deliveries Phase 1. Until then
  the gate is soft, exactly like deliveries today.

### Phase 2 — Multi-tenancy (schools) — ✅ shipped v1
Implemented in-repo: `schools/{id}` tenant collection (platform-admin CRUD);
`users/{uid}.schoolId` membership; `school_admin` role that can only
set/clear `schoolId` within its own school (rules-enforced); self-service
profile edits can no longer touch `role`/`status`/`schoolId`; new
**Schools** admin page + **School workspace** (`/portal/school`,
`/portal/schools/:schoolId`) with member management and the school-shared
library; `visibility: 'school'` on schemes/plans and `status: 'school'` on
notes, all carrying the author's `schoolId` and matched in rules.

Phase 2.5 polish shipped: **self-service join codes** (`school_codes/{code}`,
code↔school verified inside the join write, managers rotate codes) and
**school coverage analytics** (`SchoolCoverage.jsx` aggregates members'
`progress` docs — same-school reads added to rules). Still deferred:
per-school term dates/branding and school-scoped questions.

### Phase 3 — Students & assessments in-app — ✅ shipped v1
Implemented in-repo: `student` role with synthetic no-email logins (class code
+ access code, provisioned by teachers via a secondary Firebase app);
`classrooms` collection + Classrooms management page (rosters, access codes,
results); Quiz Maker "Assign to classroom" snapshots quizzes into `quizzes`;
student experience at `/portal/learn` (confined by `ProtectedLayout`) with an
in-app quiz player — one question per screen, instant MCQ auto-marking,
per-question feedback, immutable `quiz_attempts` results; teacher analytics:
per-quiz averages + latest results on the Classrooms page. Closes the
document's "automated feedback" and teacher-side "analytics" gaps.

Deferred polish shipped since: **teacher marking of written answers**
(attempts now store the student's answers; Classrooms grading panel awards
marks per question, saved to `grades` with a teacher-only rules path).
Still deferred: retake limits, showing teacher marks back to students.

### Phase 4 — Timetable builder + real reminders — ⏸ deferred by decision
Deferred until paid-infrastructure budget is available (user decision,
2026-09): reminders need Cloud Functions (Blaze plan). Same posture as the
Deliveries hard gate — revisit when resources allow. Design notes kept:
- Timetables: `timetables/{teacherId}` keyed by term; validation against the academic
  calendar and progress tracker.
- Reminders: FCM push + email via Cloud Functions (Blaze), seeded by the existing
  quota/term-date logic in `Feed.jsx` and `academicCalendar.js`.

---

## 5. Recommendation

The document's MVP ("lesson planning + curriculum database") **already shipped** in this
repo. The highest-leverage next work, in order:

1. **Phase 1 subscriptions** — without billing there is no SaaS, and the Deliveries
   module proves the team can ship the approval/payment loop on the free tier.
2. **Phase 0 hardening** in parallel — cheap, prevents public failures during pilots.
3. **Phase 2 tenancy** before approaching schools/GES — it's what makes a pilot
   saleable per school.
4. Then students/assessments (Phase 3) and the timetable builder (Phase 4).

Pilot sequence the document suggests (a few Accra schools → expand) maps cleanly onto
Phase 2 → Phase 3.
