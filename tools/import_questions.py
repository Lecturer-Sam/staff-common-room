#!/usr/bin/env python3
"""
Question Bank Bulk Import — PRD Phase 4 tool

Reads CSV/JSON and validates against the new PRD schema (contentStandardCode required),
then optionally writes to Firestore via firebase-admin or outputs a Firestore-ready JSON.

Usage:
  python tools/import_questions.py --csv data/questions/b4_math.csv --dry-run
  python tools/import_questions.py --csv data/questions/b4_math.csv --out data/questions/import_ready.json
  python tools/import_questions.py --csv data/questions/b4_math.csv --push --grade B4 --subject mathematics

CSV expected columns (flexible, case-insensitive):
  grade, subjectId/subject, strandName/strand, subStrandName/sub_strand,
  contentStandardCode/content_standard (REQUIRED), indicatorCode/indicator (optional),
  type (objective/essay or mcq/short/essay), objectiveType, essayType,
  text/question, options (pipe or JSON), correctAnswer/answer, markingGuide,
  marks, difficulty (easy/medium/hard), bloomLevel, source, status

Options JSON can be:
  - "A|B|C|D" pipe-separated
  - '["A","B","C","D"]' JSON array
  - 4 separate columns option_a, option_b, option_c, option_d

Firestore push requires:
  pip install firebase-admin
  and GOOGLE_APPLICATION_CREDENTIALS or --service-account path

This tool reuses _paths.py for data dirs and _compat.py for tolerant reads.
"""

import argparse
import csv
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

# Ensure tools/ is on path for _paths import
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from _paths import DATA, CURRICULUM, find_data
except ImportError:
    DATA = Path(__file__).resolve().parent.parent / "data"
    CURRICULUM = DATA / "curriculum"
    def find_data(name, *extra):
        for base in (CURRICULUM, DATA, DATA / "questions", Path.cwd()):
            p = base / name
            if p.exists():
                return p
        return None

VALID_GRADES = [f"B{i}" for i in range(1, 10)] + ["KG1", "KG2"]
VALID_TYPES = ["objective", "essay", "mcq", "short", "essay_legacy", "true_false", "fill_blank"]
VALID_DIFFICULTIES = ["easy", "medium", "hard"]
VALID_BLOOM = ["remember", "understand", "apply", "analyze", "evaluate", "create"]
VALID_STATUS = ["draft", "pending", "published", "archived"]
VALID_OBJECTIVE_SUBTYPES = ["mcq", "true_false", "fill_blank"]
VALID_ESSAY_SUBTYPES = ["short", "structured", "long"]

