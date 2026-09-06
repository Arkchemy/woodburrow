# Arkchemy server emoji

Names use `firstSecond`: first word lowercase, each later word capitalised, no
separators. Discord allows letters, digits and `_` in emoji names, so these all
upload as written.

Upload them in **Server Settings → Emoji → Upload Emoji**, then name each one
exactly as in the `name` column. The site reads the same names from
`public/emoji.json`, so once an emoji exists you only have to paste its id in
there and `:thatName:` works on the website as well as in Discord.

**Getting an id:** post the emoji in any channel, right-click it → *Copy Link*.
The link ends `…/emojis/1543926752856776804.webp` — the number is the id.

**Limits on a level-0 server:** 50 static + 50 animated, 256 KB each. Upload at
128×128 PNG with transparency; Discord downscales to 32×32 for display, so
anything with fine detail needs to survive that.

---

## Project (4)

| name | what it should be |
|---|---|
| `arkchemy` | the Arkchemy balloon mark, cropped tight |
| `arkFlask` | the alchemy flask from the logo, on its own |
| `portalPower` | a Portal of Power seen from above, glowing ring |
| `soulGem` | a soul gem — for when someone finds something genuinely rare |

## Build and progress (6)

These are the ones the progress channel will lean on hardest.

| name | what it should be |
|---|---|
| `buildPass` | green tick, chunky enough to read at 32px |
| `buildFail` | red cross, same weight as `buildPass` |
| `bootLoop` | a looping arrow — "still not booting" |
| `bigBrain` | a brain, for an actual breakthrough |
| `bugSquash` | a squashed bug |
| `switchDock` | a Switch in its dock |

## Platform (2)

| name | what it should be |
|---|---|
| `wiiU` | a Wii U disc or gamepad — the source platform |
| `xpecGuy` | **already exists** (id `1543926752856776804`) |

## Elements (10)

The Skylanders elements. Worth having as a full set: they work as reaction
roles, as channel prefixes, and the website already uses the same ten colours.
Source art is the element medallion for each.

`elemMagic` · `elemTech` · `elemFire` · `elemWater` · `elemEarth` ·
`elemAir` · `elemLife` · `elemUndead` · `elemLight` · `elemDark`

## Animated, if you want them (3)

Kept to three — animated emoji are the ones people notice being overused.

| name | what it should be |
|---|---|
| `loadingSpin` | the flask bubbling, or a simple spinner |
| `portalSpin` | the Portal of Power ring rotating |
| `buildingNow` | a progress bar filling and resetting |

---

## Where they are used on the site

`public/emoji.json` is the single registry. Every entry has a unicode
fallback, so **the site renders correctly right now with no emoji uploaded at
all** — `:buildPass:` shows ✅ until the id is filled in, then switches to the
real one. Nothing ever appears as a broken image.

Fill in ids like this:

```json
"buildPass": { "id": "1543926752856776804", "fallback": "✅", "use": "build succeeded" }
```

Send me the ids and I will paste them in, or edit that file directly — no
rebuild needed beyond `python3 tools/stamp.py`.
