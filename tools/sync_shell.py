#!/usr/bin/env python3
"""Rebuild the sub-pages from index.html's shell.

The head, sky header, nav and footer are identical on every page and there
is no template engine here, so they live in exactly one place -- index.html --
and this script splices each page's own <main> body into a copy of it. Run it
after editing anything in the shell; tools/stamp.py then re-stamps the asset
versions across all three files.
"""
import pathlib
import re
import sys

# encoding="utf-8" on every read and write, explicitly.
#
# Path.read_text()/write_text() use the platform default, which is UTF-8
# on Linux and cp1252 on Windows. Running this on Windows silently wrote
# the interpunct in each page title as a bare 0xB7 byte -- invalid UTF-8
# in a page that declares charset=utf-8, so every sub-page title rendered
# with a replacement character. Nothing warns; it only shows in a browser.

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
BODIES = ROOT / "tools" / "pages"

# The live host. Named here once; findings.json, progress.json and
# discord/rules.json carry the same value and must not drift from it.
SITE = "https://arkchemy.vercel.app"

PAGES = {
    "games.html": dict(
        path="/games",
        title="The games · Arkchemy",
        desc="The six Skylanders games, all on the same Alchemy engine, and "
             "why the five that are not being ported still matter to the port.",
        scripts=["js/games.js"],
        nav="games",
    ),
    "skylanders.html": dict(
        path="/skylanders",
        title="Skylanders · Arkchemy",
        desc="Every Skylander across all six games, by element, with "
             "portraits, catchphrases and moves.",
        scripts=["js/skylanders.js"],
        nav="skylanders",
    ),
    "progress.html": dict(
        path="/progress",
        title="Progress · Arkchemy",
        desc="The Arkchemy build log, posted as it happens — including the "
             "days where the finding is that something does not work.",
        scripts=["js/progress.js"],
        nav="progress",
    ),
    "faq.html": dict(
        path="/faq",
        title="Questions · Arkchemy",
        desc="Common questions about the Skylanders Switch port: whether there "
             "is a download, what it needs, and what is actually working.",
        scripts=["js/faq.js"],
        nav="faq",
    ),
    "findings.html": dict(
        path="/findings",
        title="Findings · Arkchemy",
        desc="What taking the Alchemy engine apart has established, how "
             "confident we are in each, and where we were wrong.",
        scripts=["js/findings.js"],
        nav="findings",
    ),
    "legal.html": dict(
        path="/legal",
        title="Legal · Arkchemy",
        desc="Arkchemy's privacy notice, trademark position, takedown route "
             "and the licence of every repository, served live from GitHub.",
        scripts=["js/legal.js"],
        nav="legal",
    ),
    "404.html": dict(
        path=None,
        title="Not found · Arkchemy",
        desc="That page is not here. The project, the roster, the games and "
             "the contributors all are.",
        scripts=[],
        nav=None,
    ),
    "contributors.html": dict(
        path="/contributors",
        title="Contributors · Arkchemy",
        desc="The people who build Arkchemy, the research the port leans on, "
             "and the beta-tester waiting list.",
        scripts=["js/contributors.js"],
        nav="contributors",
    ),
}


def main() -> int:
    index = (PUBLIC / "index.html").read_text(encoding="utf-8")

    m = re.search(r'(<main id="main"[^>]*>)(.*?)(</main>)', index, re.S)
    if not m:
        print("sync_shell: no <main> in index.html", file=sys.stderr)
        return 1
    head_of_page = index[: m.start(2)]
    tail_of_page = index[m.end(2):]

    for name, cfg in PAGES.items():
        body = (BODIES / (name.replace(".html", "") + ".body.html")).read_text(encoding="utf-8").rstrip("\n")
        # Sub-pages sit in one centred column; the front page lays out its
        # own full-width bands, which is why this wrapper is added here and
        # is not part of the shell.
        page = (head_of_page + '\n        <div class="wrap page">\n' + body +
                "\n        </div>\n\n    " + tail_of_page)

        page = page.replace("<title>Arkchemy</title>", f"<title>{cfg['title']}</title>")
        page = re.sub(r'(<meta name="description" content=")[^"]*(")',
                      lambda mm: mm.group(1) + cfg["desc"] + mm.group(2), page, count=1)

        # Share metadata. This has to be rewritten per page rather than
        # inherited: the shell comes from index.html, so without this every
        # page would carry the front page's og:url and og:title and each one
        # would announce itself as the home page when shared. og:image is the
        # same card everywhere, which is deliberate -- one recognisable card
        # beats five near-identical ones.
        if cfg["path"] is None:
            # No canonical, no og:url, and tell crawlers to stay away. An
            # error page that canonicalises to itself claims to be the real
            # answer for every broken URL that lands on it.
            page = re.sub(r'\s*<link rel="canonical"[^>]*>', '', page, count=1)
            page = re.sub(r'\s*<meta property="og:url"[^>]*>', '', page, count=1)
            page = page.replace('<meta property="og:type"',
                                '<meta name="robots" content="noindex">\n'
                                '<meta property="og:type"', 1)
            url = None
        else:
            url = SITE + cfg["path"]
        for prop, val in ((("og:url", url) if url else ("og:site_name", "Arkchemy")),
                          ("og:title", cfg["title"]),
                          ("og:description", cfg["desc"]),
                          ("twitter:title", cfg["title"]),
                          ("twitter:description", cfg["desc"])):
            attr = "property" if prop.startswith("og:") else "name"
            page = re.sub(rf'(<meta {attr}="{prop}" content=")[^"]*(")',
                          lambda mm, v=val: mm.group(1) + v + mm.group(2),
                          page, count=1)
        if url:
            page = re.sub(r'(<link rel="canonical" href=")[^"]*(")',
                          lambda mm: mm.group(1) + url + mm.group(2), page, count=1)

        # The front page's script is the only part of the shell that is not
        # shared; swap it for this page's own.
        page = re.sub(r'\n *<script src="js/home\.js[^"]*"></script>',
                      "".join(f'\n    <script src="{s}"></script>' for s in cfg["scripts"]),
                      page, count=1)

        # index.html marks Home as the current page; no sub-page is Home.
        page = page.replace('<a href="/" aria-current="page">Home</a>',
                            '<a href="/">Home</a>', 1)

        # Mark the current page in the nav so it is not a link to itself.
        if cfg["nav"]:
            page = page.replace(f'<a href="/{cfg["nav"]}">',
                                f'<a href="/{cfg["nav"]}" aria-current="page">')

        (PUBLIC / name).write_text(page, encoding="utf-8")
        print(f"  wrote public/{name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
