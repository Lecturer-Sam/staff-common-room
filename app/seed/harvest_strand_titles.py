#!/usr/bin/env python3
"""Recover real Strand / Sub-strand titles from the extracted NaCCA PDF text in
data/pdf_text/ and patch them into the *_curriculum_db_clean.json files that
carry placeholder names ("Strand B7.1", "Sub-strand B7.1.1").

The db_clean files already hold good indicator + content-standard text; only the
strand/sub-strand *titles* were lost. Recovery uses two clean signals in the
PDF text:

  * Strand titles are grade-invariant and appear as body headings
    ("STRAND 1: NUMBER") with no dotted leader — harvested subject-wide.
  * Sub-strand titles vary per grade and appear in the table of contents
    ("SUB-STRAND 2: ... ........ 8") with a dotted leader — harvested per grade
    by detecting grade blocks (the strand number resets to 1 at each new grade).

Run from repo root, then run seed/build_grades.py:
    python seed/harvest_strand_titles.py
"""
import json, os, re
from collections import Counter

DATA = os.path.join(os.path.dirname(__file__), '..', 'data')
PDF = os.path.join(DATA, 'pdf_text')

# (pdf text file, subject id, [grades in the file's TOC order])
JOBS = [
    ('Religious-and-Moral-Education.txt', 'rme', ['B7', 'B8', 'B9']),
    ('RELIGIOUS-AND-MORAL-EDUCATION-B1-B6.txt', 'rme', ['B2', 'B3', 'B4', 'B5', 'B6']),
    ('ENGLISH-LANGUAGE.txt', 'english-language', ['B7', 'B8', 'B9']),
    ('ENGLISH-B4-B6.txt', 'english-language', ['B4', 'B5', 'B6']),
    ('GHANAIAN-LANGUAGE.txt', 'ghanaian-language', ['B7', 'B8', 'B9']),
    ('GHANAIAN-LANGUAGE-B4-B6.txt', 'ghanaian-language', ['B4', 'B5', 'B6']),
    ('HISTORY-B1-B6.txt', 'history', ['B4', 'B5', 'B6']),
    ('SCIENCE.txt', 'science', ['B7', 'B8', 'B9']),
    ('COMPUTING.txt', 'computing', ['B7', 'B8', 'B9']),
    ('FRENCH-LANGUAGE.txt', 'french', ['B7', 'B8', 'B9']),
    ('Career-Technology-k-9-3rd-Aug.08.2021.txt', 'career-technology', ['B7', 'B8', 'B9']),
    ('CREATIVE-ARTS-AND-DESIGN.txt', 'creative-arts-design', ['B7', 'B8', 'B9']),
]

STRAND_RE = re.compile(r'^\s*(?:STRAND|Strand)\s+(\d+)\s*:\s*(.+)$')
SUB_RE = re.compile(r'^\s*(?:SUB-STRAND|Sub-strand)\s+(\d+)\s*:\s*(.+)$')


def clean_title(t):
    t = re.sub(r'[\.…]{2,}.*$', '', t)          # drop dotted leader + page no.
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def is_toc(line):
    return '...' in line or '…' in line


def harvest(textfile, grades):
    """-> sub_map {(grade,strand,sub): title}, strand_by_num {strand_no: title}."""
    path = os.path.join(PDF, textfile)
    if not os.path.exists(path):
        return None, None
    lines = open(path, encoding='utf-8', errors='replace').read().split('\n')

    strand_votes = {}          # strand_no -> Counter(title)  (body headings)
    sub_map = {}               # (grade, strand, sub) -> title (TOC)
    gi, prev_strand, cur_strand = -1, None, None

    for l in lines:
        ms, msub = STRAND_RE.match(l), SUB_RE.match(l)
        if is_toc(l):
            if ms:
                n = int(ms.group(1))
                # A strand number that resets to 1 marks the next grade block.
                if n == 1 and (prev_strand is None or prev_strand != 1):
                    gi += 1
                prev_strand, cur_strand = n, n
            elif msub and cur_strand is not None and 0 <= gi < len(grades):
                title = clean_title(msub.group(2))
                if title:
                    sub_map[(grades[gi], cur_strand, int(msub.group(1)))] = title
        elif ms:  # body heading (no dotted leader) -> grade-invariant strand title
            title = clean_title(ms.group(2))
            if title:
                strand_votes.setdefault(int(ms.group(1)), Counter())[title] += 1

    strand_by_num = {n: c.most_common(1)[0][0] for n, c in strand_votes.items()}
    return sub_map, strand_by_num


def patch(subject, grades, sub_map, strand_by_num):
    for g in grades:
        path = os.path.join(DATA, f'{subject}_{g}_curriculum_db_clean.json')
        if not os.path.exists(path):
            print(f'  {g}: no db_clean file, skipped')
            continue
        db = json.load(open(path, encoding='utf-8'))
        both = strand_only = miss = 0
        for code, v in db.items():
            parts = re.sub(r'^B\.', 'B', code).split('.')
            if len(parts) < 3:
                miss += 1
                continue
            n, m = int(parts[1]), int(parts[2])
            got_strand = n in strand_by_num
            if got_strand:
                v['strand'] = strand_by_num[n]
            if (g, n, m) in sub_map:
                v['sub_strand'] = sub_map[(g, n, m)]
                both += 1
            elif got_strand:
                strand_only += 1
            else:
                miss += 1
        json.dump(db, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        pct = round(100 * both / len(db)) if db else 0
        flag = '  <-- LOW' if pct < 60 else ''
        print(f'  {g}: {both} full ({pct}%), {strand_only} strand-only, {miss} unresolved (of {len(db)}){flag}')


def main():
    for textfile, subject, grades in JOBS:
        print(f'{subject} <- {textfile}')
        sub_map, strand_by_num = harvest(textfile, grades)
        if sub_map is None:
            print('  (pdf text missing, skipped)')
            continue
        print(f'  harvested {len(strand_by_num)} strand titles, {len(sub_map)} sub-strand titles')
        patch(subject, grades, sub_map, strand_by_num)


if __name__ == '__main__':
    main()
