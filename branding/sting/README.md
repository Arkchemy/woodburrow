# Arkchemy intro sting

`arkchemy-intro.mp4` — 1920x1080, 30 fps, 7.2 s, H.264 High / yuv420p, 6.7 MB.

Rendered from the `Arkchemy Sting.dc.html` animation in this folder. The
animation is a React/JSX piece, not a video, so it was captured frame by frame:
its runtime exposes a `data-om-seek-to-time-frame` event and documents that "a
seeked frame is a deterministic render at that time", so each frame was seeked,
the stage's `svg`/`foreignObject` serialised, rasterised to a canvas and posted
to a local sink. Regenerating means repeating that; the frames are not kept.

Two things that will bite anyone repeating it:

* SVG rendered through an `<img>` is an **isolated document with no network
  access** — every `uploads/*.png` has to be inlined as a `data:` URL first or
  the balloon, clouds and islands render blank and you get a bare sky gradient.
* The stage draws at its **native size** inside the canvas, not scaled to fill,
  so the output needs `crop=1842:1036:39:22` before scaling to 1080p. Measure
  it, do not assume it — the offset is exactly the centring margin.

Fedora's `ffmpeg-free` has no `libx264`; `libopenh264` is present and was used.

## Status in the port: NOT wired in yet

The asset is ready and matches the delivery spec, but it is **not playing in
jouster**. Boot still stalls in archive decompression well before the game's own
logo movies, so the intended insertion point is not reachable, and the existing
video path in `main.c` is Bink-specific (`arkchemy_bink_video_play`,
`arkchemy_video_present`) rather than H.264.

What remains, in order:

1. Clear the pool-frame-manager stall so boot reaches movie playback at all
   (see `jouster/test-results/2026-09-06-pool-manager-snapshot.md`).
2. Decode H.264 through the portlib ffmpeg — the findings already record that
   "the devkitPro ffmpeg already decodes Bink and has hardware H.264, so no
   forked tree is needed", so this is a new call path, not a new dependency.
3. Call it from the boot sequence **after** the licensed idents finish and
   before the title screen. `ARKCHEMY_SPLASH_FIRST` in `main.c` shows where the
   early-boot presentation hook lives.
4. Make it skippable on any button press after the first viewing.

Until step 1 lands, wiring steps 2-4 could not be tested on hardware, so they
are deliberately not written blind.

## Licence

All five Arkchemy repositories now require derivative works with a visual front
end to play this sting unmodified at startup, or to show the Arkchemy logo with
"Built on Arkchemy" on a screen the user reaches in normal use. See clause 2 of
any repository's LICENSE.
