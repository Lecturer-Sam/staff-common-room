# Beacon Educational Consult — Lesson Plan Library
### Catalogue & Price List 2026/2027

**73 volumes · 13,140 fully-written daily lesson plans · Basic 1 to Basic 9 · 13 subjects**
Every volume aligned to the NaCCA Standards-Based Curriculum and cross-checked against the
official NaCCA source PDFs.

---

## What's inside every volume

Each volume contains **180 complete daily lesson plans** — 36 weeks × 5 days, across
3 terms — in the national GES/NaCCA format:

| Section | Detail |
|---|---|
| Header block | Week ending · Day/Date · Class · Class size · Duration · References |
| Curriculum anchors | Strand · Sub-strand · **Content Standard** (e.g. `B4.1.1.1`) · **Indicator** (`B4.1.1.1.1`) |
| Lesson framing | Performance indicator · Core Competencies · Keywords · T/L Resources · Relevant Previous Knowledge |
| **Phase 1 — Starter** | 5 minutes, fully scripted |
| **Phase 2 — Main** | 20 minutes, 4 sequenced activities (Concrete → Guided → Pictorial → Abstract) |
| **Phase 3 — Plenary** | 5 minutes, including homework and a link to the next lesson |
| Assessment | Class exercises · oral questions · practical performance · SBA |
| Teacher's Reflection | Structured prompts + signature and HoD vetting lines |

**Delivered as editable Word (`.docx`)** — teachers adapt, not just print.

---

## Price list — Teachers (individual, digital)

| SKU | Contents | Volumes | Lessons | Price |
|---|---|---|---|---|
| `LP-{Grade}-{SUBJ}` | Single volume, one subject, one grade | 1 | 180 | **GHS 60** |
| `BND-{Grade}-ALL` | Complete year for one grade | 7–10 | 1,260–1,800 | **GHS 300** |
| `BND-{SUBJ}-ALL` | One subject across all grades | 1–9 | 180–1,620 | **GHS 400** |
| `BND-LIBRARY` | Complete library | 73 | 13,140 | **GHS 1,500** |
| `PRINT-{SKU}` | Any volume, printed & bound | 1 | 180 | **GHS 150–250** |

## Price list — Schools (annual licence) ⭐ recommended

| Plan | Contents | Price / yr |
|---|---|---|
| **Starter** | 1 campus · 10 teacher seats · full 73-volume library + Schemes of Learning | **GHS 2,000** |
| **Standard** | 1 campus · unlimited seats · + curriculum coverage dashboard + question bank | **GHS 4,500** |
| **Chain** | 3+ campuses · central reporting · onboarding & teacher training | **from GHS 12,000** |

> Pricing is a **starting framework**, not a validated fact. Test with five pilot schools
> and adjust before printing.

---

## The library at a glance

| Subject | Grades | Volumes | Lessons |
|---|---|---|---|
| Mathematics | B1–B9 | 9 | 1,620 |
| English Language | B1–B9 | 9 | 1,620 |
| Science | B1–B9 | 9 | 1,620 |
| Ghanaian Language | B1–B9 | 9 | 1,620 |
| Religious & Moral Education | B1–B9 | 9 | 1,620 |
| History | B1–B6 | 6 | 1,080 |
| Creative Arts | B1–B6 | 6 | 1,080 |
| Career Technology | B7–B9 | 3 | 540 |
| Computing | B7–B9 | 3 | 540 |
| Creative Arts & Design | B7–B9 | 3 | 540 |
| French | B7–B9 | 3 | 540 |
| Social Studies | B7–B9 | 3 | 540 |
| Our World Our People | B1 | 1 | 180 |
| **Total** | | **73** | **13,140** |

### By grade

| Grade | Subjects | Volumes |
|---|---|---|
| **Basic 1** | Creative Arts · English · Ghanaian Language · History · Mathematics · OWOP · RME · Science | 8 |
| **Basic 2–6** | Creative Arts · English · Ghanaian Language · History · Mathematics · RME · Science | 7 each |
| **Basic 7–9** | Career Technology · Computing · Creative Arts & Design · English · French · Ghanaian Language · Mathematics · RME · Science · Social Studies | 10 each |

The full SKU-level index is generated at `dist/MANIFEST.md`
(rebuild any time with `python3 tools/package_books.py`).

---

## Bundles

Bundles are built automatically into `dist/bundles/`:

```
dist/bundles/grade/    Basic1_Complete_8_volumes.zip   … Basic9_Complete_10_volumes.zip
dist/bundles/subject/  Mathematics_9_volumes.zip       … Social-Studies_3_volumes.zip
dist/bundles/library/  Beacon_Complete_Library_73_volumes.zip   (8.3 MB)
```

---

## How to order (the channel that works in Ghana)

1. **WhatsApp** the SKU or bundle name → confirm → we quote.
2. **Pay by Mobile Money** to the Beacon merchant line → send the reference.
3. **Delivery:** download link by WhatsApp within the hour; printed copies via courier or
   pickup in Accra.
4. **Schools:** we book a 20-minute demo, issue a campus licence, and onboard your staff.

No credit card. No signup wall. No subscription trap for individual teachers — buy once,
own it.

---

## ⚠️ Known gaps — disclose before you sell "complete"

| Gap | Impact |
|---|---|
| **Our World Our People exists for B1 only** | B2–B6 OWOP not produced |
| **History and Creative Arts stop at B6** | Correct per NaCCA structure for those subjects |
| **No KG / nursery volumes in this set** | KG1–KG2 data exists but no lesson books produced |
| **Lesson text is template-generated** | Sound scaffolding, not bespoke expert authorship. Get an editorial pass before approaching premium schools. |

