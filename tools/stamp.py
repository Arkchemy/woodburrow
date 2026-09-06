#!/usr/bin/env python3
"""Re-stamp index.html so browsers pick up changed assets.

Two stamps, both mtime-based:
  * DATA_V           -> newest public/*.json
  * ?v= on each .css -> that stylesheet's own mtime

A date stamp is not enough: regenerate data or edit CSS twice in one day and
the browser keeps serving the old copy, which silently drops new fields and
new rules.
"""
import pathlib, re, os, glob

pub = pathlib.Path(__file__).resolve().parents[1] / "public"
p = pub / "index.html"
s = orig = p.read_text()

newest = int(max(os.path.getmtime(f) for f in glob.glob(str(pub / "*.json"))))
s = re.sub(r'const DATA_V = "\?v=[^"]*";', f'const DATA_V = "?v={newest}";', s)

def stamp_css(m):
    href = m.group(1)
    f = pub / href
    if not f.exists():
        return m.group(0)
    return m.group(0).replace(m.group(0).split('href="')[1].split('"')[0],
                              f"{href}?v={int(os.path.getmtime(f))}")

s = re.sub(r'<link[^>]*href="([^"?]+\.css)(?:\?v=\d+)?"', stamp_css, s)

def stamp_js(m):
    src = m.group(1)
    f = pub / src
    if not f.exists():
        return m.group(0)
    return f'<script src="{src}?v={int(os.path.getmtime(f))}"></script>'

s = re.sub(r'<script src="([^"?]+\.js)(?:\?v=\d+)?"></script>', stamp_js, s)
p.write_text(s)
print(f"DATA_V = {newest}")
for m in re.finditer(r'href="([^"]+\.css\?v=\d+)"', s):
    print(f"  {m.group(1)}")
