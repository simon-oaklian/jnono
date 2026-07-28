#!/usr/bin/env python3
"""
Re-extract all question diagram images at high resolution.
Uses hardcoded page/card_idx mapping from previous template-match run.
Crops only the diagram region (above answer options) using gray-box detection.
"""
import fitz
import cv2
import numpy as np
from PIL import Image
import os
import shutil

UPLOADS = "/home/simon/.claude/uploads/ebb46fdf-7d0c-4281-950e-2627c683aea9"
PDFS = {
    'b21':   f'{UPLOADS}/0aa3b695-B21____PlanningEstimating.pdf',
    'b22':   f'{UPLOADS}/d88203ad-B22____Framing__Structural.pdf',
    'b23_1': f'{UPLOADS}/ff74b783-B23_1_Core_TradesPart_13_.pdf',
    'b26':   f'{UPLOADS}/12b509a6-B26_General_Building_Updates_1_7.pdf',
    'b27':   f'{UPLOADS}/12edb18d-B27_General_Building_Updates_2_8.pdf',
    'hs':    f'{UPLOADS}/cc22555f-Health__Safety_Test_9B_.pdf',
}

IMAGES_DIR = '/home/simon/jnono/images/questions'
SCALE = 5  # 5x = 360 DPI

# Hardcoded mapping: image_name → (pdf_key, page_0indexed, card_idx_in_get_images)
# card_idx is the index in page.get_images() list (0-based)
IMAGE_MAP = {
    # B21 (Planning & Estimating)
    'bg-t01-002': ('b21',  0, 1),   # manually identified: page 1 idx=1 (1600x697)
    'bg-t01-006': ('b21',  2, 0),
    'bg-t01-012': ('b21',  6, 0),
    'bg-t01-023': ('b21', 15, 0),
    'bg-t01-028': ('b21', 17, 0),
    'bg-t01-036': ('b21', 22, 0),
    'bg-t01-050': ('b21', 28, 1),
    'bg-t01-069': ('b21', 44, 0),
    'bg-t01-083': ('b21', 28, 1),   # same card as bg-t01-050
    'bg-t01-091': ('b21', 63, 0),
    # B22 (Framing & Structural)
    'bg-t02-013': ('b22',  3, 1),
    'bg-t02-019': ('b22',  5, 1),
    'bg-t02-023': ('b22',  6, 2),
    'bg-t02-026': ('b22',  7, 2),
    'bg-t02-046': ('b22', 15, 1),
    'bg-t02-052': ('b22', 17, 1),
    'bg-t02-070': ('b22', 23, 1),
    'bg-t02-073': ('b22', 25, 1),
    'bg-t02-077': ('b22', 27, 2),
    'bg-t02-082': ('b22', 29, 0),
    'bg-t02-085': ('b22', 30, 0),
    'bg-t02-109': ('b22', 38, 0),
    'bg-t02-118': ('b22', 41, 2),
    # B23_1 (Core Trades Part 1)
    'bg-t03-080': ('b23_1', 21, 1),
    # B26 (General Building Updates 1)
    'bg-t06-009': ('b26', 11, 0),
    'bg-t06-031': ('b26', 11, 0),   # same diagram as bg-t06-009
    'bg-t06-044': ('b26', 11, 0),   # same diagram
    'bg-t06-073': ('b26', 21, 0),
    'bg-t06-088': ('b26', 11, 0),   # same diagram
    'bg-t06-098': ('b26', 28, 0),
    'bg-t06-102': ('b26', 29, 1),
    'bg-t06-112': ('b26', 11, 0),   # same diagram
    'bg-t06-116': ('b26', 17, 0),
    # B27 (General Building Updates 2)
    'bg-t02-020_3': ('b27',  4, 2),
    'bg-t02-067_3': ('b27', 18, 0),
    'bg-t02-081_3': ('b27', 21, 2),
    # Health & Safety
    'hs-t01-008': ('hs',  2, 0),
    'hs-t01-032': ('hs',  8, 2),
    'hs-t01-044': ('hs', 11, 3),
    'hs-t01-064': ('hs', 16, 3),
    'hs-t01-069': ('hs', 18, 1),
    'hs-t01-092': ('hs', 24, 1),
}

