# Legal notes

Written 2026-09-06. Not legal advice, and not a claim of compliance with any
particular law. It records what the project actually does with data and content
so a real assessment can start from facts.

## What this project is

Arkchemy is a non-commercial fan preservation project. It is **not affiliated
with, endorsed by, or sponsored by Activision Publishing, Inc., Toys for Bob,
or any rights holder in the Skylanders series.** "Skylanders", "Spyro" and the
game titles and logos are trademarks of their respective owners and are used
here to identify the games being discussed, which is nominative use.

## Personal data

The site publishes information about identifiable people, which is personal
data under the UK/EU GDPR and comparable laws.

| what | where from | why |
|---|---|---|
| Discord display name, user id, avatar | Discord Bot API | crediting contributors, showing progress posts and the beta-tester list |
| GitHub username, avatar | GitHub public API | crediting contributors |
| message text and timestamps | Discord channels the project runs | the public FAQ and progress feed |

Details that matter:

* **No cookies, no analytics, no tracking.** The site sets no cookies and uses
  no browser storage. There is nothing to consent to under the ePrivacy
  Directive / PECR, which is why there is no cookie banner.
* **No visitor data is collected.** Requests are served by Vercel, which keeps
  its own operational logs as a processor; the project stores nothing itself.
* **Third-party images are proxied**, so a visitor's browser never contacts
  Discord or GitHub directly and those services do not see visitors' IPs.
* **Only public information is shown.** Everything comes from a public GitHub
  profile or a message posted in the project's own Discord.
* **Lawful basis** is legitimate interest (crediting people who worked on a
  public project, and publishing the project's own announcements). Anyone who
  would rather not appear can say so and will be removed — see Contact.
* **Rights.** Access, rectification, erasure, objection and restriction can all
  be exercised by contacting the project. Removal is the practical remedy for
  everything here, since none of it is required to be retained.
* **Retention.** Nothing is stored. Every name, avatar and message is fetched
  live from Discord or GitHub when the page loads, cached briefly at the CDN,
  and disappears when it is removed at the source. Contributor credits live in
  CONTRIBUTORS.csv in this repository.
* **Children.** The project is not directed at children and asks for no
  personal data from anyone.

## Content that is not ours

**This is the project's largest legal exposure and it is not solved by a
policy document.**

### Removed 2026-09-20: Activision's own website

Until this date the site's header was the **Skylanders: Trap Team homepage
header**, taken from a web.archive.org capture and reassembled:

| what | detail |
|---|---|
| 7 header images | `balloon.png`, `cloud.png`, `island*.png`, `cloud-header-bg.jpg` — byte-for-byte identical to the originals, and served on every page |
| `cloud-header.css` | Activision's keyframes (`Floatingx`, `Floatingz`, `cloudHeader`), their `.atvi-image` class name, and a comment quoted from their stylesheet |
| `tt-homelibs.js`, `tt-homelibs.css` | 366 KB of Activision's minified front-end, in the repository (not deployed), still carrying the Wayback Machine's `_____WB$wombat$assign$function_____` rewriting wrapper |
| `branding/archive-assets/` | 23 MB across 263 files mirroring skylanders.com, including ESRB "Privacy Certified Kids" certification marks |

This was a different kind of exposure from the rest of this page and worth
naming plainly. Using a trademark to say which game you are talking about is
nominative use. Showing a low-resolution character portrait to identify a
character is the ordinary practice of every fan site. **Shipping the rights
holder's own website — their art, their stylesheet, their class names —
is neither.** No fair-dealing or fair-use argument reaches it, and the
Wayback wrapper made the provenance self-evident to anyone who opened the
file.

All of it has been deleted. The header is now drawn for this project: a CSS
gradient sky with four SVG islands, two clouds and a balloon, 3.7 KB of
vector art in `public/images/sky/`, with animation names of our own. It also
happens to be 184 KB smaller.

Two things this does **not** fix, and both are the owner's call:

* **Git history.** Deleting files from the working tree does not remove them
  from earlier commits. Removing them properly needs a history rewrite and a
  force push. The same is true of the 1,848 voice clips noted below.
* **A public statement of intent.** The progress feed on the site's own front
  page currently reads: *"featuring official assets from old Skylanders
  snapshots on the wayback machine alongside voice lines from the Skylanders
  wiki and some ripped from the game"*. That post is fetched live from
  Discord, so it cannot be edited from this repository. It should be, because
  a documented statement that copying was deliberate removes any argument
  that it was inadvertent.

### Still here, and a real risk

These are disclosed rather than solved, because unlike the header they are
load-bearing for pages people actually use:

* **~33 MB of character renders, roster portraits and box art** from fan
  wikis, under `public/images/renders`, `roster`, `characters` and
  `portraits`. Third-party promotional art, used to identify the characters
  it depicts. Standard practice for a fan site; not a licence. Removing it
  would empty the Skylanders page, so it is a judgement call rather than an
  oversight.
* **14 short voice clips** ripped from the game, played as citations. The
  1,848-clip corpus committed on 2026-09-06 was removed the same day: the
  project's whole position is that it distributes no game content, and an
  asset dump of that size contradicted it. The comparison to a wiki hosting a
  handful of catchphrases does not survive at that scale. The extraction
  method stays documented in `branding/voicelines/FINDINGS.md` so anyone with
  their own disc can reproduce it locally.
* **Game logos**, used nominatively to identify each title.

That material is copyrighted by its owners. It is included for documentation
and preservation, non-commercially, and the project makes no ownership claim.
Whether any given use is defensible varies by jurisdiction, and "fan project"
is not itself a legal defence anywhere.

This is consistent with LICENSE clause 6 and with the project plan, which
records the local-tool architecture as an owner decision taken for exactly
this reason: the tool "never touches or redistributes Activision's
assets/code itself".

The recompiler itself contains no game code or assets. It transforms a copy the
user already owns, on the user's own machine, and no build output is
distributed.

## Takedown

If you hold rights in anything here and want it removed, contact the project
and it will be taken down promptly. No counter-notice process, no argument, no
requirement to prove ownership beyond a plausible claim. This is a hobby
project and nothing in it is worth a dispute.

## Accessibility

The site targets WCAG 2.2 AA. What is in place: one `h1` and a heading order
with no skipped levels, a skip-to-content link, visible focus rings, text
alternatives on every image, colour contrast checked per element theme (worst
case 6.4:1 against white), motion that fully collapses under
`prefers-reduced-motion`, and a layout that reflows to 320px without horizontal
scrolling. Not yet verified: screen-reader testing with a real assistive
technology, and keyboard traversal of the marquee.

## Warranty

Provided as-is, with no warranty. Nothing here is a guarantee that running any
of it is lawful where you live; that is your responsibility.

## Contact

Open an issue at <https://github.com/Arkchemy> or reach the project through its
Discord.
