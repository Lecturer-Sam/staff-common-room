#!/usr/bin/env python3
"""Fill real B2/B3 indicator & content-standard descriptions into the
scaffolded data/{subject}_{grade}_curriculum_db_clean.json files, using the
raw text dumps of the combined NaCCA B1-B3 PDFs already in data/.

Only placeholder fields are replaced; anything already populated is kept.
Run with --dry to see coverage without writing.
"""
import json, os, re, sys, unicodedata

DATA = os.path.join(os.path.dirname(__file__), '..', 'data')

JHS_SOURCES = {
    'social-studies': ['pdf_text/Social-Studies_CCP_JHS-1-3_Revised-1.txt'],
}

SOURCES = {
    'english-language': [
        'english_raw.txt',
        'pdf_text/ENGLISH-LOWER-PRIMARY-B1-B3.txt',
        'pdf_text/ENGLISH-B4-B6.txt',
        'pdf_text/ENGLISH-LANGUAGE.txt',
    ],
    'computing': ['pdf_text/COMPUTING.txt'],
    'creative-arts-design': ['pdf_text/CREATIVE-ARTS-AND-DESIGN.txt'],
    'career-technology': ['pdf_text/Career-Technology-k-9-3rd-Aug.08.2021.txt'],
    'french': ['pdf_text/FRENCH-LANGUAGE.txt'],
    'ghanaian-language': [
        'ghlang_raw2.txt',
        'pdf_text/GHANAIAN-LANGUAGE-B1-B3.txt',
        'pdf_text/GHANAIAN-LANGUAGE-B4-B6.txt',
        'pdf_text/GHANAIAN-LANGUAGE.txt',
    ],
    'rme': ['rme_raw.txt', 'pdf_text/RELIGIOUS-AND-MORAL-EDUCATION-B1-B6.txt',
            'pdf_text/Religious-and-Moral-Education.txt'],
    'history': ['history_raw.txt', 'pdf_text/HISTORY-B1-B6.txt'],
    'science': [
        'science_raw_text.txt',
        'pdf_text/SCIENCE-LOWER-PRIMARY-B1-B3.txt',
        'pdf_text/SCIENCE-UPPER-PRIMARY-B4-B6.txt',
        'pdf_text/SCIENCE.txt',
    ],
    'mathematics': [
        'math_raw_text.txt',
        'pdf_text/MATHS-LOWER-PRIMARY-B1-B3.txt',
        'pdf_text/MATHS-UPPER-PRIMARY-B4-B6.txt',
        'pdf_text/MATHEMATICS.txt',
    ],
    'creative-arts': ['creative_arts_raw.txt', 'pdf_text/CREATIVE-ARTS-B4-B6-.txt'],
}
GRADES = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']

BULLETS = '•▪–●·∙⁃'
# an indicator/cs code, tolerant of stray spaces after dots
CODE = r'B[1-9]\s*[.\s]\s*\d+(?:\s*\.\s*\d+){2,3}'

PLACEHOLDER = re.compile(r'(Learning Indicator|Content Standard) B\d|^Sub-strand B\d')


def clean(text):
    text = unicodedata.normalize('NFKC', text)
    text = re.sub(r'\s+', ' ', text).strip()
    # strip leading punctuation left over from the code match
    text = re.sub(r'^[\s.:;,\-–]+', '', text)
    # cut anything after an obvious table-header artefact
    text = re.split(r'(CONTENT\s+STANDARD|INDICATORS|SUBJECT\s+SPECIFIC|CORE\s+COMPETENC|SUB-?STRAND|Page \d+|Enquiry [Rr]oute|ANNOTATION|MEANING\s*/|Exemplars?\s*(\(s\))?\s*:|Critical Thinking and Problem|Communication and Collaboration|Creativity and Innovation|Personal Development and Leadership)', text)[0]
    return text.strip(' .;:')


