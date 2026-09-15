# Quality, ethics and legal assessment

Written 2026-09-15. Covers the website (woodburrow), the lobby client (armory)
and, where it touches either, the port itself (jouster).

Two notes on scope before anything else, because getting these wrong would
make the rest of the document worthless:

**ISO/IEC 25010:2023, not 2011.** The 2023 revision supersedes 2011. It renames
*Usability* to **Interaction Capability** and *Portability* to **Flexibility**,
and adds **Safety** as a ninth characteristic. Anything still citing the eight
2011 characteristics is out of date. This document uses the 2023 model.

**IPC standards do not apply here.** IPC is the Association Connecting
Electronics Industries; IPC-A-610 governs solder joint acceptability, IPC-2221
bare board design. They are manufacturing standards for physical electronics
and have no software provisions. If an IPC-style assurance is wanted, the
nearest real equivalents are ISO/IEC 25010 for product quality (used below),
ISO/IEC 27001 for information security management, and WCAG 2.2 for
accessibility. Claiming IPC conformance for a website would be meaningless.

---

## 1. ISO/IEC 25010:2023 — product quality

Assessed honestly. "Met" means checked, with the check named. Anything not
checked is listed as not assessed rather than assumed good.

### Functional suitability — **met**
Every page serves its stated purpose and the data behind it is real: 317
catalogue entries, 78 styles, the element model, every count on screen derived
rather than typed. The two live feeds degrade to a stated reason when a channel
is empty rather than to a blank area.

### Performance efficiency — **met, with one measured fix**
Assets are stamped by mtime so a changed file is fetched and an unchanged one
is not. Images are capped at their intrinsic width rather than upscaled, and
the Chompy Party art was reduced from 2000×2000/3MB originals to 1400px web
copies. Animations are transform/opacity only, so none of them trigger layout.

In jouster, the `bash.mov` conversion loop was doing a 64-bit integer divide
**per pixel** — 921,600 per frame — plus a 3.7MB `memset` per frame. Both
removed; the divide is now a table built once per video.

### Compatibility — **met**
One origin. Every third-party resource is proxied through `/api/` so a
visitor's browser never contacts GitHub or Discord directly. Verified at 375px,
1000px, 1280px and 1440px with no horizontal overflow at any of them.

### Interaction capability — **met**
- Contrast measured, not eyeballed. Every text pair on the site is **AAA**
  (lowest is 9.34:1 against a 4.5:1 AA requirement).
- Skip link, `lang="en"`, alt text on every image, width/height on content
  images to prevent layout shift.
- Heading hierarchy verified on all eight pages — no skipped levels.
- `prefers-reduced-motion` honoured in **13** separate blocks. Every animation
  added this week, including the Chompy banner, goes fully still.
- `aria-current` marks the active page; a scrollspy marks the active section.

### Reliability — **met**
The reveal system has a failsafe: anything unrevealed 1.5s after load is shown
regardless, because `IntersectionObserver` does not fire in a background tab
and a page that stays blank is worse than one that does not animate. Both
feeds have explicit failure states. A 404 page exists and is `noindex`.

### Security — **met**
- CSP is `default-src 'none'` with an explicit allowlist; no inline script.
- HSTS with preload, `nosniff`, `X-Frame-Options: DENY`, COOP/CORP same-origin,
  a restrictive `Permissions-Policy`.
- No third-party script, so no SRI gap and no supply chain in the page itself.
- Every `target="_blank"` carries `rel="noopener"` — verified, none missing.
- `robots.txt` keeps crawlers out of `/api/`.
- **Added:** `/.well-known/security.txt` (RFC 9116) with a disclosure route and
  an explicit out-of-scope list.
- Secrets: the Vercel blob token is in `.env.local`, gitignored, and a sweep of
  every file staged across all five repositories found no credential. The only
  match was the *line of code that reads* the token.

### Maintainability — **met**
One shell in `index.html`, spliced into every sub-page by `sync_shell.py`;
`stamp.py` now derives its page list from the directory rather than a hardcoded
list that had already fallen out of step. Generated art (`og-card.png`, the
Armory lobby sky) has a tool that reproduces it, verified by deleting and
regenerating.