def load_curriculum_codes():
    """Load all valid contentStandardCodes from curriculum bundle for validation."""
    codes = set()
    # Try app/public/curriculum first (built bundle)
    app_cur = Path(__file__).resolve().parent.parent / "app" / "public" / "curriculum"
    if app_cur.exists():
        for f in app_cur.glob("*_indicators.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                for ind in data:
                    cs = ind.get("contentStandardCode") or ind.get("cs_code")
                    if cs:
                        codes.add(cs)
                    # also indicator codes
                    ic = ind.get("code") or ind.get("id")
                    if ic:
                        codes.add(ic)
            except Exception:
                continue
    # Fallback to data/curriculum
    if not codes and CURRICULUM.exists():
        for f in CURRICULUM.glob("*_curriculum_db_clean.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    for v in data.values():
                        cs = v.get("cs_code")
                        if cs:
                            codes.add(cs)
                        # indicator is key
                    for k in data.keys():
                        codes.add(k)
                elif isinstance(data, list):
                    for ind in data:
                        cs = ind.get("cs_code") or ind.get("contentStandardCode")
                        if cs:
                            codes.add(cs)
            except Exception:
                continue
    return codes

def normalize_row(raw, idx):
    """Normalize a raw dict (from CSV or JSON) into PRD schema."""
    # Lowercase keys for tolerant matching
    lower = {k.lower().strip(): v for k, v in raw.items() if k}
    def get(*keys, default=""):
        for k in keys:
            if k.lower() in lower and lower[k.lower()] not in (None, ""):
                return str(lower[k.lower()]).strip()
            # also try original case
            for orig_k, v in raw.items():
                if orig_k.lower() == k.lower() and str(v).strip() != "":
                    return str(v).strip()
        return default

    grade = get("grade", "class").upper()
    subjectId = get("subjectid", "subject", "subject_id").lower()
    strandName = get("strandname", "strand")
    subStrandName = get("substrandname", "sub_strand", "sub-strand", "substrand")
    contentStandardCode = get("contentstandardcode", "content_standard", "cs_code", "contentstandard", "content_standard_code")
    indicatorCode = get("indicatorcode", "indicator", "ind_code", "indicator_code")
    indicatorId = get("indicatorid", "indicator_id")

    type_raw = get("type", "question_type").lower()
    # Map legacy
    if type_raw in ["mcq", "multiple choice", "multiple_choice"]:
        type_norm = "objective"
        objectiveType = "mcq"
        essayType = None
    elif type_raw in ["true_false", "true/false", "true false"]:
        type_norm = "objective"
        objectiveType = "true_false"
        essayType = None
    elif type_raw in ["fill_blank", "fill in blank", "fill"]:
        type_norm = "objective"
        objectiveType = "fill_blank"
        essayType = None
    elif type_raw in ["objective"]:
        type_norm = "objective"
        objectiveType = get("objectivetype", "objective_type", default="mcq").lower() or "mcq"
        essayType = None
    elif type_raw in ["short"]:
        type_norm = "essay"
        objectiveType = None
        essayType = "short"
    elif type_raw in ["essay", "structured", "long"]:
        type_norm = "essay"
        objectiveType = None
        essayType = type_raw if type_raw in VALID_ESSAY_SUBTYPES else "structured"
    else:
        type_norm = type_raw or "objective"
        objectiveType = get("objectivetype", default="mcq").lower() or "mcq"
        essayType = None

    text = get("text", "question", "question_text", "body")
    # Options handling
    options = []
    # Try option_a..d columns
    for letter in ["a", "b", "c", "d"]:
        opt = get(f"option_{letter}", f"option{letter}", f"option {letter}")
        if opt:
            # ensure list length
            while len(options) < 4:
                options.append("")
            idx_map = {"a":0,"b":1,"c":2,"d":3}
            options[idx_map[letter]] = opt
    if not any(options):
        opts_raw = get("options")
        if opts_raw:
            opts_raw = opts_raw.strip()
            if opts_raw.startswith("["):
                try:
                    options = json.loads(opts_raw)
                except:
                    options = [o.strip() for o in opts_raw.split("|")]
            elif "|" in opts_raw:
                options = [o.strip() for o in opts_raw.split("|")]
            elif ";" in opts_raw:
                options = [o.strip() for o in opts_raw.split(";")]
            else:
                options = [o.strip() for o in opts_raw.split(",")] if "," in opts_raw else [opts_raw]

    correctAnswer = get("correctanswer", "correct_answer", "answer", "correct")
    markingGuide = get("markingguide", "marking_guide", "guide", "model_answer", "rubric")
    # If type is objective but markingGuide empty, keep answer as correctAnswer
    # If essay, answer field may be marking guide
    if type_norm == "essay" and not markingGuide and correctAnswer:
        markingGuide = correctAnswer
        # correctAnswer for essay may be empty

    marks_raw = get("marks", "mark", "points", default="2")
    try:
        marks = int(float(marks_raw))
    except:
        marks = 2

    difficulty = get("difficulty", default="medium").lower()
    bloomLevel = get("bloomlevel", "bloom", "bloom_level", default="understand").lower()
    source = get("source", "src", default="curated")
    status = get("status", default="pending").lower()

    # Validation
    errors = []
    if not grade:
        errors.append("grade required")
    elif grade not in VALID_GRADES:
        # allow but warn
        pass
    if not subjectId:
        errors.append("subjectId required")
    if not contentStandardCode:
        errors.append("contentStandardCode required (PRD critical rule)")
    if not text:
        errors.append("text/question required")
    if type_norm not in ["objective", "essay"] and type_raw not in VALID_TYPES:
        errors.append(f"type must be one of {VALID_TYPES} or objective/essay, got {type_raw}")
    if difficulty not in VALID_DIFFICULTIES:
        difficulty = "medium"
    if bloomLevel not in VALID_BLOOM:
        bloomLevel = "understand"
    if status not in VALID_STATUS:
        status = "pending"

    if type_norm == "objective" and (objectiveType or "mcq") == "mcq":
        if len([o for o in options if o.strip()]) < 2:
            errors.append("MCQ needs at least 2 options")
        if not correctAnswer:
            errors.append("MCQ needs correctAnswer (A/B/C/D)")

    normalized = {
        "grade": grade,
        "subjectId": subjectId,
        "strandName": strandName,
        "subStrandName": subStrandName,
        "contentStandardCode": contentStandardCode,
        "indicatorCode": indicatorCode or None,
        "indicatorId": indicatorId or None,
        "type": type_norm,
        "objectiveType": objectiveType,
        "essayType": essayType,
        "text": text,
        "question": text,  # legacy compat
        "options": options if type_norm == "objective" and objectiveType == "mcq" else [],
        "correctAnswer": correctAnswer,
        "answer": correctAnswer if type_norm == "objective" else markingGuide,  # legacy
        "markingGuide": markingGuide,
        "marks": marks,
        "difficulty": difficulty,
        "bloomLevel": bloomLevel,
        "source": source,
        "status": status,
        "version": 1,
        "_row": idx,
        "_errors": errors,
    }
    return normalized

def audit_questions(questions, valid_codes=None):
    """Run audit checks similar to audit_b_pdf_crosscheck.py."""
    report = {
        "total": len(questions),
        "valid": 0,
        "invalid": 0,
        "by_grade": {},
        "by_subject": {},
        "by_content_standard": {},
        "by_difficulty": {},
        "orphan_content_standards": [],
        "errors": [],
    }
    for q in questions:
        grade = q.get("grade", "unknown")
        subj = q.get("subjectId", "unknown")
        cs = q.get("contentStandardCode", "unknown")
        diff = q.get("difficulty", "unknown")

        report["by_grade"][grade] = report["by_grade"].get(grade, 0) + 1
        report["by_subject"][subj] = report["by_subject"].get(subj, 0) + 1
        report["by_content_standard"][cs] = report["by_content_standard"].get(cs, 0) + 1
        report["by_difficulty"][diff] = report["by_difficulty"].get(diff, 0) + 1

        if q["_errors"]:
            report["invalid"] += 1
            report["errors"].append({"row": q["_row"], "code": cs, "errors": q["_errors"], "text": q["text"][:80]})
        else:
            report["valid"] += 1

        if valid_codes and cs not in valid_codes:
            report["orphan_content_standards"].append(cs)

    report["orphan_content_standards"] = sorted(set(report["orphan_content_standards"]))
    return report

def main():
    parser = argparse.ArgumentParser(description="Import questions into NaCCA Question Bank (PRD v1)")
    parser.add_argument("--csv", type=str, help="CSV file path")
    parser.add_argument("--json", type=str, help="JSON file path (array of objects)")
    parser.add_argument("--out", type=str, help="Output JSON path for Firestore-ready docs")
    parser.add_argument("--audit-out", type=str, help="Audit report JSON path")
    parser.add_argument("--dry-run", action="store_true", help="Validate only, don't write")
    parser.add_argument("--push", action="store_true", help="Push to Firestore (requires firebase-admin)")
    parser.add_argument("--service-account", type=str, help="Path to Firebase service account JSON")
    parser.add_argument("--grade", type=str, help="Override grade for all rows")
    parser.add_argument("--subject", type=str, help="Override subjectId for all rows")
    parser.add_argument("--status", type=str, default=None, help="Override status (e.g. published)")
    parser.add_argument("--limit", type=int, default=None, help="Limit rows for testing")

    args = parser.parse_args()

    if not args.csv and not args.json:
        print("Provide --csv or --json", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    rows = []
    if args.csv:
        csv_path = Path(args.csv)
        if not csv_path.exists():
            # try find_data
            found = find_data(csv_path.name) if 'find_data' in globals() else None
            if found:
                csv_path = found
            else:
                print(f"CSV not found: {args.csv}", file=sys.stderr)
                sys.exit(1)
        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, r in enumerate(reader, start=2):
                rows.append(r)
                if args.limit and len(rows) >= args.limit:
                    break

    if args.json:
        json_path = Path(args.json)
        if not json_path.exists():
            found = find_data(json_path.name) if 'find_data' in globals() else None
            if found:
                json_path = found
            else:
                print(f"JSON not found: {args.json}", file=sys.stderr)
                sys.exit(1)
        data = json.loads(json_path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "questions" in data:
            data = data["questions"]
        if not isinstance(data, list):
            print("JSON must be array of question objects", file=sys.stderr)
            sys.exit(1)
        rows.extend(data[: args.limit] if args.limit else data)

    print(f"Loaded {len(rows)} raw rows")

    # Normalize
    normalized = []
    for idx, raw in enumerate(rows, start=1):
        if isinstance(raw, dict):
            n = normalize_row(raw, idx)
        else:
            print(f"Row {idx} not a dict, skipping: {raw}", file=sys.stderr)
            continue
        # Overrides
        if args.grade:
            n["grade"] = args.grade.upper()
        if args.subject:
            n["subjectId"] = args.subject.lower()
        if args.status:
            n["status"] = args.status.lower()
        normalized.append(n)

    # Audit
    print("Loading curriculum codes for orphan check...")
    valid_codes = load_curriculum_codes()
    print(f"Found {len(valid_codes)} curriculum codes for validation" if valid_codes else "No curriculum codes found — skipping orphan check")

    report = audit_questions(normalized, valid_codes if valid_codes else None)

    print("\n=== AUDIT REPORT ===")
    print(f"Total: {report['total']}, Valid: {report['valid']}, Invalid: {report['invalid']}")
    print(f"By grade: {report['by_grade']}")
    print(f"By subject: {report['by_subject']}")
    print(f"By difficulty: {report['by_difficulty']}")
    print(f"Content standards covered: {len(report['by_content_standard'])}")
    if report["orphan_content_standards"]:
        print(f"⚠️ Orphan content standards ({len(report['orphan_content_standards'])}): {report['orphan_content_standards'][:10]}")
    if report["errors"]:
        print(f"\nFirst 10 errors:")
        for e in report["errors"][:10]:
            print(f"  Row {e['row']} [{e['code']}] {e['errors']} — {e['text']}")

    if args.audit_out:
        Path(args.audit_out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.audit_out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Audit written to {args.audit_out}")

    # Prepare Firestore-ready docs (strip internal fields)
    firestore_docs = []
    for q in normalized:
        if q["_errors"]:
            continue
        doc = {k: v for k, v in q.items() if not k.startswith("_")}
        # Add timestamps placeholders — Firestore serverTimestamp will be used on push
        doc["createdAt"] = datetime.now(timezone.utc).isoformat()
        doc["updatedAt"] = doc["createdAt"]
        doc["authorId"] = "import_script"
        doc["authorName"] = "Curated Import"
        doc["weekKey"] = datetime.now().strftime("%Y-W%V")
        doc["auditLog"] = [{"action": "import", "by": "import_script", "at": doc["createdAt"]}]
        firestore_docs.append(doc)

    print(f"\nFirestore-ready docs: {len(firestore_docs)} (skipped {len(normalized)-len(firestore_docs)} invalid)")

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(firestore_docs, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {len(firestore_docs)} docs to {out_path}")

    if args.dry_run:
        print("\nDry run — not pushing to Firestore")
        return

    if args.push:
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
        except ImportError:
            print("firebase-admin not installed: pip install firebase-admin", file=sys.stderr)
            sys.exit(1)

        sa_path = args.service_account or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path:
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
        else:
            # Try default
            firebase_admin.initialize_app()

        db = firestore.client()
        print(f"Pushing {len(firestore_docs)} docs to Firestore collection 'questions'...")
        batch = db.batch()
        count = 0
        for doc_data in firestore_docs:
            ref = db.collection("questions").document()
            batch.set(ref, {**doc_data, "createdAt": firestore.SERVER_TIMESTAMP, "updatedAt": firestore.SERVER_TIMESTAMP})
            count += 1
            if count % 400 == 0:
                batch.commit()
                print(f"  Committed {count}...")
                batch = db.batch()
        if count % 400 != 0:
            batch.commit()
        print(f"Done — pushed {count} docs")

if __name__ == "__main__":
    import os
    main()
