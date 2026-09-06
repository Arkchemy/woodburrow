# Loading screen art — generation prompt

Matched to the two Ring of Heroes reference pieces: painterly ensemble splash
art, not character renders on a flat backdrop.

## What the references have in common

* **Ensemble, not portrait** — 3 to 5 characters overlapping across clear
  foreground / midground / background layers, bodies cropped by the frame
* **Big readable faces**, exaggerated proportions, everyone mid-expression
* **Strong backlight** — sun behind the group, warm rim light on every silhouette,
  gentle bloom into the lens
* **Dappled light** — soft bokeh spots falling across faces and shoulders
* **Silhouetted foreground framing** — dark out-of-focus leaves, spray or rock
  along the bottom edge to seat the group in the world
* **Saturated complementary palette** — magenta against green, warm orange
  against turquoise
* **Painterly brushwork**, semi-anime rendering; clean shapes, visible texture,
  no hard vector edges

## Base prompt

Fill in the bracketed parts.

> Painterly fantasy splash art, ultra-wide banner composition. An ensemble of
> [3–5 CHARACTERS] grouped close together and overlapping in depth, cropped by
> the frame at the edges, all mid-action and mid-expression — grinning,
> shouting, laughing. Exaggerated cartoon proportions, big expressive eyes,
> chunky stylised armour and gear with visible wear.
>
> Setting: [BIOME], receding into soft atmospheric haze behind them.
>
> Lighting: strong sun low behind the group, warm golden rim light tracing
> every silhouette, soft bloom blowing out the sky at the horizon, dappled
> bokeh light spots scattered across faces and shoulders. Bright bounce light
> filling the shadows so nothing reads as muddy.
>
> Foreground: dark out-of-focus [FRAMING ELEMENT] silhouetted along the lower
> edge, framing the group and giving depth.
>
> Palette: saturated and complementary — [PALETTE].
>
> Style: painterly digital illustration, semi-anime rendering, confident visible
> brushwork, clean shape language, rich colour, high detail on faces and
> hands. Mobile-game key art quality. No text, no logos, no UI, no watermark,
> no frame border.

## Ready-made variants

**Fire — the forge run**
> …an ensemble of Eruptor, Ignitor, Flameslinger and Sunburn … Setting: a
> volcanic ridge of black basalt and glowing lava channels, ash motes drifting,
> distant fire-lit peaks … Foreground: dark silhouetted obsidian shards and
> drifting embers … Palette: molten orange and ember red against deep teal
> shadow and violet sky.

**Water — the tide breaks**
> …an ensemble of Gill Grunt, Zap, Slam Bam and Wham-Shell riding a breaking
> wave … Setting: open sky-ocean with floating islands on the horizon, spray
> bursting around them, sunlight scattering through the water … Foreground:
> churning white spray and foam across the lower edge … Palette: turquoise and
> deep blue against warm sand gold and coral pink.

**Life — the canopy**
> …an ensemble of Stealth Elf, Camo, Zook and Stump Smash emerging through
> jungle undergrowth … Setting: dense sunlit canopy, huge leaves, hanging
> vines, shafts of light breaking through … Foreground: dark silhouetted ferns
> and broad leaves … Palette: vivid green and lime against magenta blossoms
> and warm amber light.

**Undead — the graveyard gate**
> …an ensemble of Chop Chop, Hex, Ghost Roaster and Cynder … Setting: a
> moonlit ruined graveyard, crooked headstones, drifting purple spirit wisps,
> fog pooling low … Foreground: dark silhouetted iron railings and bare
> branches … Palette: cold violet and spectral cyan against warm bone ivory
> and a single ember orange.

**The whole crew — the balloon**
> …a large ensemble of Skylanders crowded onto and hanging off an ornate
> plum-and-gold hot-air balloon … Setting: the open sky above the Ruins,
> floating islands drifting below, towering sunlit cumulus … Foreground: wisps
> of cloud blowing past the lower edge … Palette: warm gold and plum against
> bright turquoise sky.

## Sizes

| use | size | notes |
|-----|------|-------|
| in-game loading screen | **1920 x 1080** | Switch docked native; handheld downscales |
| website gallery | 2:1 crop, ~1600 x 800 | matches the Ring of Heroes references |

Compose for **16:9 with the group centred**, so a 2:1 banner can be cropped
from the same piece without losing anyone. Keep the outer ~6% clear of
important detail — TV overscan, and it gives the crop room.

Generate at the largest size the tool offers and downsample; painterly work
with soft gradients and bloom shows banding badly when upscaled.
