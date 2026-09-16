#!/usr/bin/env python3
"""
Question Bank Coverage Audit — PRD §11

Checks:
- Every question maps to valid contentStandardCode (critical rule)
- Coverage ratio across curriculum standards
- Orphan codes (contentStandardCode not in curriculum)
- Missing CS, difficulty balance, bloom balance, type breakdown
- Exports a JSON report for dashboard

Usage:
  python tools/audit_questions.py --questions data/questions/import_ready.json --out data/audit/questions_audit.json
  python tools/audit_questions.py --firestore --service-account /path/to/sa.json --out data/audit/questions_audit.json

Reuses _paths.py for data locations.
"""

import argparse
import json
import sys
from pathlib import Path
from collections import Counter, defaultdict

sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from _paths import DATA, CURRICULUM, APP_CURRICULUM, find_data
except ImportError:
    DATA = Path(__file__).resolve().parent.parent / "data"
    CURRICULUM = DATA / "curriculum"
    APP_CURRICULUM = Path(__file__).resolve().parent.parent / "app" / "public" / "curriculum"
    def find_data(name, *extra):
        for base in (CURRICULUM, DATA, APP_CURRICULUM, Path.cwd()):
            p = base / name
            if p.exists():
                return p
        return None

def load_curriculum():
    """Load curriculum standards from bundle."""
    standards = {}  # code -> {desc, grade, subject, strand, subStrand}
    indicators = {}  # code -> standard code

    # Try app bundle first (most complete for app)
    if APP_CURRICULUM.exists():
        for f in APP_CURRICULUM.glob("*_indicators.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                for ind in data:
                    cs_code = ind.get("contentStandardCode") or ind.get("cs_code")
                    cs_desc = ind.get("contentStandardDescription") or ind.get("cs_desc") or ""
                    if cs_code and cs_code not in standards:
                        standards[cs_code] = {
                            "code": cs_code,
                            "desc": cs_desc,
                            "grade": ind.get("grade"),
                            "subjectId": ind.get("subjectId"),
                            "strandName": ind.get("strandName"),
                            "subStrandName": ind.get("subStrandName"),
                        }
                    ic = ind.get("code") or ind.get("id")
                    if ic and cs_code:
                        indicators[ic] = cs_code
            except Exception as e:
                print(f"Warn: failed to read {f}: {e}", file=sys.stderr)
                continue

    # Fallback to data/curriculum
    if not standards and CURRICULUM.exists():
        for f in CURRICULUM.glob("*_curriculum_db_clean.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    for ind_code, v in data.items():
                        cs_code = v.get("cs_code")
                        if cs_code and cs_code not in standards:
                            standards[cs_code] = {
                                "code": cs_code,
                                "desc": v.get("cs_desc", ""),
                                "grade": None,
                                "subjectId": None,
                            }
                        indicators[ind_code] = cs_code
                elif isinstance(data, list):
                    for ind in data:
                        cs_code = ind.get("cs_code") or ind.get("contentStandardCode")
                        if cs_code and cs_code not in standards:
                            standards[cs_code] = {"code": cs_code, "desc": ind.get("cs_desc", "")}
            except Exception as e:
                print(f"Warn: failed to read {f}: {e}", file=sys.stderr)
                continue

    return standards, indicators

def load_questions_from_file(path):
    p = Path(path)
    if not p.exists():
        found = find_data(p.name)
        if found:
            p = found
        else:
            print(f"Questions file not found: {path}", file=sys.stderr)
            sys.exit(1)
    data = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "questions" in data:
        data = data["questions"]
    if not isinstance(data, list):
        print("Questions file must be array", file=sys.stderr)
        sys.exit(1)
    return data

def load_questions_from_firestore(service_account=None):
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        print("firebase-admin not installed: pip install firebase-admin", file=sys.stderr)
        sys.exit(1)

    import os
    sa_path = service_account or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_path:
        cred = credentials.Certificate(sa_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

    db = firestore.client()
    print("Fetching questions from Firestore (limit 5000)...")
    docs = db.collection("questions").limit(5000).stream()
    questions = []
    for d in docs:
        q = d.to_dict()
        q["id"] = d.id
        questions.append(q)
    print(f"Fetched {len(questions)} questions")
    return questions

def audit(questions, standards, indicators):
    total = len(questions)
    by_grade = Counter()
    by_subject = Counter()
    by_cs = Counter()
    by_indicator = Counter()
    by_difficulty = Counter()
    by_type = Counter()
    by_bloom = Counter()
    by_status = Counter()
    missing_cs = []
    orphan_cs = []
    orphan_indicator = []
    invalid = []

    valid_cs_codes = set(standards.keys())

    for idx, q in enumerate(questions, start=1):
        grade = q.get("grade", "unknown")
        subject = q.get("subjectId", q.get("subject", "unknown"))
        cs = q.get("contentStandardCode") or q.get("content_standard") or q.get("cs_code")
        ind = q.get("indicatorCode") or q.get("indicatorId") or q.get("indicator")
        diff = q.get("difficulty", "unknown")
        typ = q.get("type", "unknown")
        bloom = q.get("bloomLevel", q.get("bloom", "unknown"))
        status = q.get("status", "published")

        by_grade[grade] += 1
        by_subject[subject] += 1
        if cs:
            by_cs[cs] += 1
        else:
            missing_cs.append(idx)
        if ind:
            by_indicator[ind] += 1
        by_difficulty[diff] += 1
        by_type[typ] += 1
        if bloom != "unknown":
            by_bloom[bloom] += 1
        by_status[status] += 1

        # Checks
        if not cs:
            invalid.append({"row": idx, "id": q.get("id"), "error": "missing contentStandardCode (PRD critical rule)", "text": (q.get("text") or q.get("question") or "")[:80]})
        elif valid_cs_codes and cs not in valid_cs_codes:
            orphan_cs.append(cs)

        if ind and valid_cs_codes:
            # If indicator not in map, check if it's actually a CS code
            if ind not in indicators and ind not in valid_cs_codes:
                orphan_indicator.append(ind)

    # Coverage metrics — PRD §11
    total_standards = len(standards)
    covered_standards = len(by_cs)
    well_covered = sum(1 for c in by_cs.values() if c >= 5)  # >=5 Qs per standard
    coverage_ratio = covered_standards / total_standards if total_standards else 0
    well_covered_ratio = well_covered / total_standards if total_standards else 0

    report = {
        "total_questions": total,
        "total_standards_in_curriculum": total_standards,
        "covered_standards": covered_standards,
        "well_covered_standards_ge5": well_covered,
        "coverage_ratio": round(coverage_ratio, 4),
        "well_covered_ratio": round(well_covered_ratio, 4),
        "missing_cs_count": len(missing_cs),
        "orphan_cs_count": len(set(orphan_cs)),
        "orphan_indicator_count": len(set(orphan_indicator)),
        "invalid_count": len(invalid),
        "by_grade": dict(by_grade),
        "by_subject": dict(by_subject),
        "by_content_standard": dict(by_cs),
        "by_indicator": dict(by_indicator.most_common(20)),
        "by_difficulty": dict(by_difficulty),
        "by_type": dict(by_type),
        "by_bloom": dict(by_bloom),
        "by_status": dict(by_status),
        "missing_cs_rows": missing_cs[:20],
        "orphan_cs": sorted(set(orphan_cs))[:20],
        "orphan_indicators": sorted(set(orphan_indicator))[:20],
        "invalid_samples": invalid[:20],
        "standards_without_questions": [code for code in standards.keys() if code not in by_cs][:50],
    }

    return report

def main():
    parser = argparse.ArgumentParser(description="Audit question bank coverage")
    parser.add_argument("--questions", type=str, help="Path to questions JSON (array)")
    parser.add_argument("--firestore", action="store_true", help="Load from Firestore")
    parser.add_argument("--service-account", type=str, help="Service account JSON for Firestore")
    parser.add_argument("--out", type=str, help="Output report JSON path")
    args = parser.parse_args()

    if not args.questions and not args.firestore:
        print("Provide --questions file or --firestore", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    print("Loading curriculum...")
    standards, indicators = load_curriculum()
    print(f"Curriculum: {len(standards)} content standards, {len(indicators)} indicators")

    if args.firestore:
        questions = load_questions_from_firestore(args.service_account)
    else:
        questions = load_questions_from_file(args.questions)

    print(f"Auditing {len(questions)} questions...")
    report = audit(questions, standards, indicators)

    print("\n=== QUESTION BANK AUDIT ===")
    print(f"Total Qs: {report['total_questions']}")
    print(f"Curriculum standards: {report['total_standards_in_curriculum']}, Covered: {report['covered_standards']} ({report['coverage_ratio']*100:.1f}%), Well-covered ≥5: {report['well_covered_standards_ge5']} ({report['well_covered_ratio']*100:.1f}%)")
    print(f"Missing CS: {report['missing_cs_count']} (critical rule violation)")
    print(f"Orphan CS: {report['orphan_cs_count']}, Orphan indicators: {report['orphan_indicator_count']}, Invalid: {report['invalid_count']}")
    print(f"By grade: {report['by_grade']}")
    print(f"By subject: {report['by_subject']}")
    print(f"By difficulty: {report['by_difficulty']}")
    print(f"By type: {report['by_type']}")
    print(f"By status: {report['by_status']}")
    if report['orphan_cs']:
        print(f"Orphan CS sample: {report['orphan_cs'][:5]}")
    if report['invalid_samples']:
        print(f"Invalid sample: {report['invalid_samples'][0]}")

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nReport written to {out_path}")

if __name__ == "__main__":
    main()
