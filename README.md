## Architecture

* **Single-page app, zero build step.** `index.html` is the entire site —
  Home, Downloads, License, Terms, and Privacy are `<section>`s toggled by a
  small hash-router (`navigate()`), not separate pages. Styling is Tailwind
  CSS loaded from the CDN (`cdn.tailwindcss.com`) plus a small `<style>`
  block for effects Tailwind's utility classes don't cover (gradients,
  keyframe animations, the language-breakdown bar).

* **Live GitHub data, not hand-written copy.** The Downloads page and the
  home page's stat strip call the public, unauthenticated GitHub REST API
  (`api.github.com/repos/aaronateataco/thornybush`) directly from the
  browser to render real stars/forks/watchers/issues, a language
  breakdown, the latest commit, and the full release history — including
  resolving whether the newest *tag* or the newest *release* is actually
  more recent, and offering a download for either. The License page does
  the same against the raw `LICENSE` file and its commit history. If the
  GitHub API is unreachable or rate-limited, each of these degrades to a
  visible error state with a direct link to GitHub, never a blank page.

* **`lore.html` / `terms.html` / `privacy.html`** are now thin redirect
  stubs (`index.html#downloads`, `#terms`, `#privacy`) kept only so old
  bookmarks/links don't 404. Don't add real content to them — edit the
  matching `<section>` in `index.html` instead.

* **`vercel.json`** handles clean URL routing for the Vercel deployment.

## Deployment Setup

Deployed on Vercel at `thornybush.vercel.app`. Vercel's project root is the
repository root (not `website/`), which is why asset paths in `index.html`
use `../branding/...` — confirm that root-directory setting isn't changed,
or those paths will break.
