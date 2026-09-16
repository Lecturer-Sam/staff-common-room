# Ghana NaCCA-Aligned Question Bank — Product Requirements & Technical Proposal (MVP)

**Repo:** `Lecturer-Sam/staff-common-room` / Beacon Educational Consult  
**Date:** 2026-09-16  
**Status:** Draft PRD — replaces fragmented docs with single source of truth  
**Author:** Beacon Team  
**Related docs:** `docs/ARCHITECTURE.md`, `app/docs/data-model.md`, `app/docs/features.md`, `app/docs/saas-gap-analysis.md`, `OPPORTUNITY_MAP.md`, `TODO.md`, `docs/APP_CURRICULUM.md`

---

## 1. Problem statement

Build a web application that serves as a **Ghana NaCCA-aligned question bank** where users can generate tests by selecting **class, subject, strand, sub-strand, content standard, question type (objective or essay), and number of questions**. Access must be restricted to users who have either completed payment or been manually authorized.

**Who has the pain:**
- Teachers (94k public primary) spend hours crafting termly exams from scratch, often misaligned to NaCCA codes.
- Proprietors need **standardized, inspection-ready assessment** across campuses.
- B7-B9 schools need **BECE-style mocks** keyed to specific indicators (620k candidates/yr, 35k failed maths/english in 2026).

**Why now:** This repo already owns the rarest asset — a **machine-readable, indicator-level map of Ghana's entire basic curriculum** (4,040 indicators, 13 subjects, KG1-B9, 24 NaCCA PDFs audited). The question bank is the *only* high-value content still missing (`TODO.md`: "Fill the question bank — zero questions exist").

---

## 2. Current state

### What exists (from `REPO_ANALYSIS_REPORT.md` + `OPPORTUNITY_MAP.md`)

| Asset | Count | State |
|---|---|---|
| Curriculum DB | 4,040 indicators served, 3,095 unique codes, `B{grade}.{strand}.{substrand}.{standard}.{indicator}` | Complete, audited vs PDFs |
| Lesson plans | 13,140 (73 subject-grades × 180) | Complete, DOCX books built |
| App bundle | 43 files, 38 MB, 11 grades (KG1,KG2,B1-B9) | Generated via `tools/build_app_curriculum.py`, offline-capable |
| Portal | React 19 + Vite + Tailwind + Firebase + Vercel PWA | Built, deployed, 17 collections |
| Question Bank collection | `questions/{id}` exists in Firestore + rules | **Zero questions** — user-generated, empty |
| Generators | `QuestionGenerator.jsx` (PDF) + `QuizMaker.jsx` (PPTX) | Built, but fetch up to 1000 docs client-side, filtered client-side |
| Subscriptions | `subscriptions/{uid}` + `Plans.jsx` + `Billing.jsx` + `useExportGate()` | Shipped v1: Free 5 exports/mo, Pro unlimited, MoMo manual confirm |
| Schools | `schools/{id}` + `school_codes/{code}` + `SchoolWorkspace.jsx` | Shipped v1: multi-tenancy, join codes, coverage analytics |

### What doesn't exist for this feature

- No curated question content (no import pipeline, no review queue)
- No content-standard level tagging (current `questions` has `subjectId`, `grade`, `strandName`, `subStrandName`, `type` — missing `contentStandardCode` and `indicatorCode`)
- No difficulty/bloom taxonomy, no answer key separation (teacher-only)
- No test template configurability (header, instructions, numbering hard-coded in `lib/questionPaper.js`)
- No `GeneratedTest` snapshot — generators don't save paper for reuse/audit
- No payment gateway webhook — MoMo is manual

---

## 3. Proposed approach

### 3.1 Product model decision: SaaS vs ordinary web app

Two viable models:

**Ordinary web app (single organization):** Faster to launch, simpler ops, suitable if one school/operator will use it. One Firestore project, no tenant isolation needed.

**SaaS (multi-organization):** Supports many schools/accounts with isolated data and subscription plans, but requires more complexity: `schools` tenant collection, `schoolId` scoping, `school_admin` role, per-school billing, coverage roll-ups.

**Recommended path (matches existing repo direction):**
Build a **SaaS-ready architecture but launch initially as single-tenant web app**. This repo already made this choice:

