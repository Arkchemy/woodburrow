# Arkchemy wordmark

Outlined vector — every letter is a path, so there is no font to install and
nothing to go missing at the other end. Straight-line segments only (no
curves), which is how the letterforms were drawn.

| file | what it is |
|------|------------|
| `arkchemy-wordmark.svg` | the logo: gold fill, plum outline |
| `arkchemy-wordmark-solid-plum.svg` | one colour, plum |
| `arkchemy-wordmark-black.svg` | one colour, black — for recolouring |
| `arkchemy-wordmark-outline.svg` | outline only, no fill |
| `*@3000.png` | 3000 x 515 transparent PNG of each |

**Colours** — gold `#F3C34E`, plum `#3D1140`.

**viewBox** is `-14 -14 746 128`; the artwork is 718 x 100 with 14 units of
padding so the outline is never clipped. It scales to anything.

## For the designer

* The outline sits **outside** the letterforms, via `paint-order="stroke fill"`.
  A centred stroke (what CSS `-webkit-text-stroke` does) eats into the counters
  and visibly thins the A and the R. If the outline weight is changed, keep
  `paint-order` — or convert the stroke to an outlined path.
* `fill-rule="evenodd"` — the counters in A, R and the rest are holes in the
  same path, not separate shapes.
* No `currentColor` anywhere: SVG loaded through an `<img>` is an isolated
  document and would resolve it to black.
* Regenerate with `python3 build_svg.py`. Letterforms live in
  `public/lab/wordmark.html`, which is also what the display font is built
  from, so the SVG, the font and the site stay in step.
