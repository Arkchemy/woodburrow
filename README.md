# woodburrow

The public website for [Arkchemy](https://github.com/Arkchemy), deployed on
Vercel.

This repository holds the site and the small set of serverless routes it calls.

It contains **no game code**. It does contain some game-derived *content*: 14
short voice clips and a large set of character renders and box art taken from
fan wikis, all used to illustrate the site. Saying it holds "no game assets"
would be untrue, and `LEGAL.md` sets out exactly what is here and why.

## Layout

| Path | What it is |
| --- | --- |
| `public/` | The static site — `index.html`, `css/site.css`, `js/site.js`, images |
| `branding/` | Logo source files (SVG / PNG) |
| `api/` | Vercel serverless functions (see below) |

## The front page's hero

`public/js/cinema.js` renders it: a floating island drawn as 3D Gaussian
splats, seen through a lens of liquid glass, played by the scroll. It is
our own WebGL2 code, with no libraries, and the island is generated in the
browser from a fixed seed, so it costs no download. Without WebGL2 the plain
CSS sky is the hero; with reduced motion it is a still frame.

The same renderer draws real captures. Film something, reconstruct it with
[Open Reality](https://github.com/reality-opened/openreality) or any 3D
Gaussian Splatting tool, convert the `.ply` with `tools/ply_to_splat.py`,
put the result in `public/scene/` and name it in `data-scene` on the canvas
in `index.html`. The script's docstring has the details. Anything you film
is yours to publish or not, so check the frame first.

The glass lens that climbs and shrinks takes its idea from Appllama's
[liquid-glass-screens](https://github.com/appllama/liquid-glass-screens), a
React Native study. That repository is GPL-3.0 and asks that its artwork not
be reused, so none of its code or artwork is here: the shader and the motion
were written for this site.

## Deployment coupling

This site is Vercel-shaped and worth knowing about before a move. `cleanUrls`
gives the pages their extensionless URLs, the security headers are all declared
in `vercel.json`, and the four routes under `api/` are Vercel serverless
functions. Moving hosts means porting those four functions and re-declaring the
headers somewhere else; the static pages themselves would move unchanged.

Noted rather than fixed: one host is the right call today, and an abstraction
layer for a move nobody has planned would cost more than it saves.

## Serverless routes

All four exist so a visitor's browser only ever talks to this one origin,
rather than being sent off to GitHub or Discord directly. That keeps visitors'
IP addresses out of third-party request logs for services they didn't ask to
contact, and it means one shared, edge-cached lookup is spent against
GitHub's unauthenticated rate limit instead of one per visitor.

| Route | Purpose |
| --- | --- |
| `api/github-user.js` | Looks up a GitHub user's display name and avatar |
| `api/github-repos.js` | Proxies the Arkchemy org's public repo listing |
| `api/discord-avatar.js` | Resolves a Discord avatar via Discord's official Bot API |
| `api/avatar-image.js` | Streams avatar image bytes back through this origin |

`discord-avatar.js` requires a Discord bot token in the environment; the other
three need no credentials.

## Contributing

The site's own content and styling (`public/index.html`, `public/css/site.css`)
are maintained directly by the project owner. Please raise an issue or ask on
Discord before opening a PR that changes them — fixes to the `api/` routes,
docs, and tooling are much easier to take.

## Licence

See [`LICENSE`](LICENSE) — Arkchemy Free & Source-Available License v2.0. It is
**not** an OSI-approved open source licence and some uses require permission,
so please read it before reusing anything here. Contact details and the
project Discord are in [`llms.txt`](llms.txt).

Contributors are listed in [`CONTRIBUTORS.csv`](CONTRIBUTORS.csv); the codename
scheme is explained in [`CODENAMES.md`](CODENAMES.md).

## Documentation

| Document | What it covers |
| --- | --- |
| [`ROADMAP.md`](ROADMAP.md) | Standing rules for honest reporting, and what is open |
