# Question Bank — Phase 1 Implementation (Scaffolded 2026-09-16)

Implements Foundation from `docs/QUESTION_BANK_PRD.md` §10 Phase 1.

## What was done

### 1. Firestore Rules — `app/firestore.rules`
- Extended `questions/{id}`:
  - Read: published for approved, plus owner/admin can read own drafts/pending
  - Create: requires `grade`, `subjectId`, `contentStandardCode` (critical rule), `type`, `text`, `marks`, `authorId == uid`
  - Update: owner/admin, plus admin-only status change path
- Added new collections:
  - `generated_tests/{id}`: snapshot for reuse/audit, schoolId pinned to caller's school, authorId must be caller, readable by owner/school/admin
  - `test_templates/{id}`: readable by approved, write admin only
  - `access_grants/{grantId}`: manual/institutional auth, read own grant, write admin only. Doc id = uid or schoolId, or auto-id with userId/schoolId field
  - `payment_transactions/{txnId}`: MoMo + gateway, read own/school/admin, create approved user, update admin only
- Added helpers:
  - `hasAccessGrant()` — checks exists `access_grants/{uid}` or `access_grants/{schoolId}`
  - `hasActiveSubscription()` — `isPro() || hasAccessGrant()`

### 2. Firestore Indexes — `app/firestore.indexes.json`
Added 8 new composites:
- `questions`: grade+subjectId+contentStandardCode+status, subjectId+grade+type+status, grade+subjectId+status+createdAt desc, contentStandardCode+status+createdAt desc, subjectId+difficulty+status
- `generated_tests`: authorId+createdAt desc, schoolId+createdAt desc
- `payment_transactions`: userId+createdAt desc

### 3. QuestionForm — `app/src/pages/QuestionForm.jsx` (rewritten)
Old: 361 lines, only grade/subject/strand/sub-strand/indicator/type/marks/question/options/answer
New: 400+ lines, PRD-compliant:
- Curriculum alignment (required): class, subject, strand, sub-strand, **contentStandardCode * (required)**, indicator optional
  - Content standards derived as uniq by code from `useCurriculum` indicators, filtered by strand/sub-strand
  - Indicator list further filtered by contentStandardCode
- Question details: type (objective/essay), objectiveType (mcq/true_false/fill_blank), essayType (short/structured/long), difficulty (easy/medium/hard), bloomLevel (6 levels), marks, source, status (admin only: draft/pending/published/archived)
- Question text: text + legacy question field for backward compat
- Options: MCQ 4 options with radio correct, true/false select, fill blank text
- Marking guide: essay teacher-only
- Validation: contentStandardCode required — PRD critical rule enforced in UI + rules
- Versioning: version bump + auditLog on edit, weekKey on create
- schoolId: auto from profile.schoolId (nullable, SaaS-ready)

### 4. questionQueries — `app/src/lib/questionQueries.js` (extended)
- Kept `fetchQuestionsByScope({subjectId})` but now filters `status==published`
- Added `fetchQuestionsByFilters({grade, subjectId, contentStandardCode, indicatorCode, type, difficulty, status, max})` — PRD critical path, handles objective/essay umbrella types client-side, composite-aware with fallback to subject-only
- Added `fetchQuestionsByContentStandard({grade, subjectId, contentStandardCode, type, max})` — most selective
- Added `fetchQuestionsForReview({status, max})` — admin queue
- Added `fetchQuestionCoverage({grade, subjectId})` — coverage audit per content standard
- Constants: `SCOPE_LIMIT=500`, `BANK_LIMIT=1000`

### 5. questionSelection — `app/src/lib/questionSelection.js` (new, 150 lines)
Pure functions, no Firestore:
- `shuffle(arr)` Fisher-Yates
- `selectQuestions(pool, {count, difficultyBalance, bloomBalance, coverIndicators})` — randomized without repeats, difficulty balancing (e.g. 40/40/20), bloom round-robin, indicator coverage balancing
- `generatePaperSections(pool, sectionConfigs)` — per-section selection, no repeats across sections, totalMarks, warnings, allSelected
- Handles warnings: only N available, difficulty gaps, coverage spread

