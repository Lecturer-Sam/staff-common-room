# Records of Work

The third artifact in the chain — and the one that closes the loop.

| Artifact | Tense | Who signs | When |
|---|---|---|---|
| **Scheme of Learning** | Plan | HoD | Start of term |
| **Lesson Plans** | Preparation | Teacher | Weekly |
| **Record of Work** | Log of what was *actually* taught | Headteacher | Weekly, as taught |

A Scheme of Learning is a promise. A Record of Work is the evidence. Headteachers
sign it week by week, and it's the first thing an inspector asks for.

## Why ours is different

A blank Record of Work book gives the teacher ruled lines and nothing else — so
every period has to be written out by hand, every week, for thirty-six weeks.
That's the single most repetitive chore in Ghanaian teaching.

Because the lesson library already knows **what is taught on every day of the
year**, the Record of Work can be **pre-printed** with the curriculum reference
and activity summary for all 180 periods, leaving the teacher only the two things
that genuinely must be handwritten:

- **DATE**
- **EVALUATION / REMARKS**

Everything else — strand, sub-strand, content standard, indicator, learning
outcome, activities, resources — is already there, correct and NaCCA-coded.

## Generate

```bash
python3 tools/generate_records_of_work.py                 # all 73
python3 tools/generate_records_of_work.py --per-term      # + 219 term ledgers
python3 tools/generate_records_of_work.py --grade B4      # one grade
```

## Output (`dist/records/`, gitignored — rebuild on demand)

| Path | Count |
|---|---|
| `docx/Record_of_Work_{Subject}_Basic{N}.docx` | 73 full-year ledgers |
| `docx/terms/…_Term{1-3}.docx` | 219 per-term ledgers |
| `json/{subjectId}_{grade}_record.json` | 73 (for a future in-app module) |

**365 documents**, ~29 MB.

## Format

Landscape Letter, 0.5" margins, 6.5pt table text — sized to print and bind as a
ledger book.

| DATE | DAY | WK | LES | STRAND / SUB-STRAND | CONTENT STANDARD & INDICATOR | LEARNING OUTCOME(S) | ACTIVITIES UNDERTAKEN | T / L RESOURCES | EVALUATION / REMARKS |
|---|---|---|---|---|---|---|---|---|---|

- Each week opens with a shaded **"WEEK n — Week Ending: __________"** separator
  row, so the headteacher signs week by week.
- Each term ends with signature lines for **class teacher** and **headteacher**.
- 73 rows per term: 12 week separators + 60 teaching days.

## Verification

`dist/records/QA_REPORT.md` — **73/73 OK**, 13,140 teaching days across 2,628
weeks, **0 rows missing a learning outcome**, and every one of the 13,140 lessons
in the library appears as a ledger row.

The generator also **asserts that the column widths sum to the usable page
width**. An over-wide table is the easiest thing in the world to ship: it looks
fine on screen and silently runs off the printed page. (This caught a real 11"
table on a 10" page during development.)

## Design decisions

1. **DATE and EVALUATION / REMARKS are left blank deliberately.** They are the
   only fields a machine cannot know — when the lesson actually happened, and how
   it went. Pre-filling them would make the document dishonest.

2. **Activities are summarised, not dumped.** Each period shows the first two
   Main activities and the first Plenary line, truncated to fit. The full text
   lives in the lesson plan; the ledger needs enough to jog memory, not a
   reprint.

3. **Learning outcomes are de-boilerplated.** The stored performance indicator
   reads *"By the end of the lesson, learners will be able to: …"* — the prefix
   is stripped on every one of 180 rows, which saves the teacher reading it
   180 times.

4. **One row per teaching day, not per week.** That's the granularity a Record
   of Work is actually kept at, and it's what makes weekly signing meaningful.

## Not yet wired into the app

`json/*.json` is produced so an in-app Record of Work module can be built later
(tick off periods as taught, roll up into the coverage dashboard). Nothing
consumes it yet — the app still has no Record of Work feature.
