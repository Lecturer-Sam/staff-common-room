# App curriculum data — `app/public/curriculum/`

The Beacon app serves the NaCCA curriculum as **static JSON** (no Firestore reads)
and precaches it for offline use. Until now only **Basic 1** existed —
`app/seed/build_curriculum.py` generates B1 alone, and the docs noted
*"more grades (Nursery–B9) will be added"*.

That gap is closed. All grades are now generated from the repo's full dataset,
plus a new file the app didn't have: **pre-generated Schemes of Learning**.

## Generate

```bash
python3 tools/build_app_curriculum.py              # all grades
python3 tools/build_app_curriculum.py --grade B4   # one grade
```

Reads `*_curriculum_db_clean.json` (indicators) and `*_lessons_enriched.json`
(schedules) from the repo root, falling back to `app/data/` for the few DB files
that live only there (computing/french B4–B6, KG1/KG2, english-language B5).

## Output

43 files, **11 grades** (KG1, KG2, B1–B9), **84 subject-grades**,
**4,040 indicators**, **13,140 scheduled lessons**.

| File | Contents |
|---|---|
| `grades.json` | One entry per grade: `{ id, name, available, subjects, indicators, hasSchedules[] }` |
| `<grade>_subjects.json` | `{ id, name, grade, sourceTitle, sourceUrl, hasSchedule, counts{strands,subStrands,standards,indicators} }` |
| `<grade>_indicators.json` | Flat indicators: `{ id, code, grade, subjectId, subjectName, strandNumber, strandName, subStrandNumber, subStrandName, contentStandardCode, contentStandardDescription, description, competencies, resources, keywords, assessment }` |
| `<grade>_schedules.json` | Every scheduled lesson: term/week/day + **starter / main / plenary** + rpk, performance indicator, assessment |
| `<grade>_schemes.json` | **NEW** — `{ grade, teachingWeeksPerTerm, subjects: { [subjectId]: { [term]: rows[] } } }` |

All shapes match what `useCurriculum.js`, `buildTree()` and `ForecastForm`
already expect, so the app reads them **with no loader changes**.

## What's new in the app

**`app/src/hooks/useSchemes.js`** — loads `/curriculum/<grade>_schemes.json`
(module-level cache, one fetch per grade) and returns the rows for one
subject/term:

```js
const official = useSchemes(grade, subjectId, term)
// -> { loading, available, rows }
```

**`ForecastForm.jsx`** now shows a **"📋 Load official scheme"** button beside the
existing "✨ Auto-fill weeks from curriculum", whenever a scheme exists for the
selected subject and term.

The difference matters:

| | Auto-fill (`schemeAuto.js`) | Load official scheme |
|---|---|---|
| Method | Spreads content standards evenly across the term | Reads the weeks the lesson library actually teaches |
| Matches lesson plans? | No — independent estimate | **Yes, by construction** |
| Teaching weeks | 10/11/11 (app convention) | 12 (as scheduled in the lessons) |

Both respect existing content — if the grid already has weeks, you get a
confirm prompt first, and special rows (REVISION / EXAMINATION / VACATION) are
preserved.

## Verified

- Every `indicatorIds` entry in every scheme resolves to a real indicator in
  that grade's `<grade>_indicators.json` — **0 orphans**
- 73/73 subject-grades with lessons reach **100% curriculum coverage**
- All 13,140 lessons are scheduled; no empty weeks
- Row shape is a superset of what `ForecastForm` consumes

## Size — read before deploying

**~38 MB total**, dominated by schedules (33 MB), because each scheduled lesson
carries its full `starter` / `main` / `plenary` text. That text *is* the product
(it powers lesson-plan pre-fill), so it isn't trimmed.

The loader already fetches **one grade at a time**, so a user downloads ~3–5 MB
for their grade, once, then it's cached by the service worker. That's acceptable
on Ghanaian mobile data but worth watching.

If it becomes a problem, in order of preference:

1. **Split schedules per subject-grade** (`b4_schedules_mathematics.json`) and
   fetch on demand — biggest win, needs a small loader change.
2. Precache only the current grade rather than all grades (check `sw.js` /
   `registerSW.js` — the docs say curriculum is precached).
3. Drop `contentStandardDescription` / `indicatorDescription` from schedules
   (derivable from indicators) — ~5 MB, but `LessonPlanForm.jsx` reads them
   directly, so it needs a code change.

## Still missing

- No `public/manifest.webmanifest`, icons, or `beaconlogo.png` — `index.html`
  references them and they aren't in the bundle.
- No question bank content (the collection is user-generated and empty).
- KG1/KG2 have indicators but no scheduled lessons or schemes.