### 6. testTemplate — `app/src/lib/testTemplate.js` (new, 100 lines)
- `DEFAULT_TEMPLATE` ges_basic_v1 + `bece_mock_v1` variant
- `TEMPLATES` map, `getTemplate(id)`, `buildHeader(template, paperData)`, `buildSectionInstructions(template, type)`, `formatMarks()`
- Configurable: header (logo, schoolName, title, subtitle, duration, totalMarks), instructions per type, formatting (numbering, marksInBrackets, footer coverage summary)

### 7. generatedTests — `app/src/lib/generatedTests.js` (new, 60 lines)
- `saveGeneratedTest({user, profile, filters, sections, allSelected, totalMarks, title, includeAnswerKey, templateId})`
- Saves snapshot to `generated_tests` — questions snapshot at generation time so later edits don't alter old papers (existing quizzes.questions pattern)
- Fields: authorId, authorName, schoolId pinned, title, filters (grade, subjectId, strand, subStrand, contentStandardCode, indicatorCode, type, difficulty, count), sections (type, label, instructions, questionIds), questions (full snapshot with text, options, correctAnswer, markingGuide, marks, contentStandardCode, indicatorCode, difficulty, bloom), totalMarks, includeAnswerKey, templateId, createdAt serverTimestamp

### 8. QuestionGenerator — `app/src/pages/QuestionGenerator.jsx` (rewritten, 300 lines)
Old: pulled subjectQuestions, filtered client-side by strand/sub-strand, shuffled per section, no contentStandard, no save, no selection engine
New PRD v1:
- Filters: class, subject, strand, sub-strand, **contentStandardCode * (recommended)**, difficulty optional — resolves curriculum selection path via `useCurriculum` + `buildTree()` + contentStandards derived list
- Fetch: `fetchQuestionsByFilters` if contentStandardCode set, else `fetchQuestionsByScope`, fallback to `fetchRecentQuestions`
- Selection: `generatePaperSections(pool, sectionConfigs)` — randomized without repeats, coverage balancing across indicators, difficulty balancing optional, warnings
- Template: ges_basic_v1 / bece_mock_v1 via `getTemplate`, section instructions via `buildSectionInstructions`
- Save: `saveGeneratedTest` after generation — history for audit/reuse, schoolId pinned
- Export: still via `useExportGate` + `questionPaper.js` PDF/Word, counts against free-tier quota (5/mo)
- UI: shows filtered count, objective/essay counts, truncated warning, coverage hint, link to history

### 9. Admin + History — new pages
- `app/src/pages/QuestionAdmin.jsx` (150 lines): admin-only review queue, filter by status (pending/draft/published/archived), shows contentStandardCode, missing CS warning, publish/archive/edit actions, auditLog append, stats (total, byCS, missingCS)
- `app/src/pages/GeneratedTests.jsx` (90 lines): lists `generated_tests` by schoolId if user has school else by authorId, shows filters, totalMarks, snapshot preview (first 10 Qs), link to generate
- Routes added in `app/src/App.jsx`: `/portal/questions/admin`, `/portal/questions/history`
- Sidebar: added Question Admin to adminLinks

