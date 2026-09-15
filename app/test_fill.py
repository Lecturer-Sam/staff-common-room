#!/usr/bin/env python3
"""Synthetic self-test: render the template PDF and 'fill it in' with a
system font + jitter, then build_font.py must extract it back into a TTF."""
import json
import math
import os

import fitz  # pymupdf
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
LAYOUT = json.load(open(os.path.join(HERE, "template_layout.json")))

PT = 200 / 72.0           # px per pt at 200 dpi

pdf = fitz.open(os.path.join(HERE, "handwriting_template.pdf"))
page = pdf[0]
pix = page.get_pixmap(dpi=200)
pix.save(os.path.join(HERE, "_template_render.png"))
img = Image.open(os.path.join(HERE, "_template_render.png")).convert("L")
W, H = img.size
print("rendered template at", img.size)

draw = ImageDraw.Draw(img)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                          int(25 * PT))
rng = np.random.default_rng(42)

def px(v):
    return int(round(v * PT))

for ch, (x, yb, w, h) in LAYOUT["cells"].items():
    # baseline center in image coords (top-left origin)
    cx = px(x + w / 2)
    cy = int(round(H - (yb + h * (1 - LAYOUT["baseline_frac"])) * PT))
    # small jitter + rotation to simulate handwriting
    jx, jy = rng.integers(-4, 5), rng.integers(-3, 4)
    ang = rng.uniform(-3, 3)
    tile = Image.new("L", (px(2 * w), px(2 * h)), 255)
    td = ImageDraw.Draw(tile)
    td.text((tile.width / 2, tile.height / 2 + jy), ch, font=font,
            fill=0, anchor="ms")
    tile = tile.rotate(ang, resample=Image.BICUBIC, fillcolor=255)
    # paste ONLY the glyph pixels: mask = inverted tile (255 at ink)
    mask = tile.point(lambda p: 255 - p)
    img.paste(tile, (cx - tile.width // 2 + jx, cy - tile.height // 2), mask)

# sample lines at the bottom
font2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                           int(14 * PT))
draw.text((px(40), H - px(150)), "The quick brown fox jumps over the lazy dog.",
          font=font2, fill=0)
draw.text((px(40), H - px(120)), "0123456789 and my handwriting sample line two.",
          font=font2, fill=0)

img.save(os.path.join(HERE, "_filled_template.png"))
print("wrote _filled_template.png")
