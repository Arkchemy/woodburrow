#!/usr/bin/env python3
"""Build public/images/og-card.png -- the 1200x630 image link previews show.

    python tools/make_og_card.py

Every scraper (Discord, Twitter, Slack, iMessage) crops to roughly 1.91:1, so
the card is built at exactly that and everything that matters is kept away
from the edges.

The sky, the islands, the cloud and the balloon are all painted here. The
previous version composited five PNGs and a background plate taken from a
web.archive.org capture of Activision's Skylanders site, which made the card
a derived work of their artwork and put it on every page as og:image. Those
files are gone; see LEGAL.md. Nothing in this script reads anything it did
not draw, apart from the project's own wordmark.

The colours are the same ones public/css/header.css uses, so the card and the
page header read as the same sky. If you change one, change both.

One thing worth knowing before editing the tagline: arkchemy-display.ttf has
NO punctuation. Every non-letter renders as a blank .notdef box of fixed
width -- measured, not assumed: ':' ',' '.' '&' '!' and the apostrophe all
report the same 14.0 advance at 40px, while 'A' reports 27.0. The first
version of this card read "SPYRO S ADVENTURE" because of it. Keep the tagline
to letters and spaces.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(HERE, "public")

W, H = 1200, 630
BAND_H = 74
TAGLINE = "PORTING THE FIRST SKYLANDERS GAME TO THE NINTENDO SWITCH"

# --- sky ------------------------------------------------------------------
# linear-gradient(#3f9fe0 0%, #6fc3ee 46%, #a8e0f6 78%, #d8f1fb 100%) with a
# warm radial bloom at 78%/108%, matching header.css stop for stop.
STOPS = [(0.00, (0x3f, 0x9f, 0xe0)), (0.46, (0x6f, 0xc3, 0xee)),
         (0.78, (0xa8, 0xe0, 0xf6)), (1.00, (0xd8, 0xf1, 0xfb))]
BLOOM = (255, 233, 170)
BLOOM_A = 0.85


def sky_row(t):
    for i in range(len(STOPS) - 1):
        a, ca = STOPS[i]
        b, cb = STOPS[i + 1]
        if t <= b or i == len(STOPS) - 2:
            k = 0.0 if b == a else (t - a) / (b - a)
            k = max(0.0, min(1.0, k))
            return tuple(round(ca[j] + (cb[j] - ca[j]) * k) for j in range(3))


rows = [sky_row(y / (H - 1)) for y in range(H)]
# Radial: centre at (78%, 108%) of the box, radii 70% and 120%. Falls to zero
# at 60% of the way out, as in the CSS.
cx, cy = 0.78 * W, 1.08 * H
rx, ry = 0.70 * W, 1.20 * H
px = []
for y in range(H):
    base = rows[y]
    dy = (y - cy) / ry
    dy2 = dy * dy
    for x in range(W):
        dx = (x - cx) / rx
        d = (dx * dx + dy2) ** 0.5
        if d < 0.60:
            a = BLOOM_A * (1.0 - d / 0.60)
            px.append(tuple(round(base[j] + (BLOOM[j] - base[j]) * a)
                            for j in range(3)))
        else:
            px.append(base)
card = Image.new("RGB", (W, H))
card.putdata(px)

# --- drawn pieces ---------------------------------------------------------
# Same silhouettes as public/images/sky/*.svg, expressed as polygons. The
# island paths are the SVG coordinates scaled; the grass cap is an ellipse
# because at card size the quadratic overhang is under a pixel.
ROCK_HI, ROCK_LO = (0x8a, 0x6a, 0x52), (0x4a, 0x34, 0x28)
GRASS_HI, GRASS_LO = (0x8f, 0xd6, 0x6a), (0x4e, 0x9c, 0x46)

ISLE_LG = [(12, 44), (168, 44), (150, 74), (138, 70), (120, 104), (104, 96),
           (92, 132), (78, 104), (58, 112), (46, 78), (28, 72)]
ISLE_SM = [(10, 30), (100, 30), (88, 52), (76, 48), (62, 80), (50, 54),
           (34, 58), (24, 44)]


def island(pts, src_w, x, y, w):
    s = w / src_w
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.polygon([(x + px_ * s, y + py_ * s) for px_, py_ in pts],
              fill=ROCK_LO + (255,))
    # grass cap: two ellipses, the lighter one inset at the top for a lit edge
    cap_h = 30 * s
    d.ellipse([x + 4 * s, y + 20 * s - cap_h * .34,
               x + (src_w - 4) * s, y + 20 * s + cap_h * .66],
              fill=GRASS_LO + (255,))
    d.ellipse([x + 12 * s, y + 20 * s - cap_h * .30,
               x + (src_w - 12) * s, y + 20 * s + cap_h * .22],
              fill=GRASS_HI + (255,))
    card.paste(lay, (0, 0), lay)


def cloud(x, y, w, alpha=255):
    s = w / 240.0
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for ox, oy, r in ((46, 58, 34), (96, 40, 46), (152, 46, 40), (196, 62, 30)):
        d.ellipse([x + (ox - r) * s, y + (oy - r) * s,
                   x + (ox + r) * s, y + (oy + r) * s], fill=(255, 255, 255, alpha))
    d.rounded_rectangle([x + 14 * s, y + 56 * s, x + 214 * s, y + 90 * s],
                        radius=18 * s, fill=(255, 255, 255, alpha))
    card.paste(lay, (0, 0), lay)


def balloon(x, y, w):
    s = w / 90.0
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.ellipse([x + 4 * s, y + 4 * s, x + 86 * s, y + 96 * s],
              fill=(0xb8, 0x30, 0x5f, 255))
    d.ellipse([x + 30 * s, y + 4 * s, x + 60 * s, y + 98 * s],
              fill=(0xf3, 0xc3, 0x4e, 255))
    d.polygon([(x + 33 * s, y + 94 * s), (x + 57 * s, y + 94 * s),
               (x + 54 * s, y + 104 * s), (x + 36 * s, y + 104 * s)],
              fill=(0x2a, 0x10, 0x30, 255))
    d.line([(x + 36 * s, y + 104 * s), (x + 33 * s, y + 114 * s)],
           fill=(0x2a, 0x10, 0x30, 255), width=max(1, round(2.5 * s)))
    d.line([(x + 54 * s, y + 104 * s), (x + 57 * s, y + 114 * s)],
           fill=(0x2a, 0x10, 0x30, 255), width=max(1, round(2.5 * s)))
    d.rounded_rectangle([x + 31 * s, y + 113 * s, x + 59 * s, y + 128 * s],
                        radius=3 * s, fill=(0x8a, 0x5a, 0x2b, 255))
    card.paste(lay, (0, 0), lay)


cloud(760, 40, 330)
cloud(80, 330, 240, alpha=150)
island(ISLE_LG, 180, 40, 74, 168)
island(ISLE_LG, 180, 1000, 118, 140)
island(ISLE_SM, 110, 156, 424, 96)
balloon(1046, 328, 104)

# --- wordmark and tagline -------------------------------------------------
wm = Image.open(os.path.join(HERE, "branding", "wordmark",
                             "arkchemy-wordmark@3000.png")).convert("RGBA")
tw = 860
wm = wm.resize((tw, round(wm.height * tw / wm.width)), Image.LANCZOS)
card.paste(wm, ((W - tw) // 2, (H - wm.height) // 2 - 40), wm)

band = Image.new("RGBA", (W, BAND_H), (61, 17, 64, 232))
card.paste(band, (0, H - BAND_H), band)

d = ImageDraw.Draw(card)
font_path = os.path.join(PUB, "fonts", "arkchemy-display.ttf")
f = None
for size in range(34, 17, -1):
    cand = ImageFont.truetype(font_path, size)
    if d.textlength(TAGLINE, font=cand) <= W - 80:
        f = cand
        break
if f is None:
    raise SystemExit("tagline does not fit even at 18px -- shorten it")

tw2 = d.textlength(TAGLINE, font=f)
bbox = f.getbbox(TAGLINE)
ty = H - BAND_H + (BAND_H - (bbox[3] - bbox[1])) // 2 - bbox[1]
d.text(((W - tw2) / 2, ty), TAGLINE, font=f, fill=(243, 195, 78))

out = os.path.join(PUB, "images", "og-card.png")
card.save(out, optimize=True)
print("wrote %s  %dx%d  %d KB  (tagline at %dpx)"
      % (out, W, H, os.path.getsize(out) // 1024, f.size))
