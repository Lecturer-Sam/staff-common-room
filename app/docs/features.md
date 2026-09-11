# 4. Features (module reference)

One row per feature area: its routes, what it does, the Firestore collection(s) it touches,
and notable helpers. Page files live in `src/pages/`.

## Community & content

### Feed — `/portal`
`Feed.jsx`. The portal home. Real-time community `posts` (compose + like), plus header
widgets: academic-calendar status, **Quote of the Day**, **most-loved quotes** leaderboard,
a term-progress banner (from `progress`), and a weekly question-bank quota reminder (counts
`questions` where `weekKey == thisWeek`). Also surfaces recent `articles`.
Collections: `posts`, `progress`, `questions`, `articles`.

### Articles — `/portal/articles` (+ `/new`, `/:id`, `/:id/edit`); public `/articles`
`Articles.jsx` (list), `ArticleForm.jsx` (WYSIWYG create/edit via `RichEditor`),
`ArticleView.jsx`, `PublicArticles.jsx`, `PublicArticleView.jsx`. Longform posts with
`category`, optional `subjectId`, `visibility` (`public`/`members`), likes.
Content is **HTML** produced by Tiptap. Collection: `articles` (⚠️ no rule — [gotchas](gotchas.md)).

### Notes — `/portal/notes` (+ `/new`, `/:id`, `/:id/edit`)
`Notes.jsx`, `NoteForm.jsx`, `NoteView.jsx`. Study notes with a lifecycle
(`private`→`pending`→`published`), likes/dislikes, and a `comments` subcollection.
Collection: `notes`.

### My Wall — `/portal/wall`
`MyWall.jsx`. Aggregates the current member's own content (notes, etc.) for quick access.

### Author page — `/portal/authors/:authorId`
`AuthorPage.jsx`. A member's public profile + their published notes/slides.
Collections: `users`, `notes`, `lesson_slides`.

## Curriculum & planning

### Curriculum browser — `/portal/curriculum` (+ `/:subjectId`)
`Curriculum.jsx` (grade → subject grid), `SubjectBrowser.jsx` (strand → sub-strand →
content standard → indicators tree). Pure reads of static curriculum JSON via
`useCurriculum` — no Firestore. Offline-capable.

### Schemes of learning — `/portal/forecasts` (+ `/new`, `/:id`, `/:id/edit`)
`Forecasts.jsx`, `ForecastForm.jsx`, `ForecastView.jsx`. Per-term, per-week scheme rows
that can be **pre-filled from the curriculum schedule** or built with an indicator picker.
Clone another member's public scheme via `?from=<id>`. Export to PDF/DOCX.
Collection: `weekly_forecasts`. Exporters: `lib/schemePdf.js`, `lib/schemeDocx.js`.

### Lesson plans — `/portal/plans` (+ `/new`, `/:id`, `/:id/edit`)
`LessonPlans.jsx`, `LessonPlanForm.jsx`, `LessonPlanView.jsx`. Indicator-linked
(`indicatorIds[]`) plans; public/private. Export to PDF/DOCX.
Collection: `lesson_plans`. Exporters: `lib/lessonPlanPdf.js`, `lib/lessonPlanDocx.js`.

## Questions

### Question bank — `/portal/questions` (+ `/new`, `/:id/edit`)
`QuestionBank.jsx`, `QuestionForm.jsx`. Author MCQ/short/essay questions tagged by
subject/strand/sub-strand; carries `weekKey` for the weekly quota.
Collection: `questions`.

### Generators — `/portal/questions/generate` and `/quiz`
`QuestionGenerator.jsx` (builds a printable exam paper — PDF), `QuizMaker.jsx` (builds a
classroom quiz slideshow — PPTX). Both read the shared `questions` bank.
Exporters: `lib/questionPaper.js`, `lib/quizPptx.js`.

## Wisdom (Quote of the Day) — `/portal/wisdom`; public `/quotes`
`Wisdom.jsx`, `PublicQuotes.jsx`. Daily quote hero + browsable quotes/proverbs and teaching
theories, colour-coded cards, batched/infinite-scroll loading, search, and **shared likes**
(`quote_likes`). Data is static JSON via `useWisdom`. See [shared-code.md](shared-code.md).

## Vacancies — `/portal/vacancies` (+ `/new`, `/:id/edit`); public `/vacancies`
`Vacancies.jsx`, `VacancyForm.jsx`, `PublicVacancies.jsx`. Members post teaching vacancies;
`published` ones are readable publicly (no login). Collection: `vacancies`.

## Slides — `/portal/slides`
`SlideLessons.jsx` (browse). `SlideLessonForm/View` exist but their routes are **commented
out** in `App.jsx` — the authoring flow is not wired up. Collection: `lesson_slides`.

## Subscriptions (SaaS billing) — `/portal/subscription`; admin `/portal/billing`