### The B1 conflict — RESOLVED

Basic 1 had two competing versions. **v2 is now canonical:** the four `_v2` volumes
overwrote the v1 filenames and the `_v2` files were deleted. The library is **73 books,
one per grade-subject**.

v2 won on content quality, not cosmetics:

| Subject | v1 | v2 |
|---|---|---|
| **Ghanaian Language** | **540 placeholder strings** — literally printed `"Ghanaian Language Content Standard B1.1.1.1"` where real NaCCA text belongs, across all 180 lessons | **0 placeholders**, real curriculum text |
| Creative Arts | Truncated (`'culture'`) | Full text (+34,808 chars) |
| English | — | Adds assessment detail (+17,888 chars) |
| Mathematics | — | Effectively identical (+41 chars) |

v1's Ghanaian Language book was unsellable as printed.

> An earlier read of this conflict reported a "Session 1 of 3 vs Session 1 of 2"
> difference. That was a false lead — it compared **B4 against B1**. v1 and v2 are
> structurally identical (4,684 paragraphs each). The placeholder text above is the real
> difference.

Script: `python3 tools/promote_b1_v2.py --apply`. Originals remain in git at `c9a186c`.

### Grade-band labels — RESOLVED

**33 books carried the wrong grade band on their title page.** B4–B6 read
`Lower Primary` (should be **Upper Primary**); B7–B9 carried a spurious trailing
`· Lower Primary`. Correct bands are KG1–KG2 Kindergarten · **B1–B3 Lower Primary** ·
**B4–B6 Upper Primary** · **B7–B9 JHS 1–3**.

Script: `python3 tools/fix_grade_band_labels.py --apply`. Now verified **73/73 correct**,
and a placeholder sweep confirms **0 of 73 books** contain placeholder text. Newly
generated Schemes of Learning and Records of Work always used the correct bands.

---

## Licence terms (single teacher / school)

- **Individual purchase:** perpetual licence for one teacher. Edit freely for your own
  classes. Do not redistribute or resell.
- **School licence:** covers every teacher on the named campus for the subscription year.
  Covers internal adaptation, printing, and sharing within that campus only.
- **Attribution:** derived from the NaCCA Standards-Based Curriculum; lesson text and
  compilation © Beacon Educational Consult.

> The curriculum standards themselves are public documents. What you are selling is the
> **authored lesson content, the compilation, and the tooling** — not the standards.

---

## Schemes of Learning — now available ⭐

**The recurring product.** Every teacher must submit one every term.

| SKU | Contents | Price |
|---|---|---|
| `SOL-{Grade}-{SUBJ}-T{term}` | One term, one subject-grade | **GHS 40** |
| `SOL-{Grade}-{SUBJ}` | Full year (3 terms), one subject-grade | **GHS 100** |
| `SOL-{Grade}-ALL` | All subjects, one grade, full year | **GHS 400** |
| `SOL-LIBRARY` | Complete library — 73 subjects × 3 terms | **GHS 1,800** |

**Bundle:** lesson plans + schemes for one grade — **GHS 350** (save GHS 50).
**Included free** with every school licence (Starter, Standard and Chain).

- 73 full-year books + 219 individual term documents · landscape, six national
  columns (`WEEKS · STRAND · SUB-STRANDS · CONTENT STANDARD · INDICATORS ·
  RESOURCES`) · REVISION / EXAMINATION / VACATION block each term
- **Derived from the lesson library, not invented** — every row matches the
  lessons taught that week, so the scheme and the lesson plans never contradict
- **73/73 subject-grades at 100% curriculum coverage** — every indicator in every
  curriculum database is scheduled somewhere in the year
- Regenerate any time: `python3 tools/generate_schemes.py --per-term`
- Details: [`docs/SCHEMES_OF_LEARNING.md`](../docs/SCHEMES_OF_LEARNING.md)

## Records of Work — now available ⭐

**The evidence artifact.** A Scheme of Learning is a promise; the Record of Work
is the proof of what was actually taught. Headteachers sign it weekly, and it's
the first thing an inspector asks for.

| SKU | Contents | Price |
|---|---|---|
| `ROW-{Grade}-{SUBJ}-T{term}` | One term, one subject-grade | **GHS 30** |
| `ROW-{Grade}-{SUBJ}` | Full year (3 terms), one subject-grade | **GHS 80** |
| `ROW-{Grade}-ALL` | All subjects, one grade, full year | **GHS 350** |
| `ROW-LIBRARY` | Complete library — 73 subjects × 3 terms | **GHS 1,500** |

**Complete class bundle** — lesson plans + scheme + record of work for one grade:
**GHS 400** (save GHS 110). **All three included free** with any school licence.

- 73 full-year ledgers + 219 per-term ledgers · landscape, 10 national columns ·
  week-by-week signing rows · teacher and headteacher signature blocks
- **Pre-printed from the lesson library** — all 180 periods already carry their
  strand, sub-strand, content standard, indicator, learning outcome, activity
  summary and resources. Only **DATE** and **EVALUATION / REMARKS** are left
  blank, because only the teacher can write those.
- **73/73 verified** — 13,140 teaching days, 2,628 weeks, 0 rows missing a
  learning outcome
- Regenerate: `python3 tools/generate_records_of_work.py --per-term`
- Details: [`docs/RECORDS_OF_WORK.md`](../docs/RECORDS_OF_WORK.md)

## Next products (tell buyers these are coming)

- **Curriculum coverage dashboard** for proprietors
- **Question bank & BECE mock papers** for B7–B9
- **Student quiz app** — offline-first, B7–B9
