# 2. Data model

Two data sources:

1. **Firestore** — all user/member content (dynamic).
2. **Static JSON** in `public/` — the NaCCA curriculum and the quotes (read-only, shipped
   with the app, cached offline).

> Field lists below name the **important** fields. The authoritative shape for each
> collection is whatever its create/edit form writes — the "written by" file is the source
> of truth. Every document also carries `authorId`, `authorName`, and server timestamps
> unless noted.

## Firestore collections

| Collection | Purpose | Written by | Rule |
|---|---|---|---|
| `users/{uid}` | Member profile & status | `SignUp`, `Profile`, `Members` (admin) | ✅ |
| `posts/{id}` | Community feed posts | `Feed` | ✅ |
| `articles/{id}` | Longform articles (WYSIWYG) | `ArticleForm` | ✅ |
| `notes/{id}` (+`comments`) | Study notes | `NoteForm`, `NoteView` | ✅ |
| `weekly_forecasts/{id}` | Schemes of learning | `ForecastForm` | ✅ |
| `lesson_plans/{id}` | Lesson plans | `LessonPlanForm` | ✅ |
| `questions/{id}` | Question bank | `QuestionForm` | ✅ |
| `lesson_slides/{id}` (+`comments`) | Slide lessons | `SlideLessonForm` | ✅ |
| `vacancies/{id}` | Teaching vacancies | `VacancyForm` | ✅ |
| `schools/{id}` | Tenants (Phase 2 multi-tenancy) | `Schools` (admin create) | ✅ |
| `school_codes/{code}` | Self-service school join codes | `SchoolWorkspace` managers | ✅ |
| `classrooms/{id}` | Teacher's pupil groups (Phase 3) | `Classrooms` | ✅ |
| `quizzes/{id}` | Quizzes assigned to a classroom | `AssignQuizModal` (Quiz Maker) | ✅ |
| `quiz_attempts/{id}` | Immutable student quiz results | `QuizPlayer` | ✅ |
| `subscriptions/{uid}` | SaaS plan + export meter | `Plans`, `Billing` (admin), `recordExport` | ✅ |
| `progress/{uid}` | Per-member teaching tracker | `Progress`, `Feed` | ✅ |
| `quote_likes/{quoteId}` | Shared likes on quotes | `useWisdom` | ✅ |

> All collections are enforced by [`firestore.rules`](../firestore.rules) — read
> [security.md](security.md) alongside this.

### `users/{uid}`
Key fields: `name`, `status` (`'pending' | 'approved' | 'suspended'`),
`role` (`'member' | 'school_admin' | 'admin' | 'student'`), plus profile bits
(`school`, etc.). Student profiles (Phase 3) also carry `classroomId` and
`accessCode`, and are created `approved` by the provisioning flow.
- Created at sign-up (`SignUp.jsx`) as `pending`. An admin flips `status`/`role` in
  `Members.jsx`. The current user's profile is streamed live by `AuthContext`.
- **Phase 2:** `schoolId` links the member to a `schools` tenant (null/absent =
  network-only member). Only platform admins and the member's own school admin
  may change it (rules); self-service profile edits can no longer touch
  `role`/`status`/`schoolId`. `school_admin` manages membership of their own
  school from `SchoolWorkspace.jsx`.

### `posts/{id}` — feed
`content`, `timestamp`, `likesCount`, `likedBy[]`. Any approved member may like/unlike
(rules restrict the diff to `likedBy` + `likesCount`); only the author can edit content.

### `articles/{id}` — articles
`title`, `content` (HTML from Tiptap), `excerpt` (first 200 chars, stripped),
`category`, `subjectId`, `visibility` (`'public' | 'members'`), `likesCount`, `likedBy[]`.
Public ones surface on `/articles` and `PublicArticleView`.

