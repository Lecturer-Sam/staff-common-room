#!/usr/bin/env python3
"""Generate curriculum db_clean + summary files for subjects that have no
scaffold: Computing B4-B6, French B4-B6, and the Kindergarten curriculum
(KG1/KG2), directly from the extracted PDF text in data/pdf_text/."""
import json, os, re, sys, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
from enrich_from_raw import clean, BULLETS

DATA = os.path.join(os.path.dirname(__file__), '..', 'data')

JOBS = [
    # (text file, subject id, subject name, code prefix regex, prefix->grade)
    ('pdf_text/COMPUTING-B4-B6.txt', 'computing', 'Computing',
     r'B[456]', lambda p: p),
    ('pdf_text/FRENCH-B4-B6.txt', 'french', 'French',
     r'B[456]', lambda p: p),
    ('pdf_text/KG-Curriculum.txt', 'kindergarten', 'Kindergarten',
     r'K[12]', lambda p: 'KG' + p[1]),
]

BOILER = {
    'competencies': 'Communication and Collaboration; Critical Thinking and Problem Solving; Creativity and Innovation; Digital Literacy',
    'keywords': '',
    'assessment': 'Class exercises; oral questions; practical task; SBA',
}
RESOURCES = {
    'computing': 'Computers/tablets, projector, charts of ICT tools, the internet',
    'french': 'Flashcards, images, chansons, vidéos, documents authentiques',
    'kindergarten': 'Conversational posters, picture books, manipulatives, play materials',
}


def harvest_subject(text, prefix_re):
    code_pat = re.compile(rf'({prefix_re})(\s*\.\s*\d+){{3,4}}')
    matches = list(code_pat.finditer(text))
    found = {}
    for idx, m in enumerate(matches):
        code = re.sub(r'\s+', '', m.group(0))
        # prefer definitions: code at the start of a line
        at_line_start = m.start() == 0 or text[m.start() - 1] in '\n\x0c'
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else min(len(text), start + 400)
        chunk = text[start:end]
        cut = len(chunk)
        for ch in BULLETS:
            p = chunk.find(ch)
            if p != -1:
                cut = min(cut, p)
        desc = clean(chunk[:cut][:350])
        if len(desc) < 12 or not re.search(r'[a-zà-ÿ]{3}', desc, re.I):
            continue
        prev_len, prev_line = found.get(code, ('', False))[0:2] if code in found else ('', False)
        prev_desc, prev_start = found.get(code, ('', False))
        # line-start captures beat mid-line ones; otherwise longest wins
        if code not in found or (at_line_start and not prev_start) or \
           (at_line_start == prev_start and len(desc) > len(prev_desc)):
            found[code] = (desc, at_line_start)
    return {k: v[0] for k, v in found.items()}


def strand_names(text):
    names = {}
    for m in re.finditer(r'[Ss]trand\s*(\d+)\s*[:\-–]\s*([^\n]{3,60})', text):
        n, name = m.group(1), clean(m.group(2))
        if len(name) > 3 and n not in names:
            names[n] = name
    return names


for fname, sid, sname, prefix_re, to_grade in JOBS:
    text = open(os.path.join(DATA, fname), encoding='utf-8', errors='replace').read()
    h = harvest_subject(text, prefix_re)
    strands = strand_names(text)
    grades = {}
    for code, desc in h.items():
        parts = code.split('.')
        grade = to_grade(parts[0])
        grades.setdefault(grade, {})[code] = desc
    for grade, items in sorted(grades.items()):
        inds = {k: v for k, v in items.items() if k.count('.') == 4}
        css = {k: v for k, v in items.items() if k.count('.') == 3}
        db = {}
        for code, desc in sorted(inds.items()):
            p = code.split('.')
            cs = '.'.join(p[:4])
            db[code] = {
                'strand': strands.get(p[1], f'Strand {p[1]}'),
                'sub_strand': f'Sub-strand {p[1]}.{p[2]}',
                'cs_code': cs, 'cs_desc': css.get(cs, ''),
                'ind_desc': desc,
                'resources': RESOURCES[sid], **BOILER,
            }
        if len(db) < 5:
            print(f'SKIP {sid} {grade}: only {len(db)} indicators harvested')
            continue
        json.dump(db, open(os.path.join(DATA, f'{sid}_{grade}_curriculum_db_clean.json'), 'w',
                           encoding='utf-8'), ensure_ascii=False, indent=1)
        summary = {'id': sid, 'name': sname, 'grade': grade,
                   'sourceTitle': f'NaCCA {sname} Curriculum', 'sourceUrl': ''}
        json.dump(summary, open(os.path.join(DATA, f'{sid}_{grade}_curriculum_summary.json'), 'w',
                                encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'{sid} {grade}: {len(db)} indicators, {len({v["strand"] for v in db.values()})} strands')
