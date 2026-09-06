#!/usr/bin/env python3
"""Emit standalone SVGs of the ARKCHEMY wordmark as outlined paths.

Glyphs come from public/lab/wordmark.html, the same source the display font is
built from, so the SVG, the font and the site cannot drift apart.

Spec:
    fill            #3d1140 -> #7a1f4e   linear, 86 degrees
    outline         #f3c34e   weight 4
    outer keyline   #2a1030   weight 5
    letter spacing  15
    condense        102% wide, 100% tall
    corners         sharp mitred, miter limit 14

The two rings are stacked strokes, widest first: SVG strokes straddle the path,
so a stroke of 2*w reads as w units outside it. Painting keyline, then outline,
then the fill on top leaves exactly 5 units of dark outside 4 units of gold.
"""
import re, pathlib, math

ROOT = pathlib.Path(__file__).resolve().parents[2]
LAB  = ROOT / "public/lab/wordmark.html"
OUT  = ROOT / "branding/wordmark"

WORD     = "ARKCHEMY"
TRACK    = 15
CONDENSE = 1.02
OUTLINE_W, KEYLINE_W = 4, 5
MITER    = 14
ANGLE    = 86

FILL_A, FILL_B = "#3D1140", "#7A1F4E"
GOLD, KEYLINE  = "#F3C34E", "#2A1030"
PAD = OUTLINE_W + KEYLINE_W + 6

def load_glyphs():
    src  = LAB.read_text()
    blob = src[src.index("const GLYPHS = {"):src.index("};", src.index("const GLYPHS = {"))+2]
    return {m.group(1): {"w": int(m.group(2)), "d": m.group(3)} for m in
            re.finditer(r'"([A-Z])"\s*:\s*\{\s*w\s*:\s*(\d+)\s*,\s*d\s*:\s*"([^"]+)"', blob)}

def translate(d, dx):
    return re.sub(r"(-?[\d.]+),(-?[\d.]+)",
                  lambda m: f"{float(m.group(1))+dx:g},{float(m.group(2)):g}", d)

def layout(glyphs):
    x, parts = 0.0, []
    for ch in WORD:
        parts.append(translate(glyphs[ch]["d"], x))
        x += glyphs[ch]["w"] + TRACK
    return parts, x - TRACK

def gradient():
    a = math.radians(ANGLE)
    dx, dy = math.cos(a) / 2, math.sin(a) / 2
    return (f'<linearGradient id="ark-fill" x1="{0.5-dx:.4f}" y1="{0.5-dy:.4f}" '
            f'x2="{0.5+dx:.4f}" y2="{0.5+dy:.4f}">'
            f'<stop offset="0" stop-color="{FILL_A}"/>'
            f'<stop offset="1" stop-color="{FILL_B}"/></linearGradient>')

def build(parts, w, h, mode):
    body = "\n      ".join(f'<path d="{p}"/>' for p in parts)
    vb   = f"{-PAD} {-PAD} {w + PAD*2} {h + PAD*2}"
    join = f'stroke-linejoin="miter" stroke-miterlimit="{MITER}" stroke-linecap="butt"'
    scale = (f'<g transform="scale({CONDENSE},1)">' if CONDENSE != 1 else "<g>")

    if mode == "full":
        layers = (
            f'    <g fill="none" stroke="{KEYLINE}" stroke-width="{2*(OUTLINE_W+KEYLINE_W)}" {join}>\n'
            f'      {body}\n    </g>\n'
            f'    <g fill="none" stroke="{GOLD}" stroke-width="{2*OUTLINE_W}" {join}>\n'
            f'      {body}\n    </g>\n'
            f'    <g fill="url(#ark-fill)" fill-rule="evenodd">\n      {body}\n    </g>')
        defs, title = f"  <defs>{gradient()}</defs>\n", "Arkchemy wordmark"
    elif mode == "flat":
        layers = f'    <g fill="{FILL_A}" fill-rule="evenodd">\n      {body}\n    </g>'
        defs, title = "", "Arkchemy wordmark (solid)"
    elif mode == "black":
        layers = f'    <g fill="#000000" fill-rule="evenodd">\n      {body}\n    </g>'
        defs, title = "", "Arkchemy wordmark (black)"
    else:
        layers = (f'    <g fill="none" stroke="{FILL_A}" stroke-width="3" {join}>\n'
                  f'      {body}\n    </g>')
        defs, title = "", "Arkchemy wordmark (outline)"

    vb_w = (w + PAD*2)
    vb = f"{-PAD} {-PAD} {vb_w * CONDENSE:g} {h + PAD*2}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
            f'role="img" aria-label="Arkchemy">\n'
            f'  <title>{title}</title>\n{defs}{scale}\n{layers}\n  </g>\n</svg>\n')

glyphs = load_glyphs()
parts, width = layout(glyphs)
OUT.mkdir(parents=True, exist_ok=True)
for mode, name in [("full","arkchemy-wordmark.svg"),
                   ("flat","arkchemy-wordmark-solid-plum.svg"),
                   ("black","arkchemy-wordmark-black.svg"),
                   ("outline","arkchemy-wordmark-outline.svg")]:
    (OUT/name).write_text(build(parts, width, 100, mode))
print(f"  wordmark width {width:g} units, tracking {TRACK}, condense {CONDENSE:.0%}")
