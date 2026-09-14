# Beacon Educational Consult — Architecture & Structure

A map of what exists today (commit `8ba94bf`), what the data model looks
like, and how the repository could be restructured.

Diagrams are Mermaid — GitHub renders them inline.

---

## 1. Data model — Firestore (runtime)

15 collections. This is what the live app reads and writes.

```mermaid
erDiagram
    USERS ||--o{ USERS : "provisions (teacher → pupil)"
    SCHOOLS ||--o{ USERS : "employs"
    SCHOOLS ||--o{ CLASSROOMS : "owns"
    USERS ||--o{ CLASSROOMS : "teaches"
    CLASSROOMS ||--o{ QUIZZES : "assigned to"
    CLASSROOMS ||--o{ QUIZ_ATTEMPTS : "taken in"
    QUIZZES ||--o{ QUIZ_ATTEMPTS : "produces"
    USERS ||--o{ QUIZ_ATTEMPTS : "sits"
    USERS ||--o{ LESSON_PLANS : "authors"
    USERS ||--o{ WEEKLY_FORECASTS : "authors"
    USERS ||--o{ NOTES : "authors"
    USERS ||--o{ QUESTIONS : "contributes"
    USERS ||--o{ ARTICLES : "authors"
    USERS ||--o{ VACANCIES : "posts"
    USERS ||--o{ GENERATED_MATERIALS : "generates"
    SCHOOLS ||--o{ GENERATED_MATERIALS : "scoped to"
    SCHOOLS ||--o{ SUBSCRIPTIONS : "holds"
    USERS ||--o{ DELIVERIES : "agent for"

    USERS {
        string uid PK
        string name
        string email
        string role "member / admin / student"
        string status "pending / approved / suspended"
        string schoolId FK
        string classroomId FK "pupils only"
        string accessCode "pupils only — doubles as password"
    }
    SCHOOLS {
        string id PK
        string name
        string location
        string createdBy FK
    }
    CLASSROOMS {
        string id PK
        string name
        string teacherId FK
        string schoolId FK
        string joinCode "6 chars"
        string grade
        string subjectId
        bool archived
    }
    QUIZZES {
        string id PK
        string classroomId FK
        string authorId FK
        string title
        json questions "snapshot at assign time"
    }
    QUIZ_ATTEMPTS {
        string id PK
        string quizId FK
        string studentId FK
        string classroomId FK
        int score
        int total
        json answers
        json grades "teacher's written marks"
    }
    GENERATED_MATERIALS {
        string id PK
        string authorId FK
        string schoolId FK
        string kind "scheme / record / lesson plan"
        string grade
        string subject
        string term
        string filename
        bool isZip
    }
    LESSON_PLANS {
        string id PK
        string authorId FK
        string contentStandardCode
        json content
    }
    QUESTIONS {
        string id PK
        string authorId FK
        json body
    }
    SUBSCRIPTIONS {
        string id PK
        string schoolId FK
        string status
        date renewsAt
    }
```

### Known weak points in this model

| Issue | Where | Why it matters |
|---|---|---|
| `accessCode` is the pupil's **password**, stored in plaintext | `users` | Readable by anyone who can read the collection |
| `Classrooms.jsx` queries **all** pupils, no classroom filter | `users` | Cross-tenant leak + every teacher downloads the whole table |
| `generated_materials` records metadata but **not the file** | `users`/`schools` | No re-download; history is a receipt, not a library |
| `quizzes.questions` is a snapshot, `questions` is a live bank | `quizzes` | Two sources of truth for question content |

---

## 2. Data model — curriculum (static, in-repo JSON)

This is the asset. It does not live in Firestore; it is built into the app
at deploy time.