### Flexibility — **partial**
Responsive and dependency-light. But the site is deployment-coupled to Vercel:
`cleanUrls`, the headers block and the serverless routes are Vercel-shaped.
Moving hosts means rewriting `vercel.json` and porting four functions. Worth
knowing; not worth fixing today.

### Safety — **not applicable, with one caveat**
Nothing here can cause physical harm. The caveat is honesty about capability:
a project claiming a playable port that does not exist would push people toward
unofficial downloads. The site states plainly that there is no download and
why. That is the safety-relevant behaviour, and it is already right.

### Not assessed
Cross-browser testing beyond Chromium; screen-reader testing with an actual
screen reader; load behaviour under traffic. None should be claimed.

---

## 2. Ethics and law

### How much can we call it "Skylanders"?

The honest answer: **use the name to describe, never to brand.**

*Skylanders* is an Activision trademark. Using someone's trademark to refer to
their product is generally defensible — nominative fair use, roughly: you may
use the mark where there is no other way to identify the thing, use no more of
it than necessary, and do nothing suggesting sponsorship or endorsement. This
is why a review can name the game it reviews.

What that permits, and what it does not:

| Defensible | Not defensible |
| --- | --- |
| "Arkchemy is porting *Skylanders: Spyro's Adventure*" | "Skylanders Online", "Skylanders HD" as **our** product name |
| A roster page naming characters factually | Activision's logo or wordmark as site furniture |
| "not affiliated with Activision" stated plainly | Anything implying approval, partnership or official status |

**Where this project currently sits.** The site is careful: it describes rather
than brands, and the disclaimer is present. But two things are worth watching.

`armory` is internally described as *"the Skylanders Online client"* and the
lobby prints **"SKYLANDERS ONLINE"** on its featured card. That reads as a
product name, which is the one thing nominative use does not cover. It is
codenamed Armory publicly, which is right; the string on screen is not. **This
should be changed** — it costs nothing and is the clearest trademark exposure
in the codebase.

The character artwork and renders are a separate matter from the name, and a
weaker position: those are copyrighted works, and nominative fair use is a
trademark doctrine, not a copyright one. Their use here is non-commercial,
transformative in context and small-scale, which is the shape of a fair-dealing
argument — but it is an argument, not a safe harbour. Keeping the takedown
route prominent is the right posture, and it is already on `/legal`.

### The port itself

Static recompilation of a game you own, for hardware you own, shipping no game
code and no assets, is the strongest version of this. Three properties matter
and all three hold:

1. **No asset ships.** The recompiled C is gitignored; `regenerate.sh` requires
   the user's own dump.
2. **No circumvention is distributed.** The project does not ship keys, a
   decrypter or a means of obtaining the game.
3. **It preserves rather than substitutes.** The Wii U shop is closed and the
   servers are gone. This competes with nothing that is for sale.

None of that is legal advice, and none of it makes the project immune. It makes
it defensible, which is different and is the most any fan port gets.

### Promoting Chompy Party

Someone else's game, promoted with their knowledge. The banner states we are
not affiliated and had no hand in it, twice, inside the banner rather than in
small type beneath it. That is the right structure: the disclaimer travels with
the content when it is screenshotted.

### Data and people

The contributor list carries real names, Discord IDs and GitHub links. Those
are already-public identifiers volunteered by the people involved — but anyone
listed should be able to leave. If there is no route for that today, there
should be, and `/legal` is where it belongs.

Avatars are proxied rather than hotlinked, which keeps visitors' IPs out of
Discord's logs. That is a real privacy decision and a good one.

---

## 3. What should change next

1. **Rename the on-screen "SKYLANDERS ONLINE" string in armory.** Clearest
   trademark exposure, smallest fix.
2. **A removal route for contributors** on `/legal`.
3. **Screen-reader testing.** The markup is right in every way that can be
   checked statically; that is not the same as being usable with a screen
   reader.
4. **Note the Vercel coupling** in the README so a future migration is not a
   surprise.
