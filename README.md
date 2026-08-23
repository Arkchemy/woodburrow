# woodburrow

The public website for [Arkchemy](https://github.com/Arkchemy), deployed on
Vercel.

This repository holds the site and the small set of serverless routes it calls.
It contains no game code and no game assets.

## Layout

| Path | What it is |
| --- | --- |
| `public/` | The static site — `index.html`, `css/site.css`, `js/site.js`, images |
| `branding/` | Logo source files (SVG / PNG) |
| `api/` | Vercel serverless functions (see below) |

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
