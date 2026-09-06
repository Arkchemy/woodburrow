#!/usr/bin/env python3
"""Rebuild the sub-pages from index.html's shell.

The head, cloud header, nav and footer are identical on every page and there
is no template engine here, so they live in exactly one place -- index.html --
and this script splices each page's own <main> body into a copy of it. Run it
after editing anything in the shell; tools/stamp.py then re-stamps the asset
versions across all three files.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
BODIES = ROOT / "tools" / "pages"

PAGES = {
    "legal.html": dict(
        title="Legal · Arkchemy",
        desc="Arkchemy's privacy notice, trademark position, takedown route "
             "and the licence of every repository, served live from GitHub.",
        scripts=["js/legal.js"],
        nav="legal",
    ),
    "contributors.html": dict(
        title="Contributors · Arkchemy",
        desc="The people who build Arkchemy, the research the port leans on, "
             "and the beta-tester waiting list.",
        scripts=["js/contributors.js"],
        nav="contributors",
    ),
}


def main() -> int:
    index = (PUBLIC / "index.html").read_text()

    m = re.search(r'(<main id="main"[^>]*>)(.*?)(</main>)', index, re.S)
    if not m:
        print("sync_shell: no <main> in index.html", file=sys.stderr)
        return 1
    head_of_page = index[: m.start(2)]
    tail_of_page = index[m.end(2):]

    for name, cfg in PAGES.items():
        body = (BODIES / (name.replace(".html", "") + ".body.html")).read_text().rstrip("\n")
        page = head_of_page + "\n" + body + "\n\n    " + tail_of_page

        page = page.replace("<title>Arkchemy</title>", f"<title>{cfg['title']}</title>")
        page = re.sub(r'(<meta name="description" content=")[^"]*(")',
                      lambda mm: mm.group(1) + cfg["desc"] + mm.group(2), page, count=1)

        # The front page's script is the only part of the shell that is not
        # shared; swap it for this page's own.
        page = re.sub(r'\n *<script src="js/home\.js[^"]*"></script>',
                      "".join(f'\n    <script src="{s}"></script>' for s in cfg["scripts"]),
                      page, count=1)

        # Mark the current page in the nav so it is not a link to itself.
        page = page.replace(f'<a href="/{cfg["nav"]}">',
                            f'<a href="/{cfg["nav"]}" aria-current="page">')

        (PUBLIC / name).write_text(page)
        print(f"  wrote public/{name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