```mermaid
erDiagram
    SOURCE_PDF ||--o{ RAW_TEXT : "extracted to"
    RAW_TEXT ||--o{ CURRICULUM_DB : "parsed into"
    CURRICULUM_DB ||--o{ CONTENT_STANDARD : "contains"
    CURRICULUM_DB ||--o{ INDICATOR : "contains"
    CURRICULUM_DB ||--o{ LESSON : "schedules"
    INDICATOR ||--o{ LESSON : "tagged on"

    SOURCE_PDF {
        string file "24 NaCCA PDFs"
        string band "B1-B3 / B4-B6 / B7-B9"
    }
    CURRICULUM_DB {
        string file "75 *_curriculum_db_clean.json"
        string subject "13 subjects"
        string grade "B1–B9"
    }
    INDICATOR {
        string code PK "e.g. B4.1.1.1.1"
        string cs_code FK
        string strand
        string sub_strand
        string ind_desc
        string competencies
    }
    CONTENT_STANDARD {
        string cs_code PK "e.g. B4.1.1.1"
        string cs_desc
    }
    LESSON {
        int lesson_num "1–180"
        int term "1 / 2 / 3"
        int week
        string day
        int strand_num
        string strand_name
    }
```

### Verified counts

| Metric | Count | Source |
|---|---|---|
| Lesson objects | **13,140** | 73 `*_lessons_enriched.json` |
| Subject-grade books | **73** | one per grade × subject |
| Indicators served by the app | **4,040** | `tools/build_app_curriculum.py` |
| Curriculum DB files | **159** | 75 at root + 84 in `app/data/` |
| Grades served | **11** | KG1, KG2, B1–B9 |
| Source PDFs | **24** | root |

> **On the 4,040 figure** — it is correct. It comes from
> `tools/build_app_curriculum.py`, which counts indicator records per grade
> across all 11 grades. Counting *unique codes* in the source databases
> yields 2,519, a smaller number only because the same code legitimately
> recurs across subject-grades. 4,040 is what the app actually serves, so
> it is the honest figure for any claim about the library.

> ⚠️ **Curriculum data lives in two places.** 75 `*_curriculum_db_clean.json`
> files sit at the repo root and 84 more in `app/data/`. `DB_SEARCH` in
> `tools/generate_schemes.py` searches both. This is the single most
> important fact to know before moving any data — a restructure that moves
> only the root files will silently drop the KG grades and several subjects.

---

## 3. Pipeline — how a document gets made

```mermaid
flowchart TD
    A["NaCCA PDF (24)"] -->|"parse_*.py / extract_*.py"| B["raw text (12 .txt)"]
    B -->|"build_clean_*_curriculum_db.py"| C["curriculum_db_clean.json (75)"]
    B -->|"generate_*_lessons / backfill_*"| D["lessons_enriched.json (73)"]
    C --> E{"tools/build_app_curriculum.py"}
    D --> E
    E -->|"app/public/curriculum/ **gitignored**"| F["React app (app/)"]

    D -->|"tools/generate_schemes.py"| G["Scheme of Learning (73)"]
    D -->|"tools/generate_records_of_work.py"| H["Record of Work (365)"]
    D -->|"build_*_word_document.py (79)"| I["Lesson plan books (73)"]
    C -->|"QA"| J["audit_*.py (24)"]

    F -->|"HTTP :8080"| K["Material Service (service/main.py)"]
    K -->|"python-docx"| L[".docx download"]
    F -->|"record"| M["Firestore: generated_materials"]

    style F fill:#e0e7ff
    style K fill:#dcfce7
    style M fill:#fef3c7
```

Two runtimes:

| Runtime | Stack | Job |
|---|---|---|
| **Studio** (offline, this repo) | Python + python-docx | Parse curricula, build the library, emit books |
| **Portal** (live) | React + Vite + Firestore | Serve teachers, generate on demand |

The Material Service exists because the browser cannot run `python-docx`.
It is the seam between the two.

---

## 4. Repository structure today

986 tracked files:

| Location | Files | Share |
|---|---:|---:|
| **repo root** | **464** | **47%** |
| `app/` | 499 | 51% |
| `docs/` | 9 | 1% |
| `tools/` | 7 | 1% |
| `service/` | 4 | — |
| `sales/`, `marketing/` | 3 | — |

The root pile, broken down:

