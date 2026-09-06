# Skylanders: Spyro's Adventure — Wii voice-line extraction

Dumped and analysed 2026-09-05 from the EU (En,Fr,De,Es,It,Nl) and USA (En,Fr)
Wii discs.

## How the audio is stored

* Character VO lives in `character/<NNN>_<CodeName>.arc` — an **igArchive v4**
  (`IGA\x1a`, version field 4). igRewrite8 only implements v0x0B, so the layout
  was derived directly:

  | offset | field |
  |--------|-------|
  | 0x00 | magic `IGA\x1a` |
  | 0x04 | version (4) |
  | 0x08 | tocSize |
  | 0x0C | numFiles |
  | 0x30 | hash table, `numFiles * uint32`, ascending |
  | 0x30 + numFiles*4 | file table, **12 bytes** each: `offset, length, blockIndex` |

  `blockIndex == 0xFFFFFFFF` means uncompressed.

* **Every file in every character archive is uncompressed.** There is no hidden
  audio behind igArchive block compression. Spyro's archive holds 114 files:
  99 FMOD **FSB4** banks plus 15 `IGZ` object files (models/data, no audio).
  Each FSB bank contains exactly **one** sample, so there are no undecoded
  subsongs either.

* Codec is **Nintendo DSP 4-bit ADPCM**, not IMA. FSB4's base header is 0x30,
  not 0x18. Decoded with vgmstream. A hand-rolled IMA decoder produced a
  correct *sample count* but pure noise — matching arithmetic is not a
  working decode.

* Sample names are FNV-1a-32 hashes (`0xaf145f0b.wav.hz.wav`); the original
  filenames are not on the disc. `igHash.Hash` = `Fnv1a.Hash32(ASCII)`.

## The two-tier VO split — why most catchphrases are missing

Character archives fall into two sharply separated groups, with nothing
between 44 and 78 clips:

| tier | clips | characters | catchphrase present |
|------|-------|-----------|---------------------|
| full voice | 78–113 | 12 | **9 of 12 confirmed** |
| reduced | 27–44 | 20 | **0 of 20** |

Every catchphrase found came from a full-voice character; none from a reduced
one. The 20 reduced characters ship **combat barks only** — their catchphrase
is not in the Wii data at all.

## Ruled out (searched, negative)

| archive | banks | content |
|---------|-------|---------|
| `permanent/global.arc` | 885 | story/cutscene dialogue |
| `misc/PvP_MainControl.arc` | 895 | menu VO, multilingual |
| `level/Level_Hub_stage1..6` | 3 495 | NPC quest chatter (Flynn, the docks) |

Full disc inventory: **15 081 FSB banks across 133 archives**.

## Region note

The USA disc is **byte-identical** to the EU disc for `character/*.arc`,
`global.arc`, `PvP_MainControl.arc` and `UI_Collection_StoryTablets.arc`
(same sizes, same bytes, 1849 character banks on both). Both releases ship one
multi-language master: the disc labelled *En,Fr* still contains Spanish audio
in `PvP_MainControl.arc`. There is no English-only regional build to extract,
so the mixed languages cannot be separated by choosing a different disc.

## Method notes (what did and didn't work)

* **Envelope correlation is useless at scale.** Against an 895-clip pool it
  returned 0.96 / 0.96 / 0.96 for unrelated clips — the metric stops
  discriminating and produces confident nonsense. Always check the margin over
  the field, not the absolute score.
* **Log-mel spectral matching works** but only with a positive control: it
  scored +0.14…+0.38 over the field inside the right character's own clips,
  versus +0.08 in a pool that did not contain the line.
* **Offline ASR (vosk) + fuzzy text match** was the most reliable signal, but
  fails on short shouted lines: Lightning Rod's real catchphrase transcribes
  as "the a strong country roads" and ranks 10th. Human ears remain the
  ground truth.
* A cross-character confusion matrix "proved" 27 of 32 characters matched
  someone else's catchphrase better. It was noise — short phrases like "For
  the Wind!" match almost any transcript.

## Tooling gotcha

`dolphin-tool` in the Flatpak prints **"Finished Successfully!" while writing
nothing**: the sandbox is `filesystems=host:ro`, so it extracts into a tmpfs
and exits 0. Output must go under `~/.var/app/org.DolphinEmu.dolphin-emu/`.