### `notes/{id}` (+ `comments/{id}`)
`status` (`'private' | 'pending' | 'published' | 'school'`), `likes`, `dislikes`, content.
Private → visible to author/admin only; `published` → network-wide; `'school'` → members
of the author's school, without admin approval (carries `schoolId`; Phase 2). Approved
members may like/dislike (rules restrict the diff to `likes` + `dislikes`). Has a
`comments` subcollection.

### `weekly_forecasts/{id}` — schemes of learning
`kind: 'scheme'`, `subjectId`, `grade`, `term`, `rows[]` (per-week strand/sub-strand/
content-standards/indicators/resources/indicatorIds), `notes`,
`visibility` (`'public' | 'private' | 'school'`). Public schemes are a shared library; a
member can clone one as a template (`?from=<id>` in `ForecastForm`).
`visibility: 'school'` docs also carry the author's `schoolId` and are readable only by
that school's members (Phase 2). `lesson_plans` follow the identical model.

### `lesson_plans/{id}`
`visibility` (`'public' | 'private' | 'school'` — see `weekly_forecasts`), `indicatorIds[]`
(for curriculum-linked lookups — indexed), plan phases/content. Indexed on
`visibility+createdAt`, `authorId+createdAt`, and `indicatorIds` (array-contains) combos.

### `questions/{id}` — question bank
`subjectId`, `grade`, `strandName`, `subStrandName`, `type` (`'mcq' | 'short' | 'essay'`),
question/options/answer/marks, and **`weekKey`** (ISO week — drives the weekly quota
reminder on the Feed; indexed `authorId+weekKey`). Consumed by the generators
(`QuestionGenerator`, `QuizMaker`) and `Search`.

### `lesson_slides/{id}` (+ `comments`)
`status` (`'published'` gates public-ish reads within the network). Slide **authoring UI
is disabled** (routes commented out) — the browse page exists. See [gotchas.md](gotchas.md).

### `vacancies/{id}`
`status` (`'published'` is readable **without auth** — powers the public `/vacancies`
page), `deadline`, school/role details.

### `schools/{id}` — tenants (Phase 2)
`name`, `location`, `createdAt`, `createdBy`. Identity only — membership lives on
`users/{uid}.schoolId`, not here. Platform admins create/update/delete (the `Schools`
page); approved members may read (workspace header). Management UI:
`SchoolWorkspace.jsx` at `/portal/school` (own school) and
`/portal/schools/:schoolId` (admins).

### `classrooms/{id}` — pupil groups (Phase 3)
`name`, `subjectId`, `grade`, `teacherId`, `schoolId`, `joinCode` (6-char class code),
`archived`. Created by teachers on the `Classrooms` page. Pupils are Firebase Auth
users provisioned by the teacher with **synthetic emails**
`<joincode>-<accesscode>@students.beacon-consult.app` (see `lib/classrooms.js`);
their profile is `users/{uid}` with `role: 'student'`, `classroomId`, and the
`accessCode` (kept so teachers can recover it). Students log in on `/login`
("Student" mode) with class code + access code — no email needed.

### `school_codes/{code}` — self-service join (Phase 2.5)
Doc id IS the code (8-char, large alphabet). `{ schoolId, createdAt }`. Knowing the
code is the proof of membership: a member with no school embeds the code in the write
that sets their `schoolId` (rules verify the mapping), and the client strips it
immediately afterwards (`lib/schools.js: joinSchoolWithCode`). Managers
generate/rotate codes from the school workspace (old code doc is deleted on rotation).
`get` by known code is open to approved members; `list` is admin-only so codes can't
be enumerated.

### `quizzes/{id}` — assigned quizzes
`title`, `subjectId`, `grade`, `classroomId`, `authorId`, and `questions[]`
**snapshotted** from the bank at assign time (`question`, `type`, `options`,
`answer`, `marks`). Written by `AssignQuizModal` from the Quiz Maker; rules
verify the creator owns the target classroom. Students of the classroom read.

