#!/usr/bin/env python3
"""Convert a 3D Gaussian Splatting .ply into the .splat the front page loads.

The front page's hero (public/js/cinema.js) draws a generated island by
default. It can draw a real capture instead: film something -- a Portal of
Power on a desk, a shelf of figures -- reconstruct it with Open Reality
(github.com/reality-opened/openreality) or any other 3DGS tool, then:

    python3 tools/ply_to_splat.py capture.ply public/scene/portal.splat
    # and on the canvas in public/index.html:
    #   <canvas id="cineCanvas" ... data-scene="scene/portal.splat" data-scene-flip="yz">

data-scene-flip="yz" turns a y-down (COLMAP-style) capture the right way
up; leave it off if the capture already has y up. The page centres and
scales the capture itself.

Input: the standard 3DGS PLY -- binary little-endian, one vertex per splat
with x y z, f_dc_0..2, opacity, scale_0..2 and rot_0..3 (w first), where
colour is the degree-0 spherical-harmonic coefficient, opacity is a logit
and scale is a log. Higher-order SH terms are dropped: the hero shows the
capture from a narrow range of angles.

Output: 32 bytes a splat -- position f32 x3, scale f32 x3, RGBA u8 x4,
rotation u8 x4 (w, x, y, z mapped from [-1, 1] to [0, 255]) -- sorted with
the most visible splats first, so --max keeps the ones that matter.

A capture's own rights are the capturer's; check before publishing what
is in the frame.
"""
import argparse
import math
import struct
import sys

SH_C0 = 0.28209479177387814
TYPES = {"char": "b", "uchar": "B", "short": "h", "ushort": "H", "int": "i", "uint": "I",
         "float": "f", "double": "d", "int8": "b", "uint8": "B", "int16": "h", "uint16": "H",
         "int32": "i", "uint32": "I", "float32": "f", "float64": "d"}


def read_ply(path):
    with open(path, "rb") as fh:
        if fh.readline().strip() != b"ply":
            sys.exit(f"{path}: not a PLY file")
        fmt, count, props, in_vertex = None, 0, [], False
        while True:
            line = fh.readline()
            if not line:
                sys.exit(f"{path}: header never ends")
            words = line.decode("ascii", "replace").split()
            if not words:
                continue
            if words[0] == "format":
                fmt = words[1]
            elif words[0] == "element":
                in_vertex = words[1] == "vertex"
                if in_vertex:
                    count = int(words[2])
            elif words[0] == "property" and in_vertex:
                if words[1] == "list":
                    sys.exit(f"{path}: list properties on vertices are not a 3DGS PLY")
                props.append((words[2], TYPES[words[1]]))
            elif words[0] == "end_header":
                break
        if fmt != "binary_little_endian":
            sys.exit(f"{path}: {fmt} PLY; only binary_little_endian is supported")
        row = struct.Struct("<" + "".join(t for _, t in props))
        names = [n for n, _ in props]
        need = ["x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2", "opacity",
                "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
        missing = [n for n in need if n not in names]
        if missing:
            sys.exit(f"{path}: missing {', '.join(missing)} -- not a 3DGS PLY")
        idx = [names.index(n) for n in need]
        data = fh.read(row.size * count)
        if len(data) < row.size * count:
            sys.exit(f"{path}: truncated ({len(data) // row.size} of {count} splats)")
        for i in range(count):
            v = row.unpack_from(data, i * row.size)
            yield [v[j] for j in idx]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("ply")
    ap.add_argument("out")
    ap.add_argument("--max", type=int, default=300000,
                    help="keep at most this many splats (default 300000; the page caps at 400000)")
    a = ap.parse_args()

    rows = []
    for x, y, z, r, g, b, op, s0, s1, s2, q0, q1, q2, q3 in read_ply(a.ply):
        sc = (math.exp(s0), math.exp(s1), math.exp(s2))
        alpha = 1 / (1 + math.exp(-op))
        rows.append((sc[0] * sc[1] * sc[2] * alpha, x, y, z, sc, (r, g, b), alpha, (q0, q1, q2, q3)))
    rows.sort(key=lambda t: -t[0])
    rows = rows[: a.max]

    byte = lambda v: max(0, min(255, int(round(v))))
    with open(a.out, "wb") as out:
        for _, x, y, z, sc, dc, alpha, q in rows:
            ql = math.sqrt(sum(c * c for c in q)) or 1.0
            out.write(struct.pack("<3f3f4B4B", x, y, z, *sc,
                                  *(byte((0.5 + SH_C0 * c) * 255) for c in dc), byte(alpha * 255),
                                  *(byte(c / ql * 128 + 128) for c in q)))
    print(f"wrote {len(rows)} splats to {a.out} ({len(rows) * 32 / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
