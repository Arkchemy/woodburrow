#!/usr/bin/env python3
"""Build public/images/og-card.png -- the 1200x630 image link previews show.

    python tools/make_og_card.py

Every scraper (Discord, Twitter, Slack, iMessage) crops to roughly 1.91:1, so
the card is built at exactly that and everything that matters is kept away
from the edges.

Two things worth knowing before editing the tagline:

  * arkchemy-display.ttf has NO punctuation. Every non-letter renders as a
    blank .notdef box of fixed width -- measured, not assumed: ':' ',' '.'
    '&' '!' and the apostrophe all report the same 14.0 advance at 40px, while
    'A' reports 27.0. The first version of this card read "SPYRO S ADVENTURE"
    because of it. Keep the tagline to letters and spaces.
  * The sky is built the same way as armory's lobby background: the header
    strip on the horizon at its own aspect, a gradient above it continuing the
    direction the source is already going, and a feathered join. See
    armory/tools/make-lobby-sky.py for why a straight stretch does not work.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(HERE, "public")
CH = os.path.join(PUB, "images", "cloud-header")

W, H = 1200, 630
BAND_H = 74
FEATHER = 90
TAGLINE = "PORTING THE FIRST SKYLANDERS GAME TO THE NINTENDO SWITCH"

strip = Image.open(os.path.join(CH, "cloud-header-bg.jpg")).convert("RGB")
nh = round(strip.height * W / strip.width)
strip = strip.resize((W, nh), Image.LANCZOS)
top_y = H - nh

row0 = [strip.getpixel((x, 0)) for x in range(0, W, 7)]
join = tuple(sum(p[i] for p in row0) // len(row0) for i in range(3))
deep = (2, 150, 222)

card = Image.new("RGB", (W, H))
px = card.load()
for y in range(H):
    t = min(1.0, y / max(1, top_y - 1))
    c = tuple(round(deep[i] + (join[i] - deep[i]) * t) for i in range(3))
    for x in range(W):
        px[x, y] = c

mask = Image.new("L", (W, nh), 255)
mp = mask.load()
for y in range(min(FEATHER, nh)):
    a = round(255 * y / FEATHER)
    for x in range(W):
        mp[x, y] = a
card.paste(strip, (0, top_y), mask)


def layer(name, box, pos):
    im = Image.open(os.path.join(CH, name)).convert("RGBA").resize(box, Image.LANCZOS)
    card.paste(im, pos, im)


layer("island2.png", (150, 134), (40, 74))
layer("island4.png", (132, 83), (1010, 120))
layer("island3.png", (80, 75), (150, 430))
layer("balloon.png", (96, 159), (1040, 330))
layer("cloud.png", (300, 65), (830, 60))

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
