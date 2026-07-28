#!/usr/bin/env python3
"""
Re-extract all question diagram images at high resolution.
Strategy: use template matching to find each small existing image within the source PDF cards,
then render the full page at 5x DPI and save the card region as a high-res replacement.
"""
import fitz
import cv2
import numpy as np
from PIL import Image
import io
import os
import sys

UPLOADS = "/home/simon/.claude/uploads/ebb46fdf-7d0c-4281-950e-2627c683aea9"
PDFS = {
    'b21':  f'{UPLOADS}/0aa3b695-B21____PlanningEstimating.pdf',
    'b22':  f'{UPLOADS}/d88203ad-B22____Framing__Structural.pdf',
    'b23_1':f'{UPLOADS}/ff74b783-B23_1_Core_TradesPart_13_.pdf',
    'b26':  f'{UPLOADS}/12b509a6-B26_General_Building_Updates_1_7.pdf',
    'b27':  f'{UPLOADS}/12edb18d-B27_General_Building_Updates_2_8.pdf',
    'hs':   f'{UPLOADS}/cc22555f-Health__Safety_Test_9B_.pdf',
}

IMAGES_DIR = '/home/simon/jnono/images/questions'
SCALE = 5  # 5x = 360 DPI

# Which PDF to search for each image prefix
IMAGE_PDF = {}
for fn in os.listdir(IMAGES_DIR):
    if not fn.endswith('.png'):
        continue
    name = fn[:-4]
    if name.startswith('bg-t01-'):
        IMAGE_PDF[name] = 'b21'
    elif name.endswith('_3') and name.startswith('bg-t02-'):
        IMAGE_PDF[name] = 'b27'
    elif name.startswith('bg-t02-'):
        IMAGE_PDF[name] = 'b22'
    elif name.startswith('bg-t03-'):
        IMAGE_PDF[name] = 'b23_1'
    elif name.startswith('bg-t06-'):
        IMAGE_PDF[name] = 'b26'
    elif name.startswith('hs-t01-'):
        IMAGE_PDF[name] = 'hs'

# Skip blueprints and misc
SKIP = {'blueprint-1f', 'blueprint-2f', 'blueprint-house', 'cslb-flow-test-001', 'test'}

# Known duplicates: same source image
DUPLICATES = {
    'bg-t01-007': 'bg-t01-069',
    'bg-t01-064': 'bg-t01-091',
    'bg-t01-073': 'bg-t01-050',
}

def find_card_for_image(img_path, pdf_key, threshold=0.85):
    """Find which page/card in the PDF contains the small image (via template match)."""
    template = cv2.imread(img_path)
    if template is None:
        return None, None, None
    th, tw = template.shape[:2]

    doc = fitz.open(PDFS[pdf_key])
    best = {'score': threshold, 'page': None, 'card_xref': None, 'card_idx': None}

    for pg_num in range(len(doc)):
        page = doc[pg_num]
        for card_idx, img_info in enumerate(page.get_images()):
            xref = img_info[0]
            raw = doc.extract_image(xref)
            card = cv2.imdecode(np.frombuffer(raw['image'], np.uint8), cv2.IMREAD_COLOR)
            if card is None:
                continue
            ch, cw = card.shape[:2]
            if ch < th or cw < tw:
                continue
            res = cv2.matchTemplate(card, template, cv2.TM_CCOEFF_NORMED)
            _, score, _, _ = cv2.minMaxLoc(res)
            if score > best['score']:
                best = {'score': score, 'page': pg_num, 'card_xref': xref, 'card_idx': card_idx}

    doc.close()
    return best['page'], best['card_xref'], best['card_idx']


def render_card_hires(pdf_key, page_num, card_xref):
    """Render page at 5x DPI and crop the card region."""
    doc = fitz.open(PDFS[pdf_key])
    page = doc[page_num]

    mat = fitz.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat)
    rendered = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    rects = page.get_image_rects(card_xref)
    if not rects:
        doc.close()
        return rendered

    r = rects[0]
    x1, y1 = max(0, int(r.x0 * SCALE)), max(0, int(r.y0 * SCALE))
    x2, y2 = min(pix.width, int(r.x1 * SCALE)), min(pix.height, int(r.y1 * SCALE))
    card_img = rendered.crop((x1, y1, x2, y2))
    doc.close()
    return card_img


def main():
    results = {}

    # Group images by PDF to avoid re-opening PDFs repeatedly
    pdf_groups = {}
    for name, pdf_key in IMAGE_PDF.items():
        if name in SKIP or name in DUPLICATES:
            continue
        pdf_groups.setdefault(pdf_key, []).append(name)

    for pdf_key, names in pdf_groups.items():
        print(f"\n=== Scanning {pdf_key} for {len(names)} images ===")
        for name in sorted(names):
            img_path = os.path.join(IMAGES_DIR, name + '.png')
            if not os.path.exists(img_path):
                print(f"  MISSING: {name}.png")
                continue

            pg, xref, cidx = find_card_for_image(img_path, pdf_key)
            if pg is None:
                print(f"  NOT FOUND: {name}.png (no match above threshold)")
                results[name] = None
            else:
                w, h = Image.open(img_path).size
                print(f"  {name}.png ({w}x{h}) → page {pg+1}, card_idx={cidx}")
                results[name] = (pdf_key, pg, xref)

    print("\n=== Extracting high-res cards ===")
    for name, info in results.items():
        if info is None:
            continue
        pdf_key, pg, xref = info
        card_hires = render_card_hires(pdf_key, pg, xref)
        out_path = os.path.join(IMAGES_DIR, name + '.png')
        card_hires.save(out_path, 'PNG', optimize=True)
        print(f"  Saved {name}.png → {card_hires.size[0]}x{card_hires.size[1]}")

    # Handle duplicates
    print("\n=== Copying duplicates ===")
    import shutil
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