### `quiz_attempts/{id}` — student results
`quizId`, `classroomId`, denormalised `teacherId`/`studentId`/`studentName`/
`schoolId`, `score` (auto-marked MCQs), `total` (# of MCQs), `answered`,
`answers` (map of question index → student answer, incl. free text),
`grades` (map of question index → teacher-awarded marks for written answers),
`completedAt`. Students create their own; teachers read via `teacherId` and may
update ONLY `grades`; only admins delete. Retakes = new docs; the UI shows the
best score.

### `subscriptions/{uid}` — SaaS billing ledger
One doc per member (doc id = uid). Fields:
- `planId` (`'free' | 'pro' | 'school'`), `status` (`'none' | 'requested' |
  'active' | 'cancelled' | 'rejected'`)
- `exports` `{ month: 'YYYY-MM', count }` — free-tier download meter
  (`FREE_EXPORT_LIMIT` in `lib/subscriptions.js`, mirrored in the rules)
- Upgrade-request fields: `momoNumber`, `paymentRef`, `requestedAt`,
  denormalised `name`/`email`; activation fields: `activatedAt`, `renewsAt`,
  `activatedBy`

Lifecycle: member pays via MoMo out-of-band, submits the reference on
`/portal/plans` → `requested` → admin confirms on `/portal/billing` → `active`
(+30 days `renewsAt`). Manual loop by design — see
[deliveries-roadmap.md](deliveries-roadmap.md) for when this becomes a
gateway webhook. Clean exports are metered by `recordExport()` after each
download; watermarked agent previews are exempt. The meter increment and the
free-plan cap are **rules-enforced**; plan activation is admin-only.
Read live by `SubscriptionContext` (`useSubscription()`).

### `progress/{uid}`
Owner-only (`write`); reads are also open to members of the owner's school so the
school workspace can aggregate curriculum coverage (Phase 2.5). Shape:
`{ weeks: { '<subjectKey>_T<term>': [...] } }`.
Feed summarises it into a "subject-weeks taught" banner; `Progress.jsx` is the full
tracker.

### `quote_likes/{quoteId}`
`{ count, likedBy[] }`, created on first like. Members toggle only their own uid; the rule
enforces `count` moves ±1 in step. Read live across the collection by `useQuoteLikes()`
(feeds the Quotes page hearts + the Feed "most-loved" leaderboard). Quote ids come from the
static `quotes.json` — there is **no** `quotes` document collection.

## Static JSON (`public/`)

### Curriculum — `public/curriculum/`
Per grade **KG1, KG2, B1…B9** (`grades.json` lists them):
- `<grade>_subjects.json` — subjects for the grade (`id`, `name`, `hasSchedule`, …)
- `<grade>_indicators.json` — flat indicators (strand → sub-strand → content standard →
  indicator), grouped in memory by `buildTree()` in `useCurriculum.js`
- `<grade>_schedules.json` — optional day-by-day scheduled lessons (used to pre-fill
  schemes)

Loaded via `useCurriculum(grade)` / `useSchedules(grade)` / `useGrades()` with
module-level caches. Also **precached by the service worker** for offline use.

### Quotes — `public/quotes/`
- `quotes.json` — famous education quotes + Ghanaian/Adinkra proverbs
  (`id`, `type`, `text`, `author`, `source?`, `meaning?`, `tags[]`)
- `theories.json` — teaching theories (`id`, `title`, `theorist`, `definition`,
  `classroom` [Ghana application], `category`, `tags[]`)

Loaded by `useWisdom.js`. The daily quote / weekly theory are chosen **deterministically
by local date** (see [pwa-offline.md](pwa-offline.md)).

## Composite indexes (`firestore.indexes.json`)

Defined for `posts`, `lesson_plans` (4), `weekly_forecasts` (2), `questions`,
`lesson_slides` (2), `vacancies` (2), `notes` (2). `articles` needs **no composite index**:
its queries are single-field equality (`where('visibility'/'authorId','==',…)`) with
client-side sorting, which Firestore's automatic single-field indexes already cover.
