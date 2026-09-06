#!/usr/bin/env python3
"""Turn a logo render into a clean transparent icon set.

  1. strips a flat background by flood-filling inward from the corners
     (tolerant, so anti-aliased edges and off-white paper both go)
  2. auto-crops to the remaining artwork
  3. centres it on a square canvas with a circle-safe margin
  4. exports every size an icon actually gets used at, plus a .ico

Usage:
    python3 make_icon.py SOURCE [-o OUTDIR] [--box L,T,R,B]
                         [--tolerance N] [--safe 0.80] [--keep-bg]

--box   crop a region out of the source first, for contact-sheet renders
        that contain several previews (give the big one's pixel bounds)
--safe  fraction of the square the art may occupy; the rest is margin, so
        a circular crop never clips it. 0.80 is the usual safe value.
"""
import argparse, sys
from pathlib import Path

try:
    from PIL import Image, ImageColor
except ImportError:
    sys.exit("Pillow required:  python3 -m pip install --user Pillow")

SIZES = [1024, 512, 256, 128, 64, 48, 32, 16]


def strip_background(im, tolerance):
    """Flood fill from all four corners. Only removes background connected to
    an edge, so a light colour *inside* the artwork is left alone."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]

    def close(a, b):
        return all(abs(a[i] - b[i]) <= tolerance for i in range(3))

    seen = bytearray(w * h)
    stack = []
    for s in seeds:
        if not seen[s[1] * w + s[0]]:
            stack.append((s, px[s][:3]))

    while stack:
        (x, y), ref = stack.pop()
        i = y * w + x
        if seen[i]:
            continue
        cur = px[x, y]
        if cur[3] == 0 or not close(cur[:3], ref):
            continue
        seen[i] = 1
        px[x, y] = (cur[0], cur[1], cur[2], 0)
        for nx, ny in ((x+1,y), (x-1,y), (x,y+1), (x,y-1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx]:
                stack.append(((nx, ny), ref))
    return im


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", type=Path)
    ap.add_argument("-o", "--outdir", type=Path, default=Path("icon-out"))
    ap.add_argument("--box", help="L,T,R,B pixel crop applied before anything else")
    ap.add_argument("--tolerance", type=int, default=28,
                    help="colour distance treated as background (default 28)")
    ap.add_argument("--safe", type=float, default=0.80,
                    help="fraction of the square the art fills (default 0.80)")
    ap.add_argument("--alpha-floor", type=int, default=16,
                    help="alpha at or below this is treated as empty when cropping")
    ap.add_argument("--keep-bg", action="store_true",
                    help="skip background removal (source already transparent)")
    args = ap.parse_args()

    im = Image.open(args.source).convert("RGBA")
    print(f"source {args.source.name}: {im.size[0]}x{im.size[1]}")

    if args.box:
        l, t, r, b = (int(v) for v in args.box.split(","))
        im = im.crop((l, t, r, b))
        print(f"  cropped to box: {im.size[0]}x{im.size[1]}")

    if not args.keep_bg:
        im = strip_background(im, args.tolerance)
        print(f"  background stripped (tolerance {args.tolerance})")

    # getbbox() counts alpha=1 as content, and renders often carry a haze of
    # near-invisible pixels at the edges -- which silently defeats the crop and
    # leaves the art off-centre. Threshold first.
    alpha = im.getchannel("A").point(lambda v: 255 if v > args.alpha_floor else 0)
    bbox = alpha.getbbox()
    if not bbox:
        sys.exit("nothing left after background removal -- lower --tolerance")
    im = im.crop(bbox)
    print(f"  auto-cropped to art: {im.size[0]}x{im.size[1]}")

    # square canvas, art scaled to the safe fraction, centred optically
    side = int(max(im.size) / args.safe)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
    print(f"  squared with {int((1-args.safe)*100)}% margin: {side}x{side}")

    args.outdir.mkdir(parents=True, exist_ok=True)
    master = args.outdir / "arkchemy-icon.png"
    canvas.save(master)
    for s in SIZES:
        canvas.resize((s, s), Image.LANCZOS).save(args.outdir / f"arkchemy-icon-{s}.png")
    canvas.resize((256, 256), Image.LANCZOS).save(
        args.outdir / "favicon.ico", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])

    print(f"\nwrote {len(SIZES)+2} files to {args.outdir.resolve()}")
    print("  arkchemy-icon.png (master), " + ", ".join(str(s) for s in SIZES) + ", favicon.ico")
    print("\nCheck the 32px against a dark AND a light background before shipping.")


if __name__ == "__main__":
    main()
