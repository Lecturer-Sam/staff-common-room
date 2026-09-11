#!/usr/bin/env python3
"""
Generate a printable handwriting template (A4 PDF).
Each character gets its own box; corner registration dots let the
build_font.py pipeline auto-detect and straighten the page in a photo.
Also writes template_layout.json (single source of truth for the layout).
"""
import json
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(OUT_DIR, "handwriting_template.pdf")
LAYOUT_PATH = os.path.join(OUT_DIR, "template_layout.json")

# ---------------------------------------------------------------- geometry
PAGE_W, PAGE_H = A4                       # 595.28 x 841.89 pt
MARGIN = 36.0
CELL = 36.0                               # box size (pt) ~ 12.7 mm
GAP = 6.0
COLS = 12
BASELINE_FRAC = 0.72                      # writing line at 72% of box height FROM THE TOP
DOT_R = 6.0                               # registration dot radius (pt)

# character sets (order = layout order)
UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
LOWER = "abcdefghijklmnopqrstuvwxyz"
NUM_SYM = "0123456789.,?!'\"-;:()@#&/$%+=*"
SECTIONS = [
    ("UPPERCASE LETTERS  (A - Z)", UPPER),
    ("LOWERCASE LETTERS  (a - z)", LOWER),
    ("NUMBERS & SYMBOLS  (0 - 9  . , ? ! ...)", NUM_SYM),
]

CONTENT_W = PAGE_W - 2 * MARGIN
GRID_W = COLS * CELL + (COLS - 1) * GAP
X0 = MARGIN + (CONTENT_W - GRID_W) / 2.0   # left edge of first column

# vertical plan, measured from the TOP of the page (pt)
TITLE_TOP = 62                             # title baseline
TIP_FIRST = 78                             # first instruction baseline
TIP_STEP = 13
SEC_FIRST = 178                            # first section header baseline
HEADER_H = 22                              # space above first row of a section
ROW_H = CELL + GAP                         # 42
SECTION_GAP = 8.0


def y_pdf(off):
    """convert pt-from-top to reportlab (bottom-left origin) y"""
    return PAGE_H - off


def layout_rects():
    """{char: (x, y_bottom, w, h)} in PDF coords, plus [(header, y), ...]."""
    rects = {}
    headers = []
    t = SEC_FIRST
    for header, chars in SECTIONS:
        headers.append((header, y_pdf(t)))
        nrows = (len(chars) + COLS - 1) // COLS
        for i, ch in enumerate(chars):
            col = i % COLS
            row = i // COLS
            x = X0 + col * (CELL + GAP)
            top_from_top = t + HEADER_H + row * ROW_H
            rects[ch] = (x, y_pdf(top_from_top + CELL), CELL, CELL)
        t += HEADER_H + nrows * ROW_H + SECTION_GAP
    return rects, headers


def main():
    c = canvas.Canvas(PDF_PATH, pagesize=A4)
    c.setTitle("My Handwriting Template")
    c.setAuthor("Arena Agent")

    # -- title + instructions --------------------------------------------
    c.setFont("Helvetica-Bold", 16)
    c.drawString(MARGIN, y_pdf(TITLE_TOP), "MY HANDWRITING TEMPLATE")
    c.setFont("Helvetica", 8.5)
    c.setFillColorRGB(0.35, 0.35, 0.35)
    tips = [
        "1. Print this page on plain white paper (no existing lines).",
        "2. Use a dark pen (black ballpoint). Avoid pencil and shiny gel ink.",
        "3. Write ONE character in each box, filling most of the box. Do not touch the box borders.",
        "4. Write each letter the way it appears inside a normal word (cursive writers: one letter per box).",
        "5. Write naturally - same speed and style as your everyday writing.",
        "6. Finally, write 1-2 lines in the SAMPLE SENTENCE area at the bottom.",
        "Photo: lay the page flat, shoot straight-on from above, even lighting, whole page in frame.",
    ]
    for i, t in enumerate(tips):
        c.drawString(MARGIN + 2, y_pdf(TIP_FIRST + TIP_STEP * i), t)
    c.setFillColorRGB(0, 0, 0)

    # -- registration dots (corners of content area) ----------------------
    dots = [
        (MARGIN + DOT_R, PAGE_H - MARGIN - DOT_R),
        (PAGE_W - MARGIN - DOT_R, PAGE_H - MARGIN - DOT_R),
        (MARGIN + DOT_R, MARGIN + DOT_R),
        (PAGE_W - MARGIN - DOT_R, MARGIN + DOT_R),
    ]
    for dx, dy in dots:
        c.setFillColorRGB(0, 0, 0)
        c.circle(dx, dy, DOT_R, stroke=0, fill=1)

    # -- light outer frame (visual only; detection uses the dots) ---------
    c.setStrokeColorRGB(0.75, 0.75, 0.75)
    c.setLineWidth(0.75)
    c.rect(MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN)

    # -- character boxes --------------------------------------------------
    rects, headers = layout_rects()
    for header, hy in headers:
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(MARGIN, hy, header)

    for ch, (x, y, w, h) in rects.items():
        # box border
        c.setStrokeColorRGB(0, 0, 0)
        c.setLineWidth(1.1)
        c.rect(x, y, w, h)
        # baseline guide
        by = y + (1 - BASELINE_FRAC) * h
        c.setStrokeColorRGB(0.72, 0.72, 0.72)
        c.setLineWidth(0.7)
        c.line(x + 2.5, by, x + w - 2.5, by)
        c.setFillColorRGB(0, 0, 0)

    # -- sample sentence area ----------------------------------------------
    t = SEC_FIRST
    for _, chars in SECTIONS:
        t += HEADER_H + ((len(chars) + COLS - 1) // COLS) * ROW_H + SECTION_GAP
    sy = y_pdf(t + 10)                     # sample header baseline
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(MARGIN, sy, "SAMPLE SENTENCE  (write naturally, 1-2 lines)")
    sy = y_pdf(t + 26)
    c.setStrokeColorRGB(0.55, 0.55, 0.55)
    c.setLineWidth(0.8)
    for _ in range(4):
        c.line(MARGIN, sy, PAGE_W - MARGIN, sy)
        sy -= 26

    # -- footer -------------------------------------------------------------
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColorRGB(0.45, 0.45, 0.45)
    c.drawString(MARGIN, y_pdf(PAGE_H - 26), "Upload a straight-on photo of the filled page - the letters become your font.")

    c.showPage()
    c.save()

    # -- layout json --------------------------------------------------------
    layout = {
        "page_size_pt": [PAGE_W, PAGE_H],
        "cell_pt": CELL,
        "gap_pt": GAP,
        "baseline_frac": BASELINE_FRAC,
        "margin_pt": MARGIN,
        "dots_pt": dots,
        "cells": {ch: rects[ch] for ch in rects},
    }
    with open(LAYOUT_PATH, "w") as f:
        json.dump(layout, f, indent=1)
    print("wrote", PDF_PATH)
    print("wrote", LAYOUT_PATH, f"({len(rects)} cells)")


if __name__ == "__main__":
    main()
