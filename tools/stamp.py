#!/usr/bin/env python3
"""Re-stamp the pages so browsers pick up changed assets.

Three stamps, all mtime-based:
  * DATA_V           -> newest public/*.json, written into js/common.js
  * ?v= on each .css -> that stylesheet's own mtime
  * ?v= on each .js  -> that script's own mtime

A date stamp is not enough: regenerate data or edit CSS twice in one day and
the browser keeps serving the old copy, which silently drops new fields and
new rules.

Run tools/sync_shell.py first if the shared shell changed, then this: the
sub-pages are copies of index.html's shell, so they need stamping too.
"""
import glob
import os
import pathlib
import re

PUB = pathlib.Path(__file__).resolve().parents[1] / "public"
PAGES = ["index.html", "games.html", "skylanders.html",
         "legal.html", "contributors.html"]

# DATA_V lives in the shared script, not in the pages -- every page that reads
# a .json file goes through it.
common = PUB / "js" / "common.js"
newest = int(max(os.path.getmtime(f) for f in glob.glob(str(PUB / "*.json"))))
src = common.read_text()
out = re.sub(r'const DATA_V = "\?v=[^"]*";', f'const DATA_V = "?v={newest}";', src)
if out != src:
    common.write_text(out)
print(f"DATA_V = {newest}")


def stamp(page: pathlib.Path) -> None:
    s = page.read_text()

    def one(m, attr):
        href = m.group(1)
        f = PUB / href
        if not f.exists():
            print(f"  !! {page.name}: {href} does not exist")
            return m.group(0)
        return m.group(0).replace(f'{attr}="{m.group(1)}"',
                                  f'{attr}="{href}?v={int(os.path.getmtime(f))}"') \
            if f'{attr}="{m.group(1)}"' in m.group(0) else m.group(0)

    s = re.sub(r'<link[^>]*href="([^"?]+\.css)(?:\?v=\d+)?"',
               lambda m: re.sub(r'href="[^"]+"',
                                f'href="{m.group(1)}?v={int(os.path.getmtime(PUB / m.group(1)))}"',
                                m.group(0)) if (PUB / m.group(1)).exists() else m.group(0), s)

    s = re.sub(r'<script src="([^"?]+\.js)(?:\?v=\d+)?"></script>',
               lambda m: f'<script src="{m.group(1)}?v={int(os.path.getmtime(PUB / m.group(1)))}"></script>'
               if (PUB / m.group(1)).exists() else m.group(0), s)

    page.write_text(s)
    print(f"  {page.name}")
    for m in re.finditer(r'(?:href|src)="([^"]+\.(?:css|js)\?v=\d+)"', s):
        print(f"      {m.group(1)}")


for name in PAGES:
    stamp(PUB / name)