### 10. Import Tool — `tools/import_questions.py` (new, 400 lines)
- Reads CSV/JSON, tolerant column names (grade/class, subjectId/subject, strand, sub_strand, contentStandardCode/content_standard/cs_code REQUIRED, indicatorCode, type, objectiveType, essayType, text/question, options pipe/JSON or option_a..d, correctAnswer/answer, markingGuide, marks, difficulty, bloomLevel, source, status)
- Normalizes to PRD schema, validates (grade, subjectId, contentStandardCode, text, type, MCQ options/correct), maps legacy types (mcq->objective/mcq, short->essay/short)
- Audit: loads curriculum codes from `app/public/curriculum/*_indicators.json` or `data/curriculum/*_curriculum_db_clean.json`, checks orphan content standards, counts by grade/subject/contentStandard/difficulty, first 10 errors
- Output: Firestore-ready JSON with createdAt, updatedAt, authorId import_script, weekKey, auditLog, plus legacy question field
- Dry-run: `--dry-run`, `--out`, `--audit-out`, `--grade`, `--subject`, `--status` overrides, `--limit`
- Push: `--push` with firebase-admin, batch 400, serverTimestamp
- Reuses `_paths.py` for data dirs, tolerant reads
- Tested: `python tools/import_questions.py --csv data/questions/sample_b4_mathematics.csv --dry-run` → 6 valid, 0 invalid, 0 orphans, 4 content standards

### 11. Sample Data — `data/questions/sample_b4_mathematics.csv`
6 rows: B4 mathematics NUMBER Counting Representation B4.1.1.1 (2 Qs MCQ), B4.1.1.2 essay, B4 science B4.2.1.1 MCQ + structured, B5 english true/false — covers objective/essay, mcq/true_false, easy/medium/hard, remember/understand/apply/analyze

## How to use

```bash
# 1. Validate sample
python tools/import_questions.py --csv data/questions/sample_b4_mathematics.csv --dry-run --out /tmp/ready.json --audit-out /tmp/audit.json

# 2. Import your own
python tools/import_questions.py --csv data/questions/b4_all.csv --out data/questions/import_ready.json
python tools/import_questions.py --csv data/questions/b4_all.csv --push --service-account /path/to/serviceAccount.json

# 3. Deploy rules + indexes (must do after editing firestore.*)
firebase deploy --only firestore:rules,firestore:indexes --project <project-id>

# 4. Run portal
cd app
yarn curriculum   # rebuilds app/public/curriculum from data/ (required, gitignored)
yarn dev          # portal on :5173, Material Service on :8080
```

## What's left for Phase 2-4 (from PRD)

- Phase 2 Core product: update QuestionBank.jsx list to show contentStandardCode, difficulty, bloom, filter by contentStandard, batched rendering already exists; add coverage dashboard per content standard
- Phase 3 Access gating: wire hasActiveSubscription() into generator gate, extend Billing.jsx for access_grants, manual MoMo number in PAYMENT_INSTRUCTIONS
- Phase 4 Output: PDF refactor to use test_templates collection, header school name locked, answer key separate PDF, audit trail versions, import 500 curated Qs (B4-B6 Math/Science/English)
- Phase 5 SaaS: school-scoped questions, tenant billing, Cloud Storage re-download (needs storage.rules), Paystack webhook

## Verification

- `python tools/import_questions.py --csv data/questions/sample_b4_mathematics.csv --dry-run` → 6 valid, 0 orphans (tested 2026-09-16)
- `app/firestore.rules` compiles (rules_version 2)
- `app/src/pages/QuestionForm.jsx` handles legacy docs (maps mcq->objective/mcq, short->essay/short)
- `questionQueries.js` fallback to subject-only if composite missing
- No breaking change to existing QuestionBank.jsx read path (still reads status published, but now also shows pending/draft for owner/admin via new rule permissive temp)
- Sidebar + App.jsx routes added

## Decisions made (from PRD §13)

- Launch model: SaaS-ready single-tenant (schoolId nullable, already in schema)
- Target levels: B4-B6 first (sample uses B4), B7-B9 second
- Output: PDF MVP (existing jspdf), Word via Material Service Phase 4
- Payment: keep manual MoMo until 50 schools, Paystack later
- Answer key: teacher-only separate toggle includeAnswerKey, already in generator
- Authorship: curated central + teacher-contributed with quota 5/week (existing Feed reminder), new status pending for UGC, published for curated
- Difficulty/bloom: required for curated, optional for UGC but stored
