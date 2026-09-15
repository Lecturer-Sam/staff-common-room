#!/usr/bin/env python3
"""Parse NaCCA Basic 1 curriculum markdown files into Firestore seed JSON.

Outputs:
  seed/curriculum_subjects.json   - one record per subject
  seed/curriculum_indicators.json - one flat record per indicator (denormalized)
"""
import json, re, sys
from pathlib import Path

UPLOADS = Path("/sessions/clever-affectionate-albattani/mnt/uploads")
OUT = Path("/sessions/clever-affectionate-albattani/mnt/outputs/seed")
OUT.mkdir(exist_ok=True)

FILES = {
    "creative-arts": "Basic1_Creative_Arts_Curriculum.md",
    "english": "Basic1_English_Curriculum.md",
    "ghanaian-language": "Basic1_Ghanaian_Language_Curriculum.md",
    "history": "Basic1_History_Curriculum.md",
    "mathematics": "Basic1_Mathematics_Curriculum.md",
    "owop": "Basic1_OWOP_Curriculum.md",
    "rme": "Basic1_RME_Curriculum.md",
    "science": "Basic1_Science_Curriculum.md",
}

RE_STRAND = re.compile(r"^##\s+STRAND\s+(\d+):\s*(.+)$", re.I)
RE_SUBSTRAND = re.compile(r"^###\s+Sub-Strand\s+(\d+):\s*(.+)$", re.I)
RE_STANDARD = re.compile(r"^\*\*Content Standard\s+`([^`]+)`:?\*\*:?\s*(.*)$", re.I)
RE_INDICATOR = re.compile(r"^-\s+`([^`]+)`\s+[—–-]+\s*(.+)$")
RE_TITLE = re.compile(r"^#\s+(.+)$")
RE_URL = re.compile(r"\*\*Document URL:\*\*\s*(\S+)")

subjects, indicators = [], []

for subject_id, fname in FILES.items():
    text = (UPLOADS / fname).read_text(encoding="utf-8")
    lines = text.splitlines()

    title = next((m.group(1).strip() for l in lines if (m := RE_TITLE.match(l))), fname)
    url_m = RE_URL.search(text)
    subject_name = re.sub(r"^NaCCA Basic 1\s*", "", title).replace(" Curriculum", "").strip()

    strand = substrand = standard = None
    counts = {"strands": 0, "subStrands": 0, "standards": 0, "indicators": 0}

    for line in lines:
        line = line.rstrip()
        if m := RE_STRAND.match(line):
            strand = {"number": int(m.group(1)), "name": m.group(2).strip()}
            substrand = standard = None
            counts["strands"] += 1
        elif m := RE_SUBSTRAND.match(line):
            substrand = {"number": int(m.group(1)), "name": m.group(2).strip().rstrip(",")}
            standard = None
            counts["subStrands"] += 1
        elif m := RE_STANDARD.match(line):
            desc = m.group(2).strip().rstrip(":").strip()
            standard = {"code": m.group(1).strip(), "description": desc}
            counts["standards"] += 1
        elif m := RE_INDICATOR.match(line):
            if not (strand and substrand and standard):
                print(f"WARN {fname}: indicator outside hierarchy: {line[:60]}", file=sys.stderr)
                continue
            code = m.group(1).strip()
            indicators.append({
                "id": f"{subject_id}_{code}",
                "code": code,
                "grade": "B1",
                "subjectId": subject_id,
                "subjectName": subject_name,
                "strandNumber": strand["number"],
                "strandName": strand["name"],
                "subStrandNumber": substrand["number"],
                "subStrandName": substrand["name"],
                "contentStandardCode": standard["code"],
                "contentStandardDescription": standard["description"],
                "description": m.group(2).strip(),
            })
            counts["indicators"] += 1

    subjects.append({
        "id": subject_id,
        "name": subject_name,
        "grade": "B1",
        "sourceTitle": title,
        "sourceUrl": url_m.group(1) if url_m else None,
        "counts": counts,
    })
    print(f"{subject_id:20s} strands={counts['strands']:2d} subStrands={counts['subStrands']:2d} "
          f"standards={counts['standards']:3d} indicators={counts['indicators']:3d}")

(OUT / "curriculum_subjects.json").write_text(json.dumps(subjects, indent=2, ensure_ascii=False), encoding="utf-8")
(OUT / "curriculum_indicators.json").write_text(json.dumps(indicators, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"\nTOTAL indicators: {len(indicators)}")