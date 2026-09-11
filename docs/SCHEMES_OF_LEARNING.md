# Schemes of Learning

The recurring product. Every Ghanaian teacher must submit a Scheme of Learning
each term — it's the compliance artifact headteachers collect and sign. Unlike
lesson plan books (bought once), schemes are needed **three times a year**.

## Why these schemes are different

They are **derived, not invented**. The 13,140 enriched lesson records already
say exactly what is taught in which week, so `tools/generate_schemes.py` reads
the lesson schedule and writes the scheme from it.

That guarantees the scheme and the lesson plans **never contradict each other** —
which is what makes "the year is already planned" a true statement rather than a
marketing line.

## Generate

```bash
pip install -r requirements.txt

python3 tools/generate_schemes.py                 # all 73 subject-grades
python3 tools/generate_schemes.py --per-term      # + 219 individual term docs
python3 tools/generate_schemes.py --grade B4      # one grade
python3 tools/generate_schemes.py --with-descriptions   # include CS/indicator text
python3 tools/generate_schemes.py --weeks 11      # override teaching weeks/term
```

## Output (`dist/schemes/`, gitignored — rebuild on demand)

| Path | Count | What |
|---|---|---|
| `docx/Scheme_of_Learning_{Subject}_Basic{N}.docx` | 73 | Full-year book, landscape, 3 term tables |
| `docx/terms/…_Term{1-3}.docx` | 219 | One per term, for individual submission |
| `json/{subjectId}_{grade}_scheme.json` | 73 | App-compatible rows |
| `QA_REPORT.md` | 1 | Coverage + anomaly report |

**365 documents**, ~12 MB, generated in about a minute.

## Format

Landscape Letter, the six national columns, matching `src/lib/schemeDocx.js`:

`WEEKS · STRAND · SUB-STRANDS · CONTENT STANDARD · INDICATORS · RESOURCES`

Each term ends with the REVISION / EXAMINATION (/ VACATION) block, following the
convention in `src/lib/schemeAuto.js`.

## App integration

`json/*.json` uses the exact row shape `ForecastForm` and `schemeAuto.js`
already expect, so it can be seeded straight into the `weekly_forecasts`
collection:

```json
{
  "week": "1", "kind": "lesson",
  "strand": "1. NUMBER\n2. ALGEBRA",
  "subStrand": "Sub-strand B4.1.1",
  "contentStandards": "B4.1.1.1",
  "indicators": "B4.1.1.1.1",
  "resources": "NaCCA approved textbook; …",
  "indicatorIds": ["B4.1.1.1.1"]
}
```

Special rows are `{"week": "13", "kind": "special", "label": "REVISION"}`.

## Design decisions — read before changing

1. **Teaching weeks are inferred as 12/term** (the lesson data has 12), *not* the
   app's 10/11/11 convention. This is deliberate: the scheme must agree with the
   lesson plans. Override with `--weeks` if a school needs the shorter block.

2. **A week may span several strands.** The lesson library rotates strands by day
   of week — B4 Mathematics runs Number → Algebra → Geometry → Data across
   Mon–Fri — so one week legitimately lists four strands. This is accurate, not a
   bug. The alternative (strand-blocked weeks, like the printed national sample)
   would contradict the lesson plans.

3. **Indicators are de-duplicated within a week.** An indicator taught over two
   sessions in the same week appears once. So "unique indicators" is legitimately
   below 180 for some subjects (B1 Mathematics: 144).

4. **Codes only by default.** A printed scheme showing full indicator text for
   five indicators a week would not fit the page. Use `--with-descriptions` for a
   verbose internal version.

## Verification

The generator cross-checks every scheme against that subject-grade's
`*_curriculum_db_clean.json` and reports coverage in `QA_REPORT.md`.

**Current status: 73/73 subject-grades at 100% coverage, zero uncovered
indicators, zero empty weeks, and every one of the 13,140 lessons scheduled into
a scheme row.**

Two curriculum DB files exist in `saas-files.zip` but not at the repo root
(`english-language_B5_curriculum_db_clean.json` and
`english-language_B4_curriculum_summary.json`). The generator falls back to the
unpacked reference copy in `.saas-reference/` for those — worth copying them into
the root properly.