# Duplicates: copy source file to dest after extraction
DUPLICATES = {
    'bg-t01-007': 'bg-t01-069',
    'bg-t01-064': 'bg-t01-091',
    'bg-t01-073': 'bg-t01-050',
}

# Images to skip (blueprints and non-card images)
SKIP = {'blueprint-1f', 'blueprint-2f', 'blueprint-house', 'cslb-flow-test-001', 'test'}


def find_diagram_bottom(gray_img):
    """
    Find where the diagram gray-box ends (gray→white transition).
    Cards have a light-gray diagram area (row mean ~244-246) followed by
    white answer options (row mean ~255). Find the first sustained white
    band after the gray zone.
    """
    h = gray_img.shape[0]
    row_means = gray_img.mean(axis=1)

    WHITE = 252.5
    GRAY  = 249.0
    search_start = int(h * 0.15)
    search_end   = int(h * 0.80)

    gray_seen = False
    for y in range(search_start, search_end):
        if row_means[y] < GRAY:
            gray_seen = True
        if gray_seen and row_means[y] >= WHITE:
            # Verify it's a sustained white band (≥10 consecutive rows)
            count = sum(1 for yy in range(y, min(y + 20, h)) if row_means[yy] >= WHITE)
            if count >= 10:
                return y

    return int(h * 0.65)  # fallback


def extract_diagram(pdf_key, page_idx, card_idx, padding=15):
    """Render the card at 5x DPI and crop just the diagram region."""
    doc = fitz.open(PDFS[pdf_key])
    page = doc[page_idx]

    images = page.get_images()
    if card_idx >= len(images):
        print(f"    ERROR: card_idx={card_idx} out of range ({len(images)} images on page)")
        doc.close()
        return None

    xref = images[card_idx][0]
    raw = doc.extract_image(xref)
    card_native = cv2.imdecode(np.frombuffer(raw['image'], np.uint8), cv2.IMREAD_COLOR)
    ch, cw = card_native.shape[:2]

    gray = cv2.cvtColor(card_native, cv2.COLOR_BGR2GRAY)
    diagram_bottom = find_diagram_bottom(gray)
    crop_bottom = min(diagram_bottom + padding, ch)

    rects = page.get_image_rects(xref)
    if not rects:
        doc.close()
        return None
    r = rects[0]
    sy = (r.y1 - r.y0) / ch

    mat = fitz.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat)
    rendered = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    x0 = max(0, int(r.x0 * SCALE))
    y0 = max(0, int(r.y0 * SCALE))
    x1 = min(pix.width,  int(r.x1 * SCALE))
    y1 = min(pix.height, int((r.y0 + crop_bottom * sy) * SCALE))

    doc.close()
    return rendered.crop((x0, y0, x1, y1))


def main():
    # Process each image in the mapping
    for name, (pdf_key, page_idx, card_idx) in sorted(IMAGE_MAP.items()):
        out_path = os.path.join(IMAGES_DIR, name + '.png')
        print(f"  {name}.png ← {pdf_key} page {page_idx+1} card[{card_idx}]", end='', flush=True)
        img = extract_diagram(pdf_key, page_idx, card_idx)
        if img is None:
            print("  FAILED")
            continue
        img.save(out_path, 'PNG', optimize=True)
        print(f"  → {img.size[0]}x{img.size[1]}")

    # Handle duplicates
    print("\n=== Copying duplicates ===")
    for dup_name, src_name in DUPLICATES.items():
        src_path = os.path.join(IMAGES_DIR, src_name + '.png')
        dst_path = os.path.join(IMAGES_DIR, dup_name + '.png')
        if os.path.exists(src_path):
            shutil.copy2(src_path, dst_path)
            img = Image.open(dst_path)
            print(f"  {dup_name}.png ← {src_name}.png ({img.size[0]}x{img.size[1]})")

    print("\nDone!")


if __name__ == '__main__':
    main()
