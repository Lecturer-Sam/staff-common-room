# Question Bank — Phase 2 Implementation (Core Product)

Extends Phase 1 with filtering pipeline + coverage dashboard — PRD §10 Phase 2.

## What was done in Phase 2

### 1. QuestionBank — `app/src/pages/QuestionBank.jsx` (rewritten, 350 lines)

Old: only subjectFilter + typeFilter + mineOnly, no grade, no strand, no contentStandard, no difficulty/bloom, no coverage.

New PRD-compliant:

**Filters (PRD: class, subject, strand, sub-strand, content standard, type, number):**
- Class (grade) — from `useGrades()` B1-B9, KG1, KG2
- Subject — from `useCurriculum(gradeFilter || B4)`
- Strand — uniq from bank + curriculumStrands fallback
- Sub-strand — filtered by strand
- Content Standard * — derived as uniq map from bank + indicators (code + desc), most precise filter, shows desc on select
- Type — objective (umbrella for mcq/true_false/fill_blank), mcq, true_false, essay (umbrella), short, structured
- Difficulty — easy/medium/hard
- Bloom — remember/understand/apply/analyze/evaluate/create
- Status (admin only) — published/pending/draft/archived
- Mine only — checkbox
- Clear filters button

**Data fetching:**
- Tries server-side filtered query: `where('subjectId','==',subjectFilter)` or `where('status','==',statusFilter)` if admin, limit 1000, fallback to unfiltered on error (preserves behavior if composite missing)
- Client-side filtering for remaining dimensions (grade, strand, subStrand, contentStandard, type umbrella, difficulty, bloom, mineOnly)

**Coverage Dashboard — PRD §11 metric:**
- Toggle Show/Hide details
- Computes from questions array:
  - `byGrade`, `bySubject`, `byCS` (content standard), `byIndicator` (top 20), `byDifficulty`, `byType`, `byBloom`, `byStatus`
  - `totalCS` covered, `missingCS` (critical rule violation), `publishedCount`, `pendingCount`
  - `wellCovered` = count of CS with ≥5 Qs (PRD target 30% of standards)
  - `coverage_ratio` = covered / total in curriculum (if available)
- UI: 4 columns grid — by grade, by subject, by difficulty+status, by content standard top 10 with color (emerald if ≥5, amber if <5), plus type and bloom chips
- Shows warning if missing CS >0

**List rendering:**
- Batched rendering PAGE_SIZE=50, Show more button
- Badge for type + marks, difficulty chip (color-coded), status chip if not published
- Shows contentStandardCode as indigo pill, indicatorCode mono, bloom pill, source
- Options expand/collapse, marking guide expand/collapse
- Edit/Delete for own or admin
- Truncated notice if bank >=1000

**Preserved:**
- Weekly quota reminder (WEEKLY_QUOTA 5/week)
- Admin weekly submissions overview table
- SkeletonList + EmptyState

### 2. Audit Tool — `tools/audit_questions.py` (new, 280 lines)

PRD §9 content operations + §11 success metrics:

- Loads curriculum from `app/public/curriculum/*_indicators.json` (preferred, 670 CS, 1791 indicators) fallback to `data/curriculum/*_curriculum_db_clean.json`
- Loads questions from file (JSON array) or Firestore (`--firestore` with service account, limit 5000)
- Audit checks:
  - Every question maps to valid contentStandardCode (critical rule)
  - Orphan CS (code not in curriculum)
  - Orphan indicator
  - Missing CS rows
  - Counts by grade/subject/CS/indicator/difficulty/type/bloom/status
  - Coverage ratio: covered / total curriculum, well-covered ≥5
  - Standards without questions (first 50)
- Output JSON report for dashboard

Tested:
```bash
python tools/audit_questions.py --questions /tmp/import_ready.json --out /tmp/q_audit.json
# Total Qs: 6, Curriculum: 670 CS, Covered: 4 (0.6%), Well-covered: 0, Missing CS: 0, Orphan: 0
```

### 3. Import Tool — already in Phase 1, but Phase 2 adds usage for bulk curation

- Sample CSV `data/questions/sample_b4_mathematics.csv` — 6 rows, 4 CS, 3 subjects, 2 types

## How to use Phase 2

```bash
# Audit existing bank from Firestore
python tools/audit_questions.py --firestore --service-account sa.json --out data/audit/questions_audit.json

# Audit local file
python tools/audit_questions.py --questions data/questions/import_ready.json --out data/audit/questions_audit.json

# In app
- Go to /portal/questions — see coverage dashboard (toggle Show details)
- Filter by content standard B4.1.1.1 — see 2 Qs
- Clear filters — see all
- Admin: filter by status pending — review queue
```

## What's left for Phase 3-4

- Phase 3 Access gating: wire hasActiveSubscription() into generator, extend Billing.jsx for access_grants, real MoMo number
- Phase 4 Output: PDF template configurability via test_templates collection, header school name locked, answer key separate PDF, import 500 Qs
- Phase 5 SaaS: school-scoped questions private vs shared, per-school billing, storage.rules for re-download

## Verification

- QuestionBank.jsx compiles (uses existing ui components Button, Badge, Select, PageHeader)
- Coverage dashboard computes from questions array, no extra Firestore reads
- Filters reset visibleCount correctly
- ContentStandard filter shows desc
- Audit tool finds 0 orphans for sample, correctly reports 0.6% coverage (670 CS total)