Phase 1 of the SaaS plan ([saas-gap-analysis.md](saas-gap-analysis.md)).
`Plans.jsx` shows the plan catalogue (Free / Pro / School-coming-soon), the
member's usage meter and the MoMo upgrade request form; `Billing.jsx`
(**admin**) confirms payments, activates/renews (+30 days) and cancels plans.
State lives in `subscriptions/{uid}` ([data-model.md](data-model.md)).

**The export gate:** free members get `FREE_EXPORT_LIMIT` (5) clean downloads
per calendar month, metered by `recordExport()` (`lib/subscriptions.js`) and
enforced in `firestore.rules`. All four download paths go through
`useExportGate()` (`hooks/useExportGate.js`): scheme PDF/Word
(`ForecastView`), lesson-plan PDF/Word (`LessonPlanView`), exam papers
(`QuestionGenerator`) and quiz PPTX (`QuizMaker`). Watermarked agent previews
are exempt — they are free samples in the Deliveries workflow. Payment
collection is manual MoMo for now (same soft-gate philosophy as Deliveries;
webhook automation later). Context: `SubscriptionContext` (`useSubscription`).

## Schools (multi-tenancy) — `/portal/school`; admin `/portal/schools` (+ `/:schoolId`)

Phase 2 of the SaaS plan ([saas-gap-analysis.md](saas-gap-analysis.md)). Each
school is a tenant with its own members and a private content library.

- **Schools** (`Schools.jsx`, platform admin) — create schools, see member
  counts, jump into a workspace. Collections: `schools`, `users`.
- **School workspace** (`SchoolWorkspace.jsx`) — the member's own school (or
  any school for platform admins): member list, add/remove members (managers),
  promote/demote `school_admin` (platform admins), and the school-shared
  schemes/plans/notes.
- **School-scoped content**: schemes & lesson plans gain `visibility: 'school'`
  (forms show a "My school only" option when the author has a `schoolId`);
  notes gain a "Share with my school" action (`status: 'school'`, no approval
  needed). All such docs carry the author's `schoolId`; rules match the
  reader's `users/{uid}.schoolId` against it.
- **Roles**: `school_admin` can set/clear `schoolId` only for their own
  school's members / unassigned approved members (enforced in
  `firestore.rules`); `role`/`status`/`schoolId` are no longer
  self-editable by members. Helpers: `lib/schools.js`.
- **Join codes (2.5)**: managers generate/rotate a school code from the
  workspace (`school_codes/{code}`); school-less members join themselves by
  entering it on their My School page — rules verify the code↔school
  mapping inside the join write.
- **Coverage (2.5)**: `SchoolCoverage.jsx` aggregates members' `progress`
  docs (same-school reads allowed by rules) into a per-subject,
  current-term table: teachers tracking, weeks taught, averages.

## Classrooms & student quizzes (Phase 3) — `/portal/classrooms`; student `/portal/learn`

Teachers run in-app quizzes for pupils:

- **Classrooms** (`Classrooms.jsx`) — create a class (gets a 6-char class
  code), add pupils by name (provisions a synthetic login via a secondary
  Firebase app — `lib/classrooms.js`), see each pupil's access code, and
  review per-quiz averages + the latest results table.
- **Assigning** — the Quiz Maker's "Assign to classroom" (`AssignQuizModal`)
  snapshots the built quiz into `quizzes` for a classroom the teacher owns.
- **Student side** — pupils log in on `/login` (Student mode: class code +
  access code). `ProtectedLayout` confines `role: 'student'` to
  `/portal/learn` inside `StudentLayout`: `Learn.jsx` lists the class's
  quizzes with best scores + recent results; `QuizPlayer.jsx` plays the quiz
  (one question per screen), auto-marks MCQs, shows per-question feedback,
  and writes an immutable `quiz_attempts` row. Short/essay answers are
  collected but left for the teacher.
- Collections: `classrooms`, `quizzes`, `quiz_attempts` ([data-model.md](data-model.md)).

## Utility & admin

- **Search** `/portal/search` (`Search.jsx`) — searches the `questions` bank.
- **Progress** `/portal/progress` (`Progress.jsx`) — personal teaching tracker (`progress`).
- **Calendar** `/portal/calendar` (`Calendar.jsx`); public `/calendar` (`PublicCalendar.jsx`)
  — the Ghana academic calendar (`lib/academicCalendar.js`, pure/static).
- **Profile** `/portal/profile` (`Profile.jsx`) — edit own `users` doc.
- **Members** `/portal/members` (`Members.jsx`, **admin**) — approve/suspend members, set
  roles. Reads/writes `users`.

## Public pages (no login)

`/` Landing, `/vacancies`, `/quotes`, `/calendar`, `/articles` + `/articles/:id`,
`/login`, `/signup`. These read only public/published data (or static JSON), consistent
with `firestore.rules`.
