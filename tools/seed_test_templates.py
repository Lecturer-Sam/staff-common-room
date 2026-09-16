#!/usr/bin/env python3
"""
Seed test_templates collection with default templates — PRD Phase 4

Templates are configurable so exam style can change without code rewrites.
Default: ges_basic_v1, bece_mock_v1 (from app/src/lib/testTemplate.js)

Usage:
  python tools/seed_test_templates.py --dry-run --out /tmp/templates.json
  python tools/seed_test_templates.py --push --service-account /path/to/sa.json
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

TEMPLATES = {
    "ges_basic_v1": {
        "id": "ges_basic_v1",
        "name": "GES Basic - Standard",
        "version": 1,
        "header": {
            "showLogo": True,
            "logoPath": "/beaconlogo.png",
            "schoolNameField": "schoolName",
            "titleField": "title",
            "subtitleFields": ["subjectName", "gradeLabel"],
            "showDuration": True,
            "showTotalMarks": True,
            "showDate": False,
        },
        "instructions": {
            "general": "Answer all questions. Write your name and index number on the answer sheet.",
            "objective": "Choose the correct answer from the options A to D.",
            "short": "Answer the following questions briefly in the space provided.",
            "essay": "Answer the following questions in detail.",
            "structured": "Answer all questions in this section.",
        },
        "formatting": {
            "numbering": "1,2,3 continuous across sections",
            "sections": {"labelStyle": "SECTION A — OBJECTIVE", "instructionsItalic": True},
            "question": {"marksInBrackets": True, "optionsLayout": "vertical", "showAnswerKey": False},
            "footer": {"showCoverageSummary": False, "showPageNumbers": True},
            "fonts": {"header": "bold", "body": "normal"},
        },
        "isDefault": True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
    "bece_mock_v1": {
        "id": "bece_mock_v1",
        "name": "BECE Mock - WAEC Style",
        "version": 1,
        "header": {
            "showLogo": True,
            "logoPath": "/beaconlogo.png",
            "schoolNameField": "schoolName",
            "titleField": "title",
            "subtitleFields": ["subjectName", "gradeLabel"],
            "showDuration": True,
            "showTotalMarks": True,
            "showDate": True,
        },
        "instructions": {
            "general": "Answer all questions. Time allowed: as indicated. This paper follows the BECE format.",
            "objective": "Each question is followed by four options lettered A to D. Find the correct option for each question and shade in pencil on your answer sheet the answer space which bears the same letter as the option you have chosen.",
            "short": "Answer all questions in this section.",
            "essay": "Answer three questions only in this section.",
            "structured": "Answer all questions.",
        },
        "formatting": {
            "numbering": "1,2,3 continuous across sections",
            "sections": {"labelStyle": "SECTION A — OBJECTIVE", "instructionsItalic": True},
            "question": {"marksInBrackets": True, "optionsLayout": "vertical", "showAnswerKey": False},
            "footer": {"showCoverageSummary": True, "showPageNumbers": True},
            "fonts": {"header": "bold", "body": "normal"},
        },
        "isDefault": False,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    },
}

def main():
    parser = argparse.ArgumentParser(description="Seed test_templates")
    parser.add_argument("--dry-run", action="store_true", help="Don't push, just print")
    parser.add_argument("--out", type=str, help="Write templates JSON to file")
    parser.add_argument("--push", action="store_true", help="Push to Firestore")
    parser.add_argument("--service-account", type=str, help="Service account JSON")
    args = parser.parse_args()

    print(f"Templates: {list(TEMPLATES.keys())}")

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(list(TEMPLATES.values()), indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote to {args.out}")

    if args.dry_run:
        print("\nDry run — not pushing")
        print(json.dumps(list(TEMPLATES.values()), indent=2, ensure_ascii=False)[:1000])
        return

    if args.push:
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
        except ImportError:
            print("firebase-admin not installed: pip install firebase-admin", file=sys.stderr)
            sys.exit(1)

        import os
        sa_path = args.service_account or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path:
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

        db = firestore.client()
        for tid, tdata in TEMPLATES.items():
            # Use SERVER_TIMESTAMP for createdAt on push
            data = {**tdata, "createdAt": firestore.SERVER_TIMESTAMP, "updatedAt": firestore.SERVER_TIMESTAMP}
            db.collection("test_templates").document(tid).set(data)
            print(f"Pushed {tid}")
        print("Done")

if __name__ == "__main__":
    main()
