# Question Bank — Phase 4 Implementation (Output & Quality)

Implements PRD §10 Phase 4 — PDF export, template configurability, audit trail, basic analytics.

## What was done

### 1. questionPaper — `app/src/lib/questionPaper.js` (rewritten, 350 lines)

Old: hardcoded header, instructions, numbering, no template, inline marking scheme only, no coverage summary, no school lock.

New PRD Phase 4:

**Template configurability (PRD: "Formatting templates should be configurable so exam style can change without code rewrites"):**
- Accepts `template` param: string id or object, resolved via `getTemplate()` from `testTemplate.js`
- `buildHeader(template, paper)` — schoolName, title, subtitle, duration, totalMarks, date, instructions, showLogo, logoPath, template name
- `buildSectionInstructions(template, type)` — per-type instructions from template
- `formatMarks(marks, template)` — `[2 marks]` vs `2 marks` per template
- Templates: `ges_basic_v1` (default, no coverage summary, no date) + `bece_mock_v1` (WAEC style, coverage summary true, date true, different objective instruction)

**Header — school name locked (SCHOOL_WORKSPACE.md):**
- If caller belongs to school, school name pre-filled and disabled in UI, and pinned in rules to `userSchoolId()` so cannot be forged into another school's history
- Logo loading respects `template.header.showLogo`
- Meta line: duration (if showDuration), total marks (if showTotalMarks), date (if showDate), template name

**Sections:**
- Label: `SECTION A — OBJECTIVE` from config
- Instructions italic per template
- Numbering continuous across sections (existing)
- Marks in brackets per template
- CS suffix `[B4.1.1.1]` shown per question for audit

**Response space:**
- MCQ: vertical A-D list
- Essay: blanks per subtype — long 4 lines, structured 3, short 1, with light color

**Coverage summary — if template.formatting.footer.showCoverageSummary (BECE mock):**
- After sections, line + "Coverage Summary (for audit)" + list of CS: count Qs
- For audit trail, shows which standards were covered

**Answer key — teacher-only separate PDF (PRD decision 5):**
- Old: `includeAnswers` appended marking scheme to same PDF
- New: keeps legacy inline for backward compat if `includeAnswers && !separateAnswerKey`
- New functions:
  - `downloadAnswerKeyPdf(paper, {template})` — separate PDF, header "MARKING SCHEME — TEACHER ONLY — DO NOT DISTRIBUTE", red warning, per-question answer (markingGuide || correctAnswer), CS suffix, full guide for long essay indented
  - `downloadAnswerKeyDocx(paper, {template})` — same for Word
- Both save as `..._MARKING_SCHEME.pdf/docx`

**Footer:**
- Page numbers, org name + subtitle, respects showPageNumbers

**DOCX:**
- Same template support, docHeader with logo, extra meta line includes template name
- Coverage summary if template says so
- Answer key separate + inline legacy

### 2. QuestionGenerator — `app/src/pages/QuestionGenerator.jsx` (extended Phase 4)

**School name locked:**
- `schoolId = profile.schoolId`, `schoolLocked` state
- Effect fetches `schools/{schoolId}` name, sets schoolName and schoolLocked true
- Input disabled if locked, hint: "Members of a school get its name pre-filled and disabled so document cannot be printed under another school's name (SCHOOL_WORKSPACE.md)"
- schoolName passed to paper and to saveGeneratedTest (pinned in rules)

**Template selector:**
- Already had ges_basic_v1, now bece_mock_v1 with hint "with coverage summary"
- Template object passed to paper: `template: getTemplate(templateId)` and `filters` includes templateId

**Separate answer key downloads:**
- Preview header now has 4 buttons: PDF (student), PDF answer key (teacher-only emerald), Word, Word key (slate)
- `handleDownload(format, answerKeyOnly)` — key = `${format}-key` for downloading state, calls `downloadPaperPdf/Docx` or `downloadAnswerKeyPdf/Docx` with template param
- Includes `gate()` for export quota (free 5/mo, pro unlimited including grants)

**Analytics:**
- `timeOperation` via performance.now(), genTimeMs state
- `trackGeneration({success, grade, subjectId, contentStandardCode, requested, returned, timeMs, warnings, templateId, hasSchool})` — logs to localStorage + console, best-effort Firestore later
- On generate success: saves snapshot via `saveGeneratedTest` with genTimeMs, requestedCount, filters
- On failure: tracks success false
- Button shows `· ${genTimeMs}ms` after generate
- Warnings include bank truncated hint

**Coverage summary in preview:**
- If template.formatting.footer.showCoverageSummary, shows border-top + Coverage Summary list

### 3. Analytics lib — `app/src/lib/analytics.js` (new, 100 lines)