- `saas-gap-analysis.md` Phase 2 (multi-tenancy) is **shipped v1** — `schools`, `school_codes`, `schoolId` on users, `visibility: 'school'` on content, rules-enforced.
- `TODO.md` anchor: "build the SaaS and generate revenue as soon as possible"
- `OPPORTUNITY_MAP.md` pricing: Starter GHS 2,000/yr, Standard GHS 4,500/yr, Chain from GHS 12,000/yr

We keep `schoolId` on every question/test (nullable at launch) so day-2 multi-tenant expansion is a rule change, not a migration.

### 3.2 Goals / Non-goals

**Goals (MVP):**
- Curated bank of ≥500 objective + ≥200 essay questions across B1-B9 core subjects (Math, Science, English)
- Filtering: class → subject → strand → sub-strand → content standard → indicator (optional) → type → difficulty → count
- Generation: randomized without repeats, difficulty balancing, teacher-only answer key toggle
- Output: web preview + downloadable PDF (later + Word), predefined GES format, saved as `generated_tests`
- Gated access: pending → active via payment or manual auth, export metering via `useExportGate()`

**Non-goals (MVP):**
- AI auto-generation of questions (keep human-curated v1, add AI in Phase 5)
- Real-time student exam sitting (that's `quizzes` + `quiz_attempts` Phase 3, already built for classroom)
- Full Word/PPTX templating configurability (defer to Phase 4)
- Automated MoMo webhook (manual confirm is fine until ~50 paying schools per `OPPORTUNITY_MAP.md`)

---

## 4. Core MVP scope

MVP capabilities:

1. **User registration and login** — already exists: `SignUp.jsx` creates `users/{uid}` `status: pending`, `ProtectedLayout` gates, `Members.jsx` admin approves.
2. **Access status control** — extend existing `pending/approved/suspended` + `subscriptions/{uid}` `none/requested/active/cancelled`. New: `AccessGrant` for institutional offline payments.
3. **Curriculum hierarchy navigation** — reuse `useCurriculum(grade)` → `buildTree()` → strand → sub-strand → content standard → indicator. Already powers `SubjectBrowser.jsx`. Add content-standard filter to question form.
4. **Question bank storage** — extend `questions/{id}` schema to include `contentStandardCode`, `indicatorCode`, `difficulty`, `bloomLevel`, `source`, `version`, `status: draft/pending/published/archived`.
5. **Test generation by filters + quantity** — new `generated_tests/{id}` collection: snapshot of selected questions, filters used, author, schoolId, createdAt. Engine in `lib/questionSelection.js` (new) + `lib/questionPaper.js` (existing).
6. **Preformatted output** — web preview (React) + PDF via `jspdf` (existing), header (school name locked if member has schoolId — see `SCHOOL_WORKSPACE.md`), instructions, numbering, sections, optional marking scheme separate PDF.
7. **Admin panel** — extend `Billing.jsx` + new `QuestionAdmin.jsx`: review queue, metadata completeness check, bulk import, user authorization, access grants.

---

## 5. System design

Use **modular monolith for speed** (existing pattern: React SPA + Firebase BaaS + Vercel + Material Service for docx). This is fast now and can split later.

```
[React PWA] —app/public/curriculum/*.json (38MB, offline cached)
      |
      +—> Firestore (questions, generated_tests, users, schools, subscriptions)
      |
      +—> Material Service :8080 (Flask, python-docx) — only for .docx export, browser can't run python-docx
      |
      +—> Cloud Storage (future: persist generated .docx for re-download, needs storage.rules)
```

| Layer | Choice in this repo | Job for question bank |
|---|---|---|
| **Frontend** | React 19 + Vite + Tailwind, `pages/QuestionBank.jsx`, `QuestionForm.jsx`, `QuestionGenerator.jsx` | Teacher/admin dashboard, filter UI, preview, admin review queue |
| **Backend API** | Firebase Auth + Firestore + `firestore.rules` (no custom API server yet) | Authentication, curriculum services (static JSON), question selection engine (client lib first, Cloud Function later), payments (manual), authorization |
| **Database** | Firestore (dynamic) + static JSON (curriculum) | Curriculum hierarchy, question metadata, users, subscriptions, generated tests |
| **Background jobs** | None yet — `recordExport()` is synchronous | PDF generation is sync now (blocks main thread — see `IDENTIFIED-ISSUES.md`). Future: move to Cloud Function or Web Worker for large papers |

**Key principle from `app/docs/project-blueprint.md` Phase 2c:** Security lives at data layer, never UI alone. Design security matrix now.

---

## 6. Data model (high level)

### 6.1 Existing collections reused

From `app/docs/data-model.md`:

- `users/{uid}`: `name, email, role: member/school_admin/admin/student, status: pending/approved/suspended, schoolId, classroomId`
- `schools/{id}`: `name, location, createdBy`
- `subscriptions/{uid}`: `planId: free/pro/school, status: none/requested/active/cancelled, exports: {month, count}, momoNumber, paymentRef, renownsAt`
- `questions/{id}`: currently `subjectId, grade, strandName, subStrandName, type: mcq/short/essay, question, options, answer, marks, weekKey, authorId`

### 6.2 Extended Question model (MVP)

```js
questions/{id}: {
  // Curriculum alignment — every question MUST map to one content standard (critical rule)
  grade: "B4", // B1-B9, KG1, KG2
  subjectId: "mathematics",
  strandCode: "B4.1",
  strandName: "NUMBER",
  subStrandCode: "B4.1.1",
  subStrandName: "Counting, Representation & Cardinality",
  contentStandardCode: "B4.1.1.1", // REQUIRED — e.g. B4.1.1.1
  contentStandardDesc: "Demonstrate understanding...",
  indicatorCode: "B4.1.1.1.1", // optional but preferred — precise
  indicatorDesc: "...",
  
  // Question content
  type: "objective" | "essay", // map existing mcq->objective, short/essay->essay
  objectiveType: "mcq" | "true_false" | "fill_blank" | null,
  essayType: "short" | "structured" | "long" | null,
  text: "What is place value of 5 in 45,000?",
  options: ["5", "50", "5,000", "50,000"], // for objective
  correctAnswer: "C", // teacher-only
  markingGuide: "5,000 because...", // teacher-only, for essay
  marks: 2,
  difficulty: "easy" | "medium" | "hard",
  bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
  
  // Metadata
  source: "NaCCA past question | BECE 2023 | curated",
  status: "draft" | "pending" | "published" | "archived",
  version: 1,
  authorId: uid,
  authorName: "...",
  schoolId: string | null, // null = network-wide, set = school-private
  createdAt, updatedAt,
  auditLog: [{action, by, at, diff}]
}
```

### 6.3 New collections for MVP

```js
generated_tests/{id}: {
  authorId, authorName, schoolId, // pinned to caller's schoolId via rules
  title: "B4 Mathematics - Number - Mid Term",
  filters: {
    grade, subjectId, strandCode, subStrandCode, 
    contentStandardCode, indicatorCode,
    type, difficulty, count
  },
  questions: [ // snapshot at generation time — never live ref
    {questionId, text, options, marks, contentStandardCode, ...}
  ],
  includeAnswerKey: boolean, // teacher-only toggle
  templateId: "ges_basic_v1",
  createdAt,
  exports: {pdfUrl?: string} // future when Cloud Storage added
}

test_templates/{id}: {
  id: "ges_basic_v1",
  name: "GES Basic - Standard",
  header: {schoolName, logo, examTitle, class, subject, duration, date},
  instructions: {objective, essay},
  formatting: {numbering, sections, font, spacing},
  isDefault: true
}

access_grants/{id}: {
  userId | schoolId,
  grantedBy: adminUid,
  type: "manual" | "payment" | "institutional_license",
  planId: "pro" | "school",
  expiresAt: date | null, // null = perpetual institutional
  note: "Paid offline via MoMo to 024...",
  createdAt
}

payment_transactions/{id}: {
  userId, schoolId,
  gateway: "paystack" | "hubtel" | "flutterwave" | "manual_momo",
  amount, currency: "GHS",
  reference, status: "pending" | "success" | "failed",
  momoNumber, channel: "mtn" | "vodafone" | "airtel_tigo" | "card",
  createdAt, verifiedAt, verifiedBy
}
```

**Critical rule (from your brief):** Every question must map to one content standard so filtering remains precise. Enforce in `QuestionForm.jsx` + `firestore.rules`: `request.resource.data.contentStandardCode is string && size > 0`.

**Firestore indexes needed:**
- `questions`: `grade+subjectId+contentStandardCode+status`, `authorId+weekKey` (exists), `subjectId+grade+type+status`
- `generated_tests`: `authorId+createdAt`, `schoolId+createdAt`

---

## 7. Test generation and formatting engine

### Generation flow (extends existing `QuestionGenerator.jsx`)

```
1. Validate user access status
   -> isApproved() && (subscriptions/{uid}.status == 'active' || access_grants exists || isAdmin())
   -> else block with upgrade CTA (existing useExportGate pattern)

2. Resolve curriculum selection path
   -> useCurriculum(grade) -> buildTree() -> user picks class, subject, strand, sub-strand, content standard
   -> Filters stored in URL query for shareability (?grade=B4&subject=mathematics&cs=B4.1.1.1&type=objective&count=20)

3. Query eligible questions by type and tags
   -> New lib: lib/questionQueries.js — server-side scoped where clauses:
      where('grade','==',grade).where('subjectId','==',subjectId)
      .where('contentStandardCode','==',cs).where('type','==',type).where('status','==','published')
      Limit 1000, with truncation notice (existing pattern from saas-gap-analysis Phase 0 fix)

4. Apply selection rules
   -> lib/questionSelection.js (new):
      - Randomized without repeats (Fisher-Yates shuffle)
      - Optional difficulty balancing: e.g. 40% easy, 40% medium, 20% hard (configurable)
      - Optional bloom balancing
      - Ensure coverage across indicators if indicatorCode not specified
      - If requested count > available, return max available + warning "Bank has 12, you asked 20"

5. Render output into predefined test structure
   -> lib/questionPaper.js (existing) + new lib/testTemplate.js:
      Header: school name (locked if user has schoolId — see SCHOOL_WORKSPACE.md), exam title, class, subject, date, duration, instructions
      Sections: OBJECTIVE (numbered 1..N, options A-D) + ESSAY (separate)
      Teacher-only annex: Answer key + marking guide (separate PDF if includeAnswerKey)
      Footer: indicator coverage summary for audit

6. Save generated paper for reuse and auditing
   -> addDoc(generated_tests, snapshot) + recordExport() for metering (Free 5/mo)
   -> List in SchoolWorkspace history (existing generated_materials pattern, but now with real snapshot)
```

**Formatting templates should be configurable** so exam style can change without code rewrites — `test_templates/{id}` collection, `ges_basic_v1` default, fields for header, instructions, numbering, sections. Future: admin UI to edit templates.

**Existing debt to fix (from IDENTIFIED-ISSUES.md):**
- Generators currently pull 1000 questions on mount + filter client-side. Fix: lazy fetch only after subject chosen, server-side scoped (already done for SearchPanel, apply same to QuestionGenerator).
- PDF generation blocks main thread. Fix: move to Web Worker or Cloud Function when papers >50 questions.

---

## 8. Access control and payments

### Access workflow (matches existing auth + extends)

```
New user registers -> users/{uid} status = pending
       |
       +-> Admin approves in Members.jsx -> status = approved, subscriptions/{uid} = {planId: free, status: none, exports: {month, count:0}}
       |
User either:
  a) Pays through gateway (Paystack/Hubtel/Flutterwave) -> payment_transactions pending -> webhook (future) -> active
  b) Pays MoMo manually -> submits ref in Plans.jsx -> subscriptions status = requested -> admin confirms in Billing.jsx -> status = active, renewsAt = now+30d
  c) Is manually authorized by admin -> access_grants/{id} created, or Members.jsx grants pro
       |
On success -> subscriptions status = active, planId = pro/school
       |
Expiry or failed renewal -> cron (future Cloud Function) checks renewsAt -> status = cancelled, exports still metered but gate blocks clean downloads
       |
Suspended -> status = suspended, reads denied except own profile
```

**For Ghana-focused payments, prioritize:**
- **Paystack** (best docs, 1.95% + GHS 0.50, supports MoMo + cards, per-transaction no monthly fee — same analysis in deliveries-roadmap.md)
- **Hubtel** (strong MoMo, local support)
- **Flutterwave** (fallback)
- **Manual MoMo path must remain** — institutions pay offline, WhatsApp is the channel per OPPORTUNITY_MAP.md. Admin override is not a hack, it's a feature.

**Firestore rules sketch (extends existing security.md):**

```js
match /questions/{id} {
  allow read: if isApprovedOrAdmin() && resource.data.status == 'published'
              || isOwner(resource.data.authorId) || isAdmin();
  allow create: if isApprovedOrAdmin() && request.resource.data.authorId == auth.uid
                && request.resource.data.contentStandardCode is string;
  allow update: if isOwner(resource.data.authorId) || isAdmin()
                || (isApprovedOrAdmin() && diff().affectedKeys().hasOnly(['likes'])); // if keeping likes
  allow delete: if isOwner(resource.data.authorId) || isAdmin();
}

match /generated_tests/{id} {
  allow read: if isSignedIn() && (isOwner(resource.data.authorId) 
                || (resource.data.schoolId != null && resource.data.schoolId == userSchoolId()) 
                || isAdmin());
  allow create: if isApprovedOrAdmin() && request.resource.data.authorId == auth.uid
                && request.resource.data.schoolId == userSchoolId() // prevents forging other school
                && hasActiveSubscription(); // helper checks subscriptions/{uid}.status == 'active' || access_grants exists
  allow delete: if isOwner(resource.data.authorId) || isAdmin();
}
```

**Export gate:** Reuse `useExportGate()` + `recordExport()` — free 5/mo, pro unlimited. Watermarked previews exempt (existing pattern).

---

## 9. Content operations

Establish controlled question ingestion process:

### Import pipeline

1. **Sources:** Curated past questions (BECE, NaCCA exemplars), teacher submissions via `QuestionForm.jsx`, bulk CSV import (admin only) via `tools/import_questions.py` (new).
2. **Admin review queue:** New page `/portal/questions/admin` (admin only) — lists `status == 'pending'`, shows metadata completeness score, approve/reject/edit.
3. **Enforce metadata completeness** (critical for generation quality):
   - Required: `grade, subjectId, strandCode, subStrandCode, contentStandardCode, type, text, marks`
   - For objective: `options[4], correctAnswer`
   - For essay: `markingGuide`
   - Optional but scored: `indicatorCode, difficulty, bloomLevel, source`
   - Form validation in `QuestionForm.jsx` + rules validation.
4. **Moderation/versioning:** Edited questions increment `version`, old versions kept in `questions/{id}/versions/{v}` subcollection or `auditLog[]`. Generated tests snapshot questions at generation time so edited questions do not silently alter already generated tests (existing `quizzes.questions` snapshot pattern).
5. **Audit logs:** `auditLog[]` on question doc + `generated_materials` history in `SchoolWorkspace.jsx`. For content edits: who, when, diff.

**Tools to build:**
- `tools/import_questions.py --csv data/questions/b4_math.csv --dry-run`
- `tools/audit_questions.py` — checks orphan codes (contentStandardCode not in curriculum), missing fields, placeholder text.
- Reuse `tools/_paths.py` + `tools/_compat.py` pattern.

---

## 10. Delivery roadmap

Maps to `TODO.md` Now/Next/Later + `saas-gap-analysis.md` phases.

### Phase 1 — Foundation (Week 1-2) — `docs/ARCHITECTURE.md` §1
- [x] Auth, role model (`pending/approved/suspended`, `member/school_admin/admin`), curriculum schema — **done**
- [ ] Extend `questions` schema with `contentStandardCode`, `indicatorCode`, `difficulty`, `bloomLevel`, `status`, `version`, `schoolId`
- [ ] Add `firestore.indexes.json` composites for new queries
- [ ] Admin scaffolding: `QuestionAdmin.jsx` + routes + rules
- [ ] `yarn curriculum` rebuild to ensure latest `contentStandardCode` available in bundle

### Phase 2 — Core product (Week 3-5) — Question bank CRUD + filtering
- [ ] Update `QuestionForm.jsx` to require content standard picker (tree from `useCurriculum`)
- [ ] Update `QuestionBank.jsx` list: filter by grade/subject/strand/sub-strand/content standard/type/difficulty, batched rendering (50/batch, truncation notice)
- [ ] Fix generator debt: lazy fetch, server-side `where('contentStandardCode','==',cs)` scoping via `lib/questionQueries.js`
- [ ] New `lib/questionSelection.js`: shuffle, no repeats, difficulty balancing, coverage balancing
- [ ] Test generation preview UI (web preview, no PDF yet)

### Phase 3 — Access gating (Week 5-6) — Payment + manual auth
- [ ] `access_grants` collection + rules helper `hasActiveSubscription()`
- [ ] Extend `Billing.jsx` to show access grants, manual override
- [ ] Wire `useExportGate()` into `QuestionGenerator` clean PDF path (already partially)
- [ ] MoMo instructions real number in `PAYMENT_INSTRUCTIONS` (see `lib/subscriptions.js`)
- [ ] Subscription state logic: `none -> requested -> active -> cancelled`, `renewsAt` cron note (manual until Blaze)

### Phase 4 — Output and quality (Week 7-9)
- [ ] PDF export: `lib/questionPaper.js` refactor to use `test_templates` config, header with locked school name, instructions, numbering, sections, optional answer key separate doc
- [ ] `generated_tests` collection + save snapshot + list in `SchoolWorkspace.jsx` + `/portal/tests` history page
- [ ] Template configurability: `test_templates/{id}` + admin edit UI
- [ ] Audit trail: question versions, generation logs, basic analytics (coverage ratio)
- [ ] Import tool: `tools/import_questions.py` + first 500 curated questions (B4-B6 Math, Science, English)

### Phase 5 — SaaS expansion when needed (Week 10+)
- [ ] Full multi-tenant isolation: school-scoped questions (`schoolId` filter), school question bank private vs shared
- [ ] Tenant billing plans: per-school Standard GHS 4,500/yr, Chain from GHS 12,000 (from `OPPORTUNITY_MAP.md`)
- [ ] Tenant admin self-service: `school_admin` can curate school-private bank, invite teachers, view coverage + generation analytics
- [ ] Cloud Storage for re-download (`storage.rules` still absent — TODO.md), Cloud Function for PDF (off main thread), Paystack webhook for auto activation (requires Blaze plan)

**Current TODO.md alignment:**
- Now: "Take inventory to five schools and ask for sale" — question bank is the wedge that makes Standard plan sellable
- Next: "Fill the question bank — zero questions exist. Highest-value content the project lacks." — this PRD's Phase 4
- Later: Visualization engine, VCTM pilot, offline packs — defer

---

## 11. Success metrics for early launch

Track from MVP launch (from your brief + repo context):

| Metric | Target (first term) | How measured |
|---|---|---|
| Time to generate one test paper | <60s from filter to PDF | `generated_tests.createdAt - filter submit time` |
| % generation attempts that succeed without manual correction | >90% | `generated_tests` with `count == requested` vs warnings |
| Active paid/authorized users per week | 20 teachers, 3 schools | `subscriptions` active + `access_grants` |
| Question coverage ratio across curriculum standards | 30% of content standards have ≥5 questions (B4-B6 Math/Science/English) | `tools/audit_questions.py` coverage report |
| Renewal rate and churn | >70% renewal at 30d | `subscriptions.renewsAt` vs `cancelled` |
| Export gate conversion | Free 5/mo -> Pro | `subscriptions` requested -> active funnel |
| Content velocity | 100 questions/week curated | `questions` createdAt per week |

Additional repo-specific:
- Firestore reads per generation <50 (vs current 1000 bulk fetch)
- 0 orphan `contentStandardCode` (every code resolves in curriculum bundle)

---

## 12. Key risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Weak question metadata leads to poor generation quality** | 🔴 High | Strict validation + review workflow before publication. `QuestionForm.jsx` requires `contentStandardCode`; `audit_questions.py` checks orphans; admin queue `pending` -> `published` only after completeness score 100%. Reuse `audit_b_pdf_crosscheck.py` pattern. |
| **Payment failures block legitimate users** | 🟠 Medium | Clear transaction states (`pending/success/failed`), retry logic, and **manual override path** (`access_grants`) — same philosophy as Deliveries module. WhatsApp + MoMo manual confirm is fine until 50 schools. |
| **Expansion to multiple schools causes rework** | 🟠 Medium | Include organization-aware schema now (`schoolId` nullable on `questions` + `generated_tests`), even if single-tenant at launch. Rules already enforce `schoolId == userSchoolId()`. See `SCHOOL_WORKSPACE.md`. |
| **Curriculum DB drift** (NaCCA revises, B7-B9 sources are draft CCP) | 🟡 Medium | Version everything; keep PDF-to-JSON pipeline runnable (`tools/build_app_curriculum.py` byte-identical verified). `grades.json` has `available` flag. |
| **Generated pedagogy templated** (from OPPORTUNITY_MAP.md) | 🟠 Medium | Human editorial pass on first 100 questions; never claim AI-generated; add `source` field for provenance. |
| **Firestore rules not deployed** (commit ≠ deploy) | 🔴 High | Wire `yarn deploy:rules` into release checklist (see `app/docs/build-deploy.md`). Test rules with emulator. |
| **Performance debt: 38MB bundle, 1000-doc fetches** | 🟠 Medium | Phase 0 hardening already fixed SearchPanel lazy + TTL cache; apply same to generators. Split curriculum per subject-grade if mobile data hurts (see `APP_CURRICULUM.md`). |
| **Question bank empty at launch** | 🔴 High | Don't promise BECE mocks until 500 Qs exist. Phase 4 import + 5 pilot schools free in exchange for curation help. |

---

## 13. Decisions needed from you

To finalize implementation design, decide:

1. **Initial launch model:** Single organization only, or multi-school from day one?
   - *Recommendation:* SaaS-ready single-tenant (keep `schoolId` nullable, ship with 1 school). This repo already supports multi-tenant but you can launch with 1.

2. **Target education levels at launch (e.g., B1-B6 only, or include JHS/SHS immediately):**
   - *Recommendation:* B4-B6 first (Upper Primary has most complete data, 402+386 indicators, 7 subjects). B7-B9 second (BECE value). KG1-KG2 no schedules yet (`APP_CURRICULUM.md`).

3. **Preferred output formats (PDF only vs PDF + Word):**
   - *Recommendation:* PDF only MVP (existing `jspdf`), Word via Material Service Phase 4, PPTX already exists for QuizMaker. GES schools expect PDF; Word is for editing.

4. **Payment policy (subscription, pay-per-use, or one-time institutional license):**
   - *Recommendation:* Match existing `OPPORTUNITY_MAP.md`: Free 5/mo, Pro GHS 400/yr teacher, School Standard GHS 4,500/yr, Chain from GHS 12,000, plus perpetual institutional license via `access_grants` for offline payers. Manual MoMo until 50 schools, then Paystack webhook.

5. **Whether objective questions require answer keys in teacher-only output:**
   - *Recommendation:* Yes, teacher-only separate PDF. Student PDF no answers. Toggle `includeAnswerKey` in generator. Marking guide for essay also teacher-only. Rules enforce: `generated_tests` read only if author/school/admin.

6. **Question authorship:** Curated central team only, or teacher-contributed with quota?
   - *Existing:* Weekly quota 5 questions per teacher (in `Feed.jsx`). *Recommendation:* Keep quota for UGC, but curated bank is `status: published` by admin, UGC starts `pending`.

7. **Difficulty/bloom required?**
   - *Recommendation:* Required for curated bank, optional for UGC MVP, but store anyway for future balancing.

---

## 14. Appendix

### A. Curriculum asset (from `docs/ARCHITECTURE.md` §2)

- 4,040 indicators served (3,095 unique codes), 13,140 lessons, 73 subject-grade books, 24 NaCCA PDFs
- Coding: `B{grade}.{strand}.{substrand}.{standard}.{indicator}` e.g. `B4.1.1.1.1`
- Bundle: `app/public/curriculum/<grade>_subjects.json`, `<grade>_indicators.json`, `<grade>_schedules.json`, `<grade>_schemes.json` (43 files, 38 MB, fetched per grade, cached by service worker)
- Generator: `python tools/build_app_curriculum.py`

### B. Existing question schema (before this PRD)

```js
// app/docs/data-model.md
questions/{id}: subjectId, grade, strandName, subStrandName, type: mcq/short/essay, question/options/answer/marks, weekKey
```

### C. Integration points

- `useCurriculum(grade)` + `buildTree()` — curriculum tree for filter UI
- `lib/questionQueries.js` — server-side scoped queries (extend existing)
- `lib/questionPaper.js` + `lib/quizPptx.js` — exporters
- `hooks/useExportGate.js` + `lib/subscriptions.js` + `firestore.rules` — export metering
- `SchoolWorkspace.jsx` + `generated_materials` — history pattern to reuse for `generated_tests`
- `tools/_paths.py` — single source of truth for data paths (use for import tools)

### D. Open questions from repo

- `storage.rules` still absent — blocks re-download of generated docs (TODO.md)
- `REQUIRE_AUTH=1` on Material Service still off — anyone with URL can generate unlimited docs (TODO.md)
- B2-B9 indicator descriptions are extraction placeholders? `saas-gap-analysis.md` says 0 pending, but verify.
- KG1/KG2 have indicators but no schedules/schemes.

---

**Next step:** If you approve decisions in §13, I can scaffold Phase 1-2: extend `questions` schema + `firestore.rules` + `QuestionForm.jsx` filter + `lib/questionSelection.js` + `tools/import_questions.py` skeleton.
