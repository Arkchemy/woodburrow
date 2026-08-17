# Bramble's website

Plain static HTML/CSS, no build step, no framework — landing page,
Terms of Service, and Privacy Policy. Intentionally simple, matching
this project's own "free, no unnecessary dependencies" approach.

**Legal pages are a strong first draft**, not reviewed by a lawyer yet
— see the notice on each page. Update them (and this note) once they
have real legal review, especially before Skylanders Online actually
collects any account data for real.

## Deploying (Vercel)

No build step needed — this is plain static HTML/CSS. `vercel.json`
in this folder is already set up for it. To connect:

1. In the [Vercel dashboard](https://vercel.com), import the
   `aaronateataco/thornybush` GitHub repo as a new project.
2. In the project's settings, set **Root Directory** to `website`.
3. Leave **Build Command** and **Output Directory** blank/default —
   there's nothing to build, Vercel will serve the folder as-is.
4. Deploy. Every push to `main` that touches `website/` will
   auto-redeploy from then on.

Update the nav/footer links in all three `.html` files (plus this
README) if the GitHub repo URL ever changes — the
[Bramble Discord invite](https://discord.gg/KJWyHUczCV) is permanent
and won't change.