PRD §11 success metrics: time to generate, % success without manual correction, active users, coverage ratio, renewal, churn.

- `trackGeneration({success, grade, subjectId, contentStandardCode, requested, returned, timeMs, warnings, templateId, hasSchool})` — event type question_generation, timestamp ISO, success, grade, subjectId, CS, requested, returned, timeMs, warningsCount, templateId, hasSchool, successRate returned/requested
  - LocalStorage `beacon_qb_analytics`: generations array last 100, stats {total, success, totalTime, totalRequested, totalReturned}
  - Console log
  - Optional Firestore `analytics_events` (commented, best-effort)
- `getLocalAnalytics()` — totalGenerations, successfulGenerations, successRate, fulfillmentRate totalReturned/totalRequested, avgTimeMs, totalRequested, totalReturned, recentGenerations 7d, generations array
- `timeOperation(fn)` — measures sync or async
- `trackQuestionContribution({grade, subjectId, contentStandardCode})` — for question bank contributions

### 4. GeneratedTests — `app/src/pages/GeneratedTests.jsx` (rewritten, 150 lines)

Old: list by schoolId or authorId, simple.

New Phase 4 with analytics:

- Local analytics card: totalGenerations, successRate %, avgTimeMs, fulfillment % (returned/requested), recent 7d count, targets <60s, >90% success
- Firestore stats: total papers, total Qs generated, avg Qs/paper, withSchool count, byTemplate chips, byGrade chips
- List: shows filters, totalMarks, genTimeMs, templateId, requested→got, contentStandard pill, fulfilled/partial badges (emerald if requested<=got else red partial), includeAnswerKey badge, audit trail details with CS per Q
- Uses getLocalAnalytics()

### 5. Seed templates tool — `tools/seed_test_templates.py` (new, 120 lines)

- TEMPLATES dict: ges_basic_v1 + bece_mock_v1 with header, instructions, formatting, isDefault, createdAt ISO
- `--dry-run` + `--out` JSON, `--push` with firebase-admin to `test_templates/{id}` with SERVER_TIMESTAMP
- Usage:
  ```bash
  python tools/seed_test_templates.py --dry-run --out /tmp/templates.json
  python tools/seed_test_templates.py --push --service-account sa.json
  ```

### 6. generatedTests lib — `app/src/lib/generatedTests.js` (extended)

- Added `genTimeMs` param and `requestedCount` in filters
- Payload includes genTimeMs for analytics

## How to use Phase 4

```bash
# Seed templates
python tools/seed_test_templates.py --dry-run --out /tmp/templates.json
python tools/seed_test_templates.py --push --service-account sa.json

# Deploy rules + indexes (must)
firebase deploy --only firestore:rules,firestore:indexes --project <id>

# In app
- Go to /portal/questions/generate
  - If you belong to school, School name locked (disabled, from schools/{schoolId})
  - Pick template GES Basic vs BECE Mock (BECE shows coverage summary)
  - Generate → see genTimeMs, preview with CS suffix
  - Download PDF (student) — no answers
  - Download PDF answer key (teacher-only, emerald button) — separate file, red warning "TEACHER ONLY"
  - Word and Word key similarly
  - History saved to generated_tests with genTimeMs, requestedCount, filters, snapshot

- Go to /portal/questions/history
  - Local analytics: success rate, avg time, fulfillment
  - Firestore history: total papers, Qs, avg, by template/grade, fulfilled/partial badges
  - Expand snapshot — audit trail immutable

- Go to /portal/questions — coverage dashboard shows standards without questions
```

## What's left for Phase 5 SaaS expansion

- Full multi-tenant isolation: school-scoped questions (schoolId filter) private vs shared, per-school question bank
- Tenant billing plans: Standard GHS 4500/yr, Chain 12k (already in PLANS)
- Tenant admin self-service: school_admin can curate school-private bank, invite teachers, view coverage + generation analytics
- Cloud Storage for re-download (needs storage.rules — TODO.md), Cloud Function for PDF off main thread, Paystack webhook auto activation (Blaze plan), renewsAt cron expiry

## Verification

- `python tools/seed_test_templates.py --dry-run` → 2 templates
- questionPaper.js uses getTemplate, buildHeader, buildSectionInstructions, formatMarks — no hardcoded strings
- School name locked if schoolId: disabled input, fetched from schools collection
- Separate answer key PDFs: downloadAnswerKeyPdf/Docx exist, save as *_MARKING_SCHEME.pdf
- Analytics: trackGeneration called on success/failure, localStorage beacon_qb_analytics has generations array, getLocalAnalytics computes avgTime, successRate, fulfillment
- GeneratedTests shows local + firestore stats, fulfilled/partial badges, genTimeMs
- Export gate still meters free, bypasses if isPro (including grant)
```

