#!/usr/bin/env python3
"""Build public/curriculum/{grade}_subjects.json and {grade}_indicators.json
for B2-B9 from data/{subject}_{GRADE}_curriculum_db_clean.json (+ summary).

Output matches the B1 file format so the app's useCurriculum(grade) hook can
load any grade the same way. Run again whenever data/ files are re-extracted.
"""
import json, glob, os, re
from collections import defaultdict

DATA = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'curriculum')

GRADE_NAMES = {f'B{i}': f'Basic {i}' for i in range(1, 10)}
GRADE_NAMES.update({'KG1': 'KG 1', 'KG2': 'KG 2'})

def num(part, default=0):
    try:
        return int(part)
    except (ValueError, TypeError):
        return default

grades = defaultdict(lambda: {'subjects': [], 'indicators': []})

paths = sorted(glob.glob(os.path.join(DATA, '*_B[2-9]_curriculum_db_clean.json')))
paths += sorted(glob.glob(os.path.join(DATA, '*_KG[12]_curriculum_db_clean.json')))
for path in paths:
    base = os.path.basename(path)
    m = re.match(r'(.+)_(B[2-9]|KG[12])_curriculum_db_clean\.json', base)
    subject_id, grade = m.group(1), m.group(2)
    db = json.load(open(path, encoding='utf-8'))

    summary_path = path.replace('_db_clean.json', '_summary.json')
    summary = json.load(open(summary_path, encoding='utf-8')) if os.path.exists(summary_path) else {}
    subject_name = summary.get('name') or subject_id.replace('-', ' ').title()

    indicators = []
    for code, v in db.items():
        # code shape: B2.<strand>.<sub>.<cs>.<ind>  (some are shorter)
        parts = code.split('.')
        strand_no = num(parts[1]) if len(parts) > 1 else 0
        sub_no = num(parts[2]) if len(parts) > 2 else 0
        ind_desc = v.get('ind_desc', '')
        cs_desc = v.get('cs_desc', '')
        # Placeholder text from extraction is kept but normalised so the UI
        # can show '(description pending extraction)' when it detects it.
        entry = {
            'id': f'{subject_id}_{code}',
            'code': code,
            'grade': grade,
            'subjectId': subject_id,
            'subjectName': subject_name,
            'strandNumber': strand_no,
            'strandName': v.get('strand', ''),
            'subStrandNumber': sub_no,
            'subStrandName': v.get('sub_strand', ''),
            'contentStandardCode': v.get('cs_code', ''),
            'contentStandardDescription': cs_desc,
            'description': ind_desc,
            'competencies': v.get('competencies', ''),
            'resources': v.get('resources', ''),
            'keywords': v.get('keywords', ''),
            'assessment': v.get('assessment', ''),
        }
        # Carry worked exemplars only when present, so subjects/grades without
        # them stay byte-identical on rebuild.
        exemplars = v.get('exemplars')
        if exemplars:
            entry['exemplars'] = exemplars
        indicators.append(entry)
    indicators.sort(key=lambda i: [num(p, 99) for p in i['code'].split('.')[1:]])

    counts = summary.get('counts') or {
        'strands': len({i['strandNumber'] for i in indicators}),
        'subStrands': len({(i['strandNumber'], i['subStrandNumber']) for i in indicators}),
        'standards': len({i['contentStandardCode'] for i in indicators}),
        'indicators': len(indicators),
    }
    grades[grade]['subjects'].append({
        'id': subject_id,
        'name': subject_name,
        'grade': grade,
        'sourceTitle': summary.get('sourceTitle', ''),
        'sourceUrl': summary.get('sourceUrl', ''),
        'hasSchedule': False,
        'counts': counts,
    })
    grades[grade]['indicators'].extend(indicators)

for grade, data in sorted(grades.items()):
    g = grade.lower()
    data['subjects'].sort(key=lambda s: s['id'])
    json.dump(data['subjects'], open(os.path.join(OUT, f'{g}_subjects.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    json.dump(data['indicators'], open(os.path.join(OUT, f'{g}_indicators.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(f'{grade}: {len(data["subjects"])} subjects, {len(data["indicators"])} indicators')

# ---- grades.json (keep B1 entry as-is) ----
ORDER = ['KG1', 'KG2'] + [f'B{i}' for i in range(1, 10)]
grades_meta = [{
    'id': 'B1', 'name': 'Basic 1', 'available': True, 'subjects': 8,
    'hasSchedules': ['mathematics', 'science'],
}]
for grade in sorted(grades.keys(), key=lambda g: ORDER.index(g) if g in ORDER else 99):
    grades_meta.append({
        'id': grade,
        'name': GRADE_NAMES[grade],
        'available': True,
        'subjects': len(grades[grade]['subjects']),
        'hasSchedules': [],
    })
grades_meta.sort(key=lambda g: ORDER.index(g['id']) if g['id'] in ORDER else 99)
json.dump(grades_meta, open(os.path.join(OUT, 'grades.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('grades.json:', [g['id'] for g in grades_meta])