def normalise_code(raw):
    c = re.sub(r'\s+', '', raw)
    # "B61.1.1.1" (missing first dot) -> "B6.1.1.1.1"
    if len(c) > 2 and c[2] != '.':
        c = c[:2] + '.' + c[2:]
    return c


def harvest_jhs(text):
    """Social-Studies CCP style: 'JHS 1.1.2.3.4 …' -> B7.1.2.3.4"""
    found = {}
    pat = re.compile(r'JHS\s*([123])\s*\.\s*(\d(?:\s*\.\s*\d+){2,3})')
    matches = list(pat.finditer(text))
    for idx, m in enumerate(matches):
        grade = f'B{6 + int(m.group(1))}'
        code = grade + '.' + re.sub(r'\s+', '', m.group(2))
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else min(len(text), start + 400)
        chunk = text[start:end]
        cut = len(chunk)
        for ch in BULLETS:
            p = chunk.find(ch)
            if p != -1:
                cut = min(cut, p)
        desc = clean(chunk[:cut][:350])
        if len(desc) < 12 or not re.search(r'[a-z]{3}', desc):
            continue
        if len(desc) > len(found.get(code, '')):
            found[code] = desc
    return found


def harvest(text):
    """Return {code: description} for every indicator/cs code in the text."""
    found = {}
    matches = list(re.finditer(CODE, text))
    for idx, m in enumerate(matches):
        code = normalise_code(m.group(0))
        start = m.end()
        # capture until the next code or a bullet or a blank-ish gap
        end = matches[idx + 1].start() if idx + 1 < len(matches) else min(len(text), start + 400)
        chunk = text[start:end]
        # stop at the first activity bullet
        cut = len(chunk)
        for ch in BULLETS:
            p = chunk.find(ch)
            if p != -1:
                cut = min(cut, p)
        # stop at double newline followed by an ALL-CAPS heading
        m2 = re.search(r'\n\s*\n(?=[A-Z][A-Z ]{6,})', chunk[:cut])
        if m2:
            cut = min(cut, m2.start())
        desc = clean(chunk[:cut][:350])
        if len(desc) < 12 or not re.search(r'[a-z]{3}', desc):
            continue
        # keep the longest capture per code (handles CONT'D repeats)
        if len(desc) > len(found.get(code, '')):
            found[code] = desc
    return found


def main(dry=False):
    total_filled = {'ind': 0, 'cs': 0}
    all_sources = {**SOURCES, **JHS_SOURCES}
    for subject, files in all_sources.items():
        harvested = {}
        for fname in files:
            path = os.path.join(DATA, fname)
            if not os.path.exists(path):
                continue
            text = open(path, encoding='utf-8', errors='replace').read()
            fn = harvest_jhs if subject in JHS_SOURCES else harvest
            for code, desc in fn(text).items():
                if len(desc) > len(harvested.get(code, '')):
                    harvested[code] = desc
        if not harvested:
            continue
        for grade in GRADES:
            path = os.path.join(DATA, f'{subject}_{grade}_curriculum_db_clean.json')
            if not os.path.exists(path):
                continue
            db = json.load(open(path, encoding='utf-8'))
            filled_ind = filled_cs = 0
            for code, entry in db.items():
                if PLACEHOLDER.search(entry.get('ind_desc', '')) and code in harvested:
                    entry['ind_desc'] = harvested[code]
                    filled_ind += 1
                cs = entry.get('cs_code', '')
                if PLACEHOLDER.search(entry.get('cs_desc', '')) and cs in harvested:
                    entry['cs_desc'] = harvested[cs]
                    filled_cs += 1
            print(f'{subject} {grade}: {filled_ind}/{len(db)} indicators, {filled_cs} content standards filled')
            total_filled['ind'] += filled_ind
            total_filled['cs'] += filled_cs
            if not dry and (filled_ind or filled_cs):
                json.dump(db, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('TOTAL filled:', total_filled, '(dry run)' if dry else '(written)')


if __name__ == '__main__':
    main(dry='--dry' in sys.argv)
