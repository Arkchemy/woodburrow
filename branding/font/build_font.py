#!/usr/bin/env python3
"""Build a real font from the Arkchemy display glyphs.

The letterforms live as SVG paths on a 100-unit cap grid (y down, baseline at
y=100) in public/lab/wordmark.html -- that file stays the single source of
truth, so tweaking a glyph there and re-running this keeps the two in step.

Every path is a polyline (straight segments only), which makes the conversion
to TrueType contours exact: no curve fitting, no approximation.

Outputs .ttf and .woff2 into public/fonts/.
"""
import re, sys, pathlib
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT   = pathlib.Path(__file__).resolve().parents[3]
LAB    = ROOT / "woodburrow/public/lab/wordmark.html"
OUTDIR = ROOT / "woodburrow/public/fonts"

UPEM      = 1000
CAP       = 700          # cap height in font units
ASCENDER  = 800
DESCENDER = -200
SCALE     = CAP / 100.0  # the grid is 100 units tall

def load_glyphs():
    src = LAB.read_text()
    blob = src[src.index("const GLYPHS = {"):src.index("};", src.index("const GLYPHS = {"))+2]
    out = {}
    for ch, w, d in re.findall(r'"(.)":\{w:(\d+),d:"([^"]*)"\}', blob):
        out[ch] = (int(w), d)
    return out

def contours(d):
    """SVG path -> list of point lists. Only M/L/Z appear in these glyphs."""
    subs, cur = [], []
    for cmd, args in re.findall(r'([MLZ])([^MLZ]*)', d, re.I):
        nums = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', args)]
        if cmd.upper() == 'M':
            if cur: subs.append(cur)
            cur = [(nums[0], nums[1])]
            for i in range(2, len(nums), 2):        # implicit lineto pairs
                cur.append((nums[i], nums[i+1]))
        elif cmd.upper() == 'L':
            for i in range(0, len(nums), 2):
                cur.append((nums[i], nums[i+1]))
        else:
            if cur: subs.append(cur); cur = []
    if cur: subs.append(cur)
    return subs

def to_glyph(d):
    pen = TTGlyphPen(None)
    for pts in contours(d):
        if len(pts) < 3: continue
        # grid is y-down with baseline at 100; fonts are y-up from baseline
        conv = [(x * SCALE, (100.0 - y) * SCALE) for x, y in pts]
        pen.moveTo(conv[0])
        for p in conv[1:]: pen.lineTo(p)
        pen.closePath()
    return pen.glyph()

def main():
    glyphs = load_glyphs()
    if not glyphs: sys.exit("no glyphs found in the lab file")

    order  = [".notdef"]
    shapes = {".notdef": TTGlyphPen(None).glyph()}
    widths = {".notdef": int(50 * SCALE)}
    cmap   = {}

    for ch, (w, d) in sorted(glyphs.items()):
        if ch == " ":
            name = "space"
        else:
            name = ch
        order.append(name)
        shapes[name] = to_glyph(d) if d else TTGlyphPen(None).glyph()
        widths[name] = int(round(w * SCALE))
        cmap[ord(ch)] = name
        # lowercase maps to the same capital: this is an all-caps display face
        if ch.isalpha():
            cmap[ord(ch.lower())] = name

    fb = FontBuilder(UPEM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(shapes)
    fb.setupHorizontalMetrics({g: (widths[g], 0) for g in order})
    fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER)
    fb.setupNameTable({
        "familyName": "Arkchemy Display",
        "styleName": "Regular",
        "uniqueFontIdentifier": "Arkchemy Display Regular",
        "fullName": "Arkchemy Display",
        "psName": "ArkchemyDisplay-Regular",
        "version": "Version 1.000",
    })
    fb.setupOS2(sTypoAscender=ASCENDER, sTypoDescender=DESCENDER,
                usWinAscent=ASCENDER, usWinDescent=-DESCENDER, sCapHeight=CAP)
    fb.setupPost()

    OUTDIR.mkdir(parents=True, exist_ok=True)
    ttf = OUTDIR / "arkchemy-display.ttf"
    fb.save(str(ttf))

    from fontTools.ttLib import TTFont
    f = TTFont(str(ttf)); f.flavor = "woff2"
    woff2 = OUTDIR / "arkchemy-display.woff2"
    f.save(str(woff2))

    print(f"glyphs: {len(glyphs)}  ({''.join(sorted(k for k in glyphs if k != ' '))})")
    print(f"  {ttf.name}    {ttf.stat().st_size:6} bytes")
    print(f"  {woff2.name}  {woff2.stat().st_size:6} bytes")

if __name__ == "__main__":
    main()
