# Bramble's website

Plain static HTML/CSS, no build step, no framework — landing page,
Terms of Service, and Privacy Policy. Intentionally simple, matching
this project's own "free, no unnecessary dependencies" approach.

**Legal pages are a strong first draft**, not reviewed by a lawyer yet
— see the notice on each page. Update them (and this note) once they
have real legal review, especially before Skylanders Online actually
collects any account data for real.

## Deploying

No build step needed — any static host works. A few free options:

- **GitHub Pages**: either move this folder's contents to the repo
  root, or (recommended, keeps the repo layout as-is) serve it via a
  small GitHub Actions workflow that publishes `website/` to the
  `gh-pages` branch or Pages' own "deploy from a specific folder"
  option, depending on what GitHub currently supports when this is set
  up.
- **Cloudflare Pages / Netlify / Vercel**: point either at this repo
  with `website/` as the build output directory and no build command.

Update the nav/footer links in all three `.html` files if the
Discord invite or GitHub repo URL ever change.
