#!/usr/bin/env python3
"""Build grade-based curriculum JSONs for the app from data/ extracts.

Reads (per subject, Basic 1 for now):
  data/<prefix>_curriculum_db_clean.json   - indicators keyed by code, rich fields
  data/<prefix>_curriculum_summary.json    - subject metadata (optional)
  data/<prefix>_lessons_enriched.json      - term/week/day lesson schedule (optional)

Writes:
  public/curriculum/grades.json
  public/curriculum/b1_subjects.json
  public/curriculum/b1_indicators.json
  public/curriculum/b1_schedules.json

Merge rule: Ghanaian Language clean file has placeholder descriptions, so real
descriptions are pulled from the legacy public/curriculum_indicators.json.

Run from repo root:  python3 seed/build_curriculum.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "public" / "curriculum"
OUT.mkdir(parents=True, exist_ok=True)

GRADE = "B1"

# prefix in data/ -> stable subject id (must match existing Firestore refs)
SUBJECTS = {
    "creative_arts": {"id": "creative-arts", "name": "Creative Arts"},
    "english": {"id": "english", "name": "English Language"},
    "ghanaian_language": {"id": "ghanaian-language", "name": "Ghanaian Language"},
    "history": {"id": "history", "name": "History"},
    "math": {"id": "mathematics", "name": "Mathematics"},
    "owop": {"id": "owop", "name": "Our World Our People"},
    "rme": {"id": "rme", "name": "Religious and Moral Education"},
    "science": {"id": "science", "name": "Science"},
}

PLACEHOLDER_RE = re.compile(
    r"^Ghanaian Language (Content Standard|Learning Indicator)\b"
)
PAGE_JUNK_RE = re.compile(r"\s*===\s*PAGE \d+\s*===.*$", re.S)
NUM_NAME_RE = re.compile(r"^\s*(\d+)\s*[.):]?\s*(.*)$")


def clean_text(v):
    if not isinstance(v, str):
        return v
    v = PAGE_JUNK_RE.sub("", v)
    return re.sub(r"\s+", " ", v).strip()


def split_num_name(text, fallback_num):
    """'1. VISUAL ARTS' -> (1, 'VISUAL ARTS'); 'Songs' -> (fallback_num, 'Songs')."""
    m = NUM_NAME_RE.match(text or "")
    if m and m.group(2):
        return int(m.group(1)), m.group(2).strip()
    return fallback_num, (text or "").strip()


def code_parts(code):
    """B1.1.2.3.4 -> (strand 1, sub-strand 2, cs 3, indicator 4). None on mismatch."""
    parts = code.split(".")
    if len(parts) == 5:
        try:
            return tuple(int(p) for p in parts[1:])
        except ValueError:
            pass
    return None


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# Legacy data used for merges/fallback metadata
legacy_subjects = {s["id"]: s for s in load_json(ROOT / "seed" / "legacy_curriculum_subjects.json")}
legacy_indicators = {
    (i["subjectId"], i["code"]): i
    for i in load_json(ROOT / "seed" / "legacy_curriculum_indicators.json")
}

subjects_out, indicators_out, schedules_out = [], [], []

for prefix, meta in SUBJECTS.items():
    sid, sname = meta["id"], meta["name"]
    clean = load_json(DATA / f"{prefix}_curriculum_db_clean.json")

    summary_path = DATA / f"{prefix}_curriculum_summary.json"
    summary = load_json(summary_path) if summary_path.exists() else {}
    legacy = legacy_subjects.get(sid, {})

    strands, sub_strands, standards = set(), set(), set()

    for code, row in clean.items():
        parts = code_parts(code)
        strand_num = parts[0] if parts else 0
        sub_num = parts[1] if parts else 0
        strand_num, strand_name = split_num_name(clean_text(row.get("strand")), strand_num)
        sub_num2, sub_name = split_num_name(clean_text(row.get("sub_strand")), sub_num)
        # trust the code for numbering; text may repeat strand name
        if parts:
            strand_num, sub_num2 = parts[0], parts[1]
        desc = clean_text(row.get("ind_desc"))
        cs_desc = clean_text(row.get("cs_desc"))

        # Ghanaian Language placeholders -> real text from legacy extract
        old = legacy_indicators.get((sid, code))
        if old and PLACEHOLDER_RE.match(desc or ""):
            desc = old["description"]
        if old and PLACEHOLDER_RE.match(cs_desc or ""):
            cs_desc = old.get("contentStandardDescription") or cs_desc

        strands.add(strand_num)
        sub_strands.add((strand_num, sub_num2))
        standards.add(row.get("cs_code") or code.rsplit(".", 1)[0])

        indicators_out.append({
            "id": f"{sid}_{code}",
            "code": code,
            "grade": GRADE,
            "subjectId": sid,
            "subjectName": sname,
            "strandNumber": strand_num,
            "strandName": strand_name,
            "subStrandNumber": sub_num2,
            "subStrandName": sub_name,
            "contentStandardCode": row.get("cs_code") or code.rsplit(".", 1)[0],
            "contentStandardDescription": cs_desc,
            "description": desc,
            "competencies": clean_text(row.get("competencies")) or "",
            "resources": clean_text(row.get("resources")) or "",
            "keywords": clean_text(row.get("keywords")) or "",
            "assessment": clean_text(row.get("assessment")) or "",
        })

    # ---- schedules (math & science for now) ----
    sched_path = DATA / f"{prefix}_lessons_enriched.json"
    has_schedule = sched_path.exists()
    if has_schedule:
        for les in load_json(sched_path):
            code = les["ind_code"]
            ref = clean.get(code, {})
            parts = code_parts(code)
            strand_num, strand_name = split_num_name(
                clean_text(ref.get("strand") or les.get("strand_name")),
                parts[0] if parts else les.get("strand_num", 0),
            )
            _, sub_name = split_num_name(
                clean_text(ref.get("sub_strand") or les.get("sub_strand")), 0
            )
            schedules_out.append({
                "id": f"{sid}_{GRADE}_T{les['term']}_W{les['week']}_{les['day']}",
                "grade": GRADE,
                "subjectId": sid,
                "lessonNum": les.get("lesson_num"),
                "term": les["term"],
                "week": les["week"],
                "day": les["day"],
                "strandName": strand_name,
                "subStrandName": sub_name,
                "contentStandardCode": les.get("cs_code"),
                "contentStandardDescription": clean_text(ref.get("cs_desc") or les.get("cs_desc")),
                "indicatorId": f"{sid}_{code}",
                "indicatorCode": code,
                "indicatorDescription": clean_text(ref.get("ind_desc") or les.get("ind_desc")),
                "isRevision": bool(les.get("is_revision")),
                "sessionTitle": les.get("session_title") or "",
                "performanceIndicator": clean_text(les.get("perf_indicator")) or "",
                "competencies": clean_text(les.get("competencies") or ref.get("competencies")) or "",
                "resources": clean_text(les.get("resources") or ref.get("resources")) or "",
                "keywords": clean_text(les.get("keywords") or ref.get("keywords")) or "",
                "rpk": clean_text(les.get("rpk")) or "",
                "starter": [clean_text(s) for s in les.get("starter") or []],
                "main": [clean_text(s) for s in les.get("main") or []],
                "plenary": [clean_text(s) for s in les.get("plenary") or []],
                "assessment": clean_text(les.get("assessment")) or "",
            })

    subjects_out.append({
        "id": sid,
        "name": summary.get("name") or sname,
        "grade": GRADE,
        "sourceTitle": summary.get("sourceTitle") or legacy.get("sourceTitle") or f"NaCCA {GRADE} {sname} Curriculum",
        "sourceUrl": summary.get("sourceUrl") or legacy.get("sourceUrl") or "",
        "hasSchedule": has_schedule,
        "counts": {
            "strands": len(strands),
            "subStrands": len(sub_strands),
            "standards": len(standards),
            "indicators": len([i for i in indicators_out if i["subjectId"] == sid]),
        },
    })

subjects_out.sort(key=lambda s: s["name"])
indicators_out.sort(key=lambda i: (i["subjectId"], [int(p) for p in i["code"].split(".")[1:]]))
schedules_out.sort(key=lambda l: (l["subjectId"], l["term"], l["week"], l["lessonNum"] or 0))

grades = [{
    "id": GRADE,
    "name": "Basic 1",
    "available": True,
    "subjects": len(subjects_out),
    "hasSchedules": sorted({l["subjectId"] for l in schedules_out}),
}]

for name, payload in [
    ("grades.json", grades),
    ("b1_subjects.json", subjects_out),
    ("b1_indicators.json", indicators_out),
    ("b1_schedules.json", schedules_out),
]:
    path = OUT / name
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}  ({path.stat().st_size:,} bytes)")

print(f"\nsubjects: {len(subjects_out)}, indicators: {len(indicators_out)}, scheduled lessons: {len(schedules_out)}")
