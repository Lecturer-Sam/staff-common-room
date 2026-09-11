#!/usr/bin/env python3
"""Convert data/jhs_maths.json (the complete JHS Mathematics source, with real
strand/sub-strand titles and worked exemplars) into the curriculum_db_clean +
summary files the build pipeline expects, for B7, B8 and B9.

This replaces the earlier placeholder-named maths files ("Strand B7.1", etc.).
After running this, run seed/build_grades.py to regenerate the public/curriculum
files the app serves.

Idempotent: re-running produces the same output. Run from the repo root:
    python seed/build_jhs_maths.py
"""
import json, os, re
from collections import OrderedDict

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'data', 'jhs_maths.json')
DATA = os.path.join(ROOT, 'data')

# Constant CCP fields the source JSON does not carry, matching the convention
# already used across the maths db_clean files.
COMPETENCIES = (
    'Critical Thinking and Problem Solving; Communication and Collaboration; '
    'Creativity and Innovation; Personal Development and Leadership; '
    'Cultural Identity and Global Citizenship; Digital Literacy'
)
RESOURCES = 'NaCCA CCP approved textbook; TLMs; ICT tools'
ASSESSMENT = 'Class exercises; project work; SBA; BECE-style'

SOURCE_TITLE = 'NaCCA Mathematics CCP Curriculum B7-B9'
SOURCE_URL = (
    'https://mingycomputersgh.wordpress.com/wp-content/uploads/2020/06/'
    'mathematics-curriculumb7-b10_draft.pdf'
)


def grade_key(grade_label):
    """'BASIC 7' -> 'B7'."""
    return 'B' + grade_label.strip().split()[-1]


def norm_code(code):
    """Fix the occasional 'B.7.3.2.1.1' extraction typo -> 'B7.3.2.1.1'."""
    if not code:
        return code
    return re.sub(r'^B\.(\d)', r'B\1', code.strip())


def clean(text):
    return re.sub(r'\s+', ' ', (text or '').strip())


def convert_grade(grade_obj):
    grade = grade_key(grade_obj['grade'])
    gnum = grade[1:]
    db = OrderedDict()
    strand_stats = OrderedDict()  # strand code -> stats

    for strand in grade_obj.get('strands', []):
        strand_title = clean(strand.get('title'))
        for sub in strand.get('sub_strands', []):
            sub_title = clean(sub.get('title'))
            for cs in sub.get('content_standards', []):
                cs_code = norm_code(cs.get('code'))
                cs_desc = clean(cs.get('description'))
                for ind in cs.get('indicators', []):
                    code = norm_code(ind.get('code'))
                    if not code:
                        continue
                    if code in db:
                        print(f'  WARNING {grade}: duplicate code {code} — overwriting')
                    exemplars = [clean(e) for e in ind.get('exemplars', []) if clean(e)]
                    db[code] = {
                        'strand': strand_title,
                        'sub_strand': sub_title,
                        'cs_code': cs_code,
                        'cs_desc': cs_desc,
                        'ind_desc': clean(ind.get('description')),
                        'exemplars': exemplars,
                        'competencies': COMPETENCIES,
                        'resources': RESOURCES,
                        'keywords': f'mathematics, {grade.lower()}, ccp, jhs',
                        'assessment': ASSESSMENT,
                    }
                    # strand-level stats keyed by the 2-part strand code, e.g. B7.1
                    scode = '.'.join(code.split('.')[:2])
                    st = strand_stats.setdefault(
                        scode,
                        {'code': scode, 'name': strand_title,
                         'subStrandSet': set(), 'standardSet': set(), 'indicators': 0},
                    )
                    st['subStrandSet'].add('.'.join(code.split('.')[:3]))
                    st['standardSet'].add(cs_code)
                    st['indicators'] += 1

    # db_clean file
    db_path = os.path.join(DATA, f'mathematics_{grade}_curriculum_db_clean.json')
    json.dump(db, open(db_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # summary file — refresh counts, preserve identity/source metadata
    strands_summary = [
        {'code': s['code'], 'name': s['name'],
         'subStrands': len(s['subStrandSet']),
         'standards': len(s['standardSet']),
         'indicators': s['indicators']}
        for s in strand_stats.values()
    ]
    summary = {
        'id': 'mathematics',
        'name': 'Mathematics',
        'grade': grade,
        'sourceTitle': SOURCE_TITLE,
        'sourceUrl': SOURCE_URL,
        'counts': {
            'strands': len(strand_stats),
            'subStrands': sum(len(s['subStrandSet']) for s in strand_stats.values()),
            'standards': sum(len(s['standardSet']) for s in strand_stats.values()),
            'indicators': len(db),
        },
        'strands': strands_summary,
        'curriculum_type': 'CCP',
        'phase': 'JHS',
    }
    sum_path = os.path.join(DATA, f'mathematics_{grade}_curriculum_summary.json')
    json.dump(summary, open(sum_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    ex_count = sum(1 for v in db.values() if v['exemplars'])
    print(f'{grade}: {len(db)} indicators '
          f'({summary["counts"]["strands"]} strands, '
          f'{summary["counts"]["standards"]} standards, {ex_count} with exemplars)')


def main():
    data = json.load(open(SRC, encoding='utf-8'))
    for grade_obj in data:
        convert_grade(grade_obj)
    print('Done. Now run: python seed/build_grades.py')


if __name__ == '__main__':
    main()
