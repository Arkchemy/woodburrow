# Arkchemy intro sting — generation prompt

Publisher-logo sting in the vein of the Toys for Bob / Vicarious Visions /
Activision idents that play before Skylanders: Spyro's Adventure. Plays after
the last licensed ident and before the title screen.

## The prompt

> A short cinematic studio-logo intro, 6 seconds, no text until the reveal.
>
> Open tight inside a bank of soft, sunlit cumulus cloud — we are *in* the
> cloud, warm white filling the frame, faint golden light diffusing through it
> from behind. The camera pushes forward slowly and steadily.
>
> At 1.5s the cloud begins to part: two great billowing masses roll apart
> horizontally like curtains, tumbling and curling at their torn edges, lit
> from behind with warm rim light. Wisps trail and dissipate across the lens.
>
> Through the opening, a bright turquoise sky (#59c2f0) with scattered
> flat-bottomed cartoon cumulus, and far below, sunlit floating islands with
> green tops and rocky undersides drifting slowly — a warm, storybook fantasy
> sky, painted and slightly stylised rather than photoreal.
>
> At 3s a small ornate hot-air balloon rises into frame from below centre,
> gently bobbing: a deep plum (#3d1140) envelope banded with gold (#f3c34e),
> a compass-rose emblem on its face, small glowing orbs of magenta and green
> at its rigging, and a woven basket beneath. It settles at centre and holds,
> swaying very slightly.
>
> At 4s the balloon resolves into a clean flat emblem, and the wordmark
> ARKCHEMY fades and scales up beneath it — a bold flared wedge-serif in gold
> (#f3c34e) with a thick plum (#3d1140) outline, letter-spaced, centred.
> A soft golden light-bloom sweeps left to right across the lettering once.
>
> Final second: everything holds still, clouds drifting gently at the edges,
> the balloon bobbing almost imperceptibly. Warm, magical, welcoming.
>
> Style: stylised 3D or high-quality 2.5D animation, warm golden-hour palette,
> soft volumetric light, gentle camera motion, no harsh cuts, no lens flare
> spam, no text other than the wordmark. 16:9, authored at 1920x1080.

## Audio

A soft rising orchestral swell — strings and harp — with a light wind/whoosh
as the clouds part and a single warm chime landing on the logo reveal.
Roughly 6 seconds, resolving on a held major chord.

## Delivery for the port

Author for the **Switch**, not the Wii U. Docked output is 1920x1080; the
handheld panel is 1280x720 and the console downscales for it. The Wii U's
1280x720 framebuffer is the *source game's* size and is the wrong target for a
new asset -- mastering at 720p would leave the sting visibly soft on a TV while
everything around it is sharp.

| | |
|---|---|
| master | **1920 x 1080** (docked native); the Switch downscales for handheld |
| framerate | 60 fps preferred, 30 fps acceptable |
| duration | 5-7 s; it plays on every boot, so keep it short |
| video | **H.264 High, yuv420p** -- the devkitPro ffmpeg in the portlib carries averne's Tegra hardware decoder, so no forked ffmpeg or mpv is needed |
| audio | AAC or PCM stereo 48 kHz, matching `bootSound.btsnd` (raw 16-bit stereo PCM at 48 kHz) |
| container | MP4 |

Render the source at 3840x2160 if the tool allows and downsample to 1080p --
the cloud wisps and the bloom across the lettering are exactly the sort of
soft-edged detail that shows compression artefacts at low bitrates.

Bink is the other option -- the portlib's ffmpeg decodes it, and it is what the
game's own movies use -- but H.264 is hardware-decoded on Switch and is the
cheaper path.

```
ffmpeg -i arkchemy-intro.mov -vf scale=1920:1080:flags=lanczos -r 60 \
       -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 17 \
       -c:a aac -ar 48000 -ac 2 -b:a 192k arkchemy-intro.mp4
```

If you would rather ship a handheld-specific copy than rely on the console's
scaler:

```
ffmpeg -i arkchemy-intro.mp4 -vf scale=1280:720:flags=lanczos \
       -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 \
       -c:a copy arkchemy-intro-720.mp4
```

**Make it skippable on any button press.** It plays on every cold boot, and an
unskippable ident is the fastest way to make a port feel worse than the
original.