| Category | Count | Verdict |
|---|---:|---|
| `*.json` data | 233 | **should be under `data/`** |
| `build_*.py` book generators | 79 | **should be under `tools/`** |
| `audit_*.py` + results | 24 | **should be under `tools/`** |
| `*.pdf` source curricula | 24 | **should be under `data/source/`** |
| `generate_*.py` | 23 | **should be under `tools/`** |
| `backfill_*.py` | 16 | **should be under `tools/`** |
| `parse_*`/`extract_*.py` | 17 | **should be under `tools/`** |
| One-off scratch scripts | 28 | **should be deleted** |
| `*.txt` raw PDF dumps | 12 | **should be under `data/`** |
| `*.docx` built books | 2 | **moved out already** |
| `*.md` | 4 | keep |

Those 28 scratch scripts are extraction debris (none is imported by any
other script — verified):
`print_page6.py`, `print_page10.py`, `print_page11.py`,
`print_page1_text.py`, `inspect_math.py`, `inspect_math_parsed.py`,
`read_notes.py`, `read_math_notes.py`, `scan_cells.py`,
`test_parse.py`, `test_parse_math.py`, `test_structure.py`, …

---

## 5. Is restructuring possible?

**Yes — and it is safe, because git tracks content, not folders.**

`git mv` records a rename. History follows the file. Nothing is lost, no
commit is rewritten, and every existing pointer (branch, tag, PR) keeps
working. The risk is not to history — it is to **paths hardcoded in code**.

### What actually breaks

The 79 `build_*.py` scripts, 17 parser scripts and 23 generators read and write
sibling paths at the repo root. Move the JSON and they all break.

Mitigation: give the data layer **one** module that resolves paths, and
have every script import it. Then the move is a one-line change.

```python
# data/paths.py
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SOURCES = DATA / "sources"      # the 24 PDFs
RAW     = DATA / "raw"          # the 12 .txt dumps
DB      = DATA / "curriculum"   # the 75 *_curriculum_db_clean.json
LESSONS = DATA / "lessons"      # the 73 *_lessons_enriched.json
```

### Target structure

```
staff-common-room/
├── app/                        # React portal (unchanged)
├── service/                    # Material Service (unchanged)
├── tools/                      # every .py in the repo
│   ├── generators/             #   build_*.py (79)
│   ├── parsers/                #   parse_*.py, extract_*.py (17)
│   ├── backfill/               #   backfill_*.py (16)
│   ├── audit/                  #   audit_*.py (24)
│   ├── generate_schemes.py
│   ├── generate_records_of_work.py
│   └── build_app_curriculum.py
├── data/                       # every .json / .pdf / .txt
│   ├── paths.py                #   single source of truth for paths
│   ├── sources/                #   24 NaCCA PDFs
│   ├── raw/                    #   12 extracted .txt
│   ├── curriculum/             #   75 *_curriculum_db_clean.json
│   └── lessons/                #   73 *_lessons_enriched.json
├── docs/                       # unchanged
├── sales/  marketing/
├── TODO.md
└── README.md
```

Effect: **464 root files → about 8.**

### Suggested sequence

| Step | Action | Risk |
|---|---|---|
| 0 | Delete the 28 scratch scripts (verify none are imported first) | None — they are dead |
| 1 | Create `data/paths.py` | None |
| 2 | `git mv` the data into `data/` | Low — breaks paths until step 3 |
| 3 | Update the ~154 scripts to import `paths.py` | **Medium — the real work** |
| 4 | `git mv` the `.py` files into `tools/` | Low |
| 5 | Fix imports/relative paths in moved scripts | Low |
| 6 | Regenerate a book + run `tools/validate_app_curriculum.py` | Verification |
| 7 | `yarn build` | Verification |

Steps 0–2 are mechanical and reversible. **Step 3 is the only genuinely
labour-intensive one**, and it can be done script by script, verifying as
you go.

### Recommendation

Do **step 0 now** — deleting 29 dead scratch scripts is free and instantly
makes the repo legible.

Do **not** do steps 1–5 while the sales push is the priority. The
restructure touches ~154 scripts and produces zero revenue. It is worth
doing *because* you will live in this repo for years, but it should happen
in a quiet week, on its own branch, with step 6 as the gate.

The one thing I would fix immediately, regardless: the **4,040 indicator
figure** in `TODO.md`, `docs/APP_CURRICULUM.md` and
`docs/VISUALIZATION_ENGINE.md`. It is wrong, it is in material a school
could read, and it is a two-minute correction.
