/* The front page's hero, rendered: a floating island of Skylands drawn as
   3D Gaussian splats, seen through a lens of liquid glass, scrubbed by the
   scroll.

   Three pieces, all in this file, all written for this site:

   1. A Gaussian-splat renderer. Each splat is a small 3D ellipsoid with a
      colour and an opacity; they are projected to 2D ellipses, sorted back
      to front on the CPU and blended. It is the same kind of scene that
      Open Reality (github.com/reality-opened/openreality) reconstructs from
      phone video, so a real capture drops straight in -- see
      tools/ply_to_splat.py and the data-scene attribute on the canvas.
   2. The island itself, generated here from a fixed seed: grass, rock,
      gold veins, trees, a waterfall, a ring of light, a sea of cloud. Built
      in the browser rather than downloaded, so the hero costs no request.
   3. A composite pass that draws the glass: a thick lens that magnifies
      what is behind it, splits colour at its rim, catches a highlight, and
      throws a spectral caustic along its leading edge when it moves fast.
      The idea of a glass sphere that climbs and shrinks under a gesture is
      borrowed from Appllama's liquid-glass-screens study; no code or
      artwork is.

   The scroll drives everything: at the top the lens is a dome on the
   bottom edge, and over the hero's height it climbs, shrinks and settles
   above the call to action while the copy wipes in and out around it.

   Without WebGL2 this script does nothing and the CSS sky beneath stays.
   With reduced motion it draws one still frame and scrubs nothing. */
(() => {
    "use strict";

    const canvas = document.getElementById("cineCanvas");
    const hero = document.querySelector(".hero");
    const stage = document.getElementById("cineStage");
    if (!canvas || !hero || !stage) return;

    const gl = canvas.getContext("webgl2", {
        antialias: false, alpha: false, depth: false, stencil: false,
        premultipliedAlpha: false, powerPreference: "high-performance",
    });
    if (!gl) return;

    const root = document.documentElement;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const darkMQ = matchMedia("(prefers-color-scheme: dark)");

    /* --- deterministic noise -------------------------------------------- */
    function rng(seed) {
        return () => {
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function hash2(ix, iy) {
        let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) | 0;
        h = Math.imul(h ^ h >>> 13, 1274126177);
        return ((h ^ h >>> 16) >>> 0) / 4294967296;
    }
    function noise2(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
        const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    const fbm = (x, y) => noise2(x, y) * .55 + noise2(x * 2.1 + 7.3, y * 2.1 - 1.7) * .3 + noise2(x * 4.3 - 3.1, y * 4.3 + 5.9) * .15;
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
    const mix = (a, b, t) => a + (b - a) * t;
    const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

    /* --- the splat store -------------------------------------------------
       Per splat: position + a "kind" (w: integer part is the kind, the
       fraction a phase), the six unique entries of its 3D covariance, and
       an RGBA colour. Kinds animate in the vertex shader: 0 still,
       1 waterfall, 2 drifting cloud, 3 shimmering light. */
    class Splats {
        constructor(cap) {
            this.cap = cap; this.n = 0;
            this.pos = new Float32Array(cap * 4);
            this.ca = new Float32Array(cap * 4);
            this.cb = new Float32Array(cap * 4);
            this.col = new Uint8Array(cap * 4);
        }
        push(x, y, z, w, s00, s01, s02, s11, s12, s22, r, g, b, a) {
            if (this.n >= this.cap) return;
            const i = this.n++ * 4;
            this.pos[i] = x; this.pos[i + 1] = y; this.pos[i + 2] = z; this.pos[i + 3] = w;
            this.ca[i] = s00; this.ca[i + 1] = s01; this.ca[i + 2] = s02; this.ca[i + 3] = s11;
            this.cb[i] = s12; this.cb[i + 1] = s22;
            this.col[i] = Math.min(255, Math.max(0, r * 255));
            this.col[i + 1] = Math.min(255, Math.max(0, g * 255));
            this.col[i + 2] = Math.min(255, Math.max(0, b * 255));
            this.col[i + 3] = Math.min(255, Math.max(0, a * 255));
        }
        /* a flat disc of radius rad and thickness th facing n:
           rad^2 I + (th^2 - rad^2) n n^T */
        disc(p, n, rad, th, c, a, w = 0) {
            const r2 = rad * rad, k = th * th - r2;
            this.push(p[0], p[1], p[2], w,
                r2 + k * n[0] * n[0], k * n[0] * n[1], k * n[0] * n[2],
                r2 + k * n[1] * n[1], k * n[1] * n[2], r2 + k * n[2] * n[2],
                c[0], c[1], c[2], a);
        }
        blob(p, s, c, a, w = 0) {
            const s2 = s * s;
            this.push(p[0], p[1], p[2], w, s2, 0, 0, s2, 0, s2, c[0], c[1], c[2], a);
        }
        /* a needle of length len and width wd along unit d */
        streak(p, d, len, wd, c, a, w = 0) {
            const w2 = wd * wd, k = len * len - w2;
            this.push(p[0], p[1], p[2], w,
                w2 + k * d[0] * d[0], k * d[0] * d[1], k * d[0] * d[2],
                w2 + k * d[1] * d[1], k * d[1] * d[2], w2 + k * d[2] * d[2],
                c[0], c[1], c[2], a);
        }
    }

    const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

    /* --- the island ------------------------------------------------------
       Lighting is baked into the colours: a sun from the upper left by day,
       a cool moon by night. Emissive parts (gold veins, the ring, the beam)
       keep their brightness at night, which is where the night version gets
       its glow. */
    function buildIsland(night) {
        const S = new Splats(72000);
        const R = rng(0xA4C);
        const SUN = norm([-0.45, 0.8, 0.4]);
        const shade = (alb, n, emit = 0) => {
            const lam = Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]);
            let k, tint;
            if (night) { k = 0.3 + 0.14 * n[1] + 0.46 * lam; tint = [0.58, 0.64, 1.0]; }
            else { k = 0.42 + 0.16 * n[1] + 0.72 * lam; tint = [1.0, 0.97, 0.9]; }
            return [alb[0] * (k * tint[0] + emit), alb[1] * (k * tint[1] + emit), alb[2] * (k * tint[2] + emit)];
        };

        function island(cx, cy, cz, Rd, D, dens, seed, opts = {}) {
            const sd = seed * 13.7;
            const topH = (x, z) => {
                const r = Math.hypot(x, z) / Rd;
                return Rd * (0.14 * (fbm(x / Rd * 2.2 + sd, z / Rd * 2.2 - sd) - 0.5)
                    + 0.07 * Math.max(0, 1 - r * r)) - Rd * 0.1 * smooth(0.82, 1.0, r);
            };
            const area = (Rd / 3.2) * (Rd / 3.2);
            const e = 0.05;

            // grass
            const nTop = Math.round(11000 * area * dens);
            for (let i = 0; i < nTop; i++) {
                const a = R() * Math.PI * 2, r = Math.sqrt(R()) * Rd * 0.99;
                const x = Math.cos(a) * r, z = Math.sin(a) * r, y = topH(x, z);
                const n = norm([-(topH(x + e, z) - topH(x - e, z)) / (2 * e), 1, -(topH(x, z + e) - topH(x, z - e)) / (2 * e)]);
                const g = fbm(x * 1.3 + sd, z * 1.3);
                let alb = mix3([0.26, 0.52, 0.17], [0.56, 0.76, 0.22], g);
                alb = mix3(alb, [0.5, 0.37, 0.23], smooth(0.9, 1.0, r / Rd));
                const rad = Rd * 0.035 * (0.8 + 0.5 * R());
                S.disc([cx + x, cy + y, cz + z], n, rad, rad * 0.25, shade(alb, n), 0.95);
            }
            // flowers
            const flowers = [[1, 0.85, 0.35], [1, 0.55, 0.7], [0.95, 0.95, 1], [0.7, 0.6, 1]];
            for (let i = 0, nf = Math.round(260 * area * dens); i < nf; i++) {
                const a = R() * Math.PI * 2, r = Math.sqrt(R()) * Rd * 0.93;
                const x = Math.cos(a) * r, z = Math.sin(a) * r;
                S.disc([cx + x, cy + topH(x, z) + 0.035, cz + z], [0, 1, 0], 0.035, 0.02,
                    shade(flowers[(R() * 4) | 0], [0, 1, 0], 0.25), 1);
            }
            // cliff band
            for (let i = 0, nc = Math.round(2600 * Math.sqrt(area) * dens); i < nc; i++) {
                const a = R() * Math.PI * 2, dd = R() * 0.14 * Rd;
                const x = Math.cos(a) * Rd * 0.985, z = Math.sin(a) * Rd * 0.985;
                const n = norm([Math.cos(a), -0.1, Math.sin(a)]);
                const stripe = 0.06 * Math.sin(dd * 40 / Rd + fbm(a * 3, dd) * 5);
                const alb = [0.5 + stripe, 0.36 + stripe, 0.22 + stripe];
                const rad = Rd * 0.04 * (0.8 + 0.5 * R());
                S.disc([cx + x, cy + topH(x, z) - dd, cz + z], n, rad, rad * 0.3, shade(alb, n), 0.97);
            }
            // underside: an inverted cone of rock, strata going from warm
            // brown to Arkchemy plum, with veins of gold
            for (let i = 0, nu = Math.round(15000 * area * dens); i < nu; i++) {
                const t = Math.pow(R(), 1.5), d = D * t;
                const a = R() * Math.PI * 2;
                let rr = Rd * 0.97 * Math.pow(1 - t, 0.8);
                rr *= 1 + (fbm(a * 2.5 + sd, t * 4) - 0.5) * 0.35;
                const x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = -0.12 * Rd - d;
                const n = norm([Math.cos(a), -0.55, Math.sin(a)]);
                const stripe = 0.07 * Math.sin(d * 5 * 3.2 / Rd + fbm(a * 4, d) * 6);
                let alb = t < 0.5 ? mix3([0.52, 0.38, 0.28], [0.34, 0.2, 0.33], t * 2)
                                  : mix3([0.34, 0.2, 0.33], [0.22, 0.13, 0.25], t * 2 - 1);
                alb = [alb[0] + stripe, alb[1] + stripe * 0.8, alb[2] + stripe];
                const vein = Math.abs(fbm(a * 3 + sd * 2, d * 1.2 / Rd * 3.2) - 0.5);
                let emit = 0;
                if (vein < 0.014) { alb = [1.0, 0.78, 0.32]; emit = night ? 1.1 : 0.5; }
                const rad = Rd * 0.05 * (0.9 + 0.6 * R()) * (1 + 0.3 * t);
                S.disc([cx + x, cy + y, cz + z], n, rad, rad * 0.35, shade(alb, n, emit), 0.97);
            }
            // roots hanging from the tip
            for (let i = 0; i < 18 * dens; i++) {
                const a = R() * Math.PI * 2, rr = R() * Rd * 0.25;
                const len = Rd * (0.12 + R() * 0.2);
                S.streak([cx + Math.cos(a) * rr, cy - 0.12 * Rd - D * 0.9 - len * 0.5, cz + Math.sin(a) * rr],
                    [0, 1, 0], len, 0.025, shade([0.3, 0.2, 0.18], [0, -1, 0]), 0.9);
            }

            // trees
            for (const [tx, tz, s] of opts.trees || []) {
                const x0 = tx * Rd, z0 = tz * Rd, y0 = topH(x0, z0);
                const lean = [(R() - 0.5) * 0.15, 1, (R() - 0.5) * 0.15];
                for (let i = 0; i < 34; i++) {
                    const h = i / 34 * 1.0 * s;
                    S.streak([cx + x0 + lean[0] * h, cy + y0 + h, cz + z0 + lean[2] * h], norm(lean),
                        0.07 * s, 0.05 * s * (1 - h / s * 0.4), shade([0.36, 0.24, 0.16], [0.7, 0, 0.7]), 1);
                }
                const lobes = [[0, 1.1, 0, 0.55], [0.3, 0.95, 0.2, 0.4], [-0.28, 1.0, -0.15, 0.42], [0.05, 1.45, -0.05, 0.38]];
                for (const [lx, ly, lz, lr] of lobes) {
                    const c = [cx + x0 + lx * s + lean[0] * s, cy + y0 + ly * s, cz + z0 + lz * s + lean[2] * s];
                    for (let i = 0; i < 260; i++) {
                        let v;
                        do { v = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]; } while (v[0] * v[0] + v[1] * v[1] + v[2] * v[2] > 1);
                        const n = norm(v), rr = lr * s * (0.72 + 0.28 * R());
                        const alb = mix3([0.16, 0.4, 0.14], [0.36, 0.64, 0.2], R() * 0.6 + 0.4 * clamp01(n[1] * 0.5 + 0.5));
                        S.blob([c[0] + n[0] * rr, c[1] + n[1] * rr, c[2] + n[2] * rr], 0.085 * s, shade(alb, n), 0.95);
                    }
                }
            }

            // a stream across the top and over the edge
            if (opts.fall !== undefined) {
                const af = opts.fall;
                for (let i = 0; i <= 60; i++) {
                    const t = i / 60, a = af - 0.6 * (1 - t), r = Rd * mix(0.35, 0.99, t);
                    for (let k = 0; k < 8; k++) {
                        const aa = a + (R() - 0.5) * 0.06, rr = r + (R() - 0.5) * 0.15;
                        const x = Math.cos(aa) * rr, z = Math.sin(aa) * rr;
                        S.disc([cx + x, cy + topH(x, z) + 0.02, cz + z], [0, 1, 0], 0.1, 0.02,
                            shade([0.3, 0.58, 0.9], [0, 1, 0], 0.15), 0.85);
                    }
                }
                const px = Math.cos(af) * Rd, pz = Math.sin(af) * Rd, py = topH(px * 0.98, pz * 0.98);
                const tan = [-Math.sin(af), 0, Math.cos(af)];
                fallInfo = [Math.cos(af), Math.sin(af)];
                for (let i = 0; i < 2600; i++) {
                    const o = (R() - 0.5) * 0.4;
                    const c = night ? [0.6, 0.72, 1.0] : [0.86, 0.94, 1.0];
                    S.streak([cx + px + tan[0] * o, cy + py, cz + pz + tan[2] * o], [0, 1, 0], 0.2, 0.045,
                        c, 0.5, 1 + R() * 0.99);
                }
                for (let i = 0; i < 40; i++) {
                    S.blob([cx + px * 1.12 + (R() - 0.5), cy + py - 5.6 + (R() - 0.5) * 0.4, cz + pz * 1.12 + (R() - 0.5)],
                        0.35 + R() * 0.3, night ? [0.5, 0.55, 0.8] : [0.95, 0.97, 1.0], 0.12, 2 + R() * 0.99);
                }
            }

            // the ring of light at the heart of the island
            if (opts.ring) {
                const y0 = topH(0, 0);
                const stone = [0.55, 0.5, 0.6];
                for (let i = 0; i < 520; i++) {
                    const a = R() * Math.PI * 2, h = R() * 0.32;
                    const n = [Math.cos(a), 0, Math.sin(a)];
                    S.disc([cx + n[0] * 0.75, cy + y0 + h, cz + n[2] * 0.75], n, 0.07, 0.02, shade(stone, n), 1);
                }
                for (let i = 0; i < 320; i++) {
                    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.75;
                    S.disc([cx + Math.cos(a) * r, cy + y0 + 0.32, cz + Math.sin(a) * r], [0, 1, 0], 0.07, 0.02,
                        shade([0.62, 0.57, 0.66], [0, 1, 0]), 1);
                }
                const ry = y0 + 0.42;
                const gold = [1.0, 0.8, 0.35];
                for (let i = 0; i < 820; i++) {
                    const u = R() * Math.PI * 2, v = R() * Math.PI * 2;
                    const n = [Math.cos(u) * Math.cos(v), Math.sin(v), Math.sin(u) * Math.cos(v)];
                    const x = Math.cos(u) * (0.52 + 0.075 * Math.cos(v)), z = Math.sin(u) * (0.52 + 0.075 * Math.cos(v));
                    S.blob([cx + x, cy + ry + 0.075 * Math.sin(v), cz + z], 0.028, shade(gold, n, night ? 1.2 : 0.55), 1);
                }
                const energy = [0.45, 0.85, 1.0];
                for (let i = 0; i < 300; i++) {
                    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.45;
                    S.disc([cx + Math.cos(a) * r, cy + ry, cz + Math.sin(a) * r], [0, 1, 0], 0.08, 0.02,
                        energy.map(c => c * 1.15), 0.35, 3 + R() * 0.99);
                }
                for (let i = 0; i < 260; i++) {
                    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.28, h = Math.pow(R(), 1.4) * 5;
                    S.streak([cx + Math.cos(a) * r, cy + ry + h, cz + Math.sin(a) * r], [0, 1, 0], 0.35, 0.05,
                        [0.62, 0.9, 1.0], night ? 0.2 : 0.13, 3 + R() * 0.99);
                }
                // standing stones, each with a lit rune
                for (let k = 0; k < 6; k++) {
                    const a = k / 6 * Math.PI * 2 + 0.3, x = Math.cos(a) * 1.35, z = Math.sin(a) * 1.35, yb = topH(x, z);
                    for (let i = 0; i < 46; i++) {
                        const n = norm([R() - 0.5, R() * 0.4, R() - 0.5]);
                        S.blob([cx + x + n[0] * 0.08, cy + yb + R() * 0.42, cz + z + n[2] * 0.08], 0.055,
                            shade([0.5, 0.47, 0.56], n), 1);
                    }
                    S.blob([cx + x * 1.07, cy + yb + 0.27, cz + z * 1.07], 0.035,
                        night ? [1.3, 0.95, 0.4] : [1.0, 0.8, 0.35], 1, 3 + R() * 0.99);
                }
            }

            // crystals
            for (const [ax, az] of opts.crystals || []) {
                const x0 = ax * Rd, z0 = az * Rd, y0 = topH(x0, z0);
                for (let k = 0; k < 6; k++) {
                    const d = norm([(R() - 0.5) * 0.9, 1, (R() - 0.5) * 0.9]), len = 0.15 + R() * 0.25;
                    const c = k % 2 ? [0.95, 0.45, 0.85] : [1.0, 0.82, 0.4];
                    S.streak([cx + x0 + d[0] * len, cy + y0 + d[1] * len, cz + z0 + d[2] * len], d, len, 0.06,
                        c.map(v => v * (night ? 1.25 : 0.95)), 0.95);
                }
            }
        }

        island(0, 0, 0, 3.2, 4.2, 1, 1, {
            trees: [[-0.55, -0.35, 1.0], [-0.62, 0.2, 0.8], [0.5, 0.55, 0.9], [0.18, -0.7, 0.7], [0.66, -0.25, 0.75]],
            fall: 2.25, ring: true, crystals: [[0.72, 0.5], [-0.3, 0.72], [-0.75, -0.55]],
        });
        island(7.2, -1.6, -4.2, 1.15, 1.9, 0.75, 2, { trees: [[0.1, 0.1, 0.55]], crystals: [[-0.5, 0.3]] });
        island(-6.6, 0.9, -3.2, 0.85, 1.5, 0.75, 3, { trees: [[-0.2, 0.1, 0.45]] });
        island(-3.4, -3.3, 6.2, 1.3, 2.1, 0.75, 4, { trees: [[0.2, -0.2, 0.6], [-0.4, 0.3, 0.45]], crystals: [[0.5, 0.4]] });

        // a sea of cloud below, and a few puffs above
        const cloud = night ? [0.36, 0.34, 0.55] : [0.98, 0.98, 1.0];
        // (kept off the camera's orbit, radius 9 to 18: a cloud the camera
        // passes through is a white screen)
        for (let k = 0; k < 84; k++) {
            const high = k >= 72;
            const a = R() * Math.PI * 2, r = high ? 24 + R() * 8 : 3 + R() * 8;
            const c = [Math.cos(a) * r, high ? 3 + R() * 4 : -7.4 + R() * 1.4, Math.sin(a) * r];
            const ph = R() * 0.99;
            for (let i = 0; i < 11; i++) {
                const o = [(R() - 0.5) * 2.4, (R() - 0.5) * 0.6, (R() - 0.5) * 2.4];
                const lit = 0.82 + 0.18 * clamp01(o[1] + 0.5);
                S.blob([c[0] + o[0], c[1] + o[1], c[2] + o[2]], 0.7 + R() * 0.9,
                    cloud.map(v => v * lit), high ? 0.16 : 0.24, 2 + ph);
            }
        }
        return S;
    }
    let fallInfo = [1, 0];

    /* --- a captured scene, if the page names one --------------------------
       The .splat layout (32 bytes a splat: position f32x3, scale f32x3,
       RGBA u8x4, rotation u8x4 as w,x,y,z) that tools/ply_to_splat.py
       writes from Open Reality's (or any 3DGS) PLY output. The capture is
       centred and scaled to the island's size, so its own units do not
       matter. data-scene-flip="yz" turns a COLMAP-style y-down capture up. */
    async function loadCapture(url, flip) {
        const buf = await (await fetch(url)).arrayBuffer();
        const n = Math.min(buf.byteLength / 32 | 0, 400000);
        const f = new Float32Array(buf, 0, n * 8), u = new Uint8Array(buf, 0, n * 32);
        const sy = flip ? -1 : 1;
        const xs = [], ys = [], zs = [];
        for (let i = 0; i < n; i += 7) { xs.push(f[i * 8]); ys.push(f[i * 8 + 1] * sy); zs.push(f[i * 8 + 2] * sy); }
        const med = a => a.slice().sort((p, q) => p - q)[a.length >> 1];
        const c = [med(xs), med(ys), med(zs)];
        const dist = xs.map((x, i) => Math.hypot(x - c[0], ys[i] - c[1], zs[i] - c[2])).sort((p, q) => p - q);
        const k = 4.2 / (dist[Math.floor(dist.length * 0.9)] || 1);
        const S = new Splats(n);
        for (let i = 0; i < n; i++) {
            const o = i * 8, b = i * 32;
            const s = [f[o + 3] * k, f[o + 4] * k, f[o + 5] * k];
            let w = (u[b + 28] - 128) / 128, x = (u[b + 29] - 128) / 128, y = (u[b + 30] - 128) / 128, z = (u[b + 31] - 128) / 128;
            const l = Math.hypot(w, x, y, z) || 1; w /= l; x /= l; y /= l; z /= l;
            const M = [
                [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
                [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
                [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
            ];
            const cv = (a, bb) => M[a][0] * M[bb][0] * s[0] * s[0] + M[a][1] * M[bb][1] * s[1] * s[1] + M[a][2] * M[bb][2] * s[2] * s[2];
            // turning 180 degrees about x negates the xy and xz terms
            S.push((f[o] - c[0]) * k, (f[o + 1] * sy - c[1]) * k, (f[o + 2] * sy - c[2]) * k, 0,
                cv(0, 0), cv(0, 1) * sy, cv(0, 2) * sy, cv(1, 1), cv(1, 2), cv(2, 2),
                u[b + 24] / 255, u[b + 25] / 255, u[b + 26] / 255, u[b + 27] / 255);
        }
        return S;
    }

    /* --- shaders --------------------------------------------------------- */
    const FULLSCREEN_VS = `#version 300 es
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

    const SKY_FS = `#version 300 es
precision highp float;
uniform mat3 uRot; uniform vec2 uFocal; uniform vec2 uRes; uniform float uNight; uniform float uTime;
out vec4 o;
float h13(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
    vec2 px = gl_FragCoord.xy - 0.5 * uRes;
    vec3 rd = transpose(uRot) * normalize(vec3(px.x / uFocal.x, px.y / uFocal.y, 1.0));
    float y = rd.y;
    vec3 day = mix(vec3(0.93, 0.95, 0.97), vec3(0.47, 0.72, 0.93), smoothstep(-0.05, 0.25, y));
    day = mix(day, vec3(0.13, 0.40, 0.78), smoothstep(0.25, 0.85, y));
    day = mix(day, vec3(0.74, 0.82, 0.93), smoothstep(0.0, -0.45, y));
    vec3 sun = normalize(vec3(-0.45, 0.35, 0.82));
    float s = max(dot(rd, sun), 0.0);
    day += vec3(1.0, 0.85, 0.6) * (pow(s, 8.0) * 0.35 + pow(s, 400.0) * 2.0);
    vec3 night = mix(vec3(0.34, 0.13, 0.30), vec3(0.10, 0.05, 0.18), smoothstep(-0.05, 0.3, y));
    night = mix(night, vec3(0.025, 0.02, 0.07), smoothstep(0.3, 0.9, y));
    night = mix(night, vec3(0.07, 0.04, 0.11), smoothstep(0.0, -0.5, y));
    vec3 moon = normalize(vec3(0.5, 0.42, 0.76));
    float m = max(dot(rd, moon), 0.0);
    night += vec3(0.75, 0.8, 1.0) * (pow(m, 24.0) * 0.22 + smoothstep(0.9993, 0.9996, m) * 1.1);
    vec3 cell = rd * 240.0;
    float st = h13(floor(cell));
    float star = step(0.9972, st) * smoothstep(0.32, 0.08, length(fract(cell) - 0.5));
    night += star * smoothstep(-0.02, 0.25, y) * (0.6 + 0.4 * sin(uTime * 2.0 + st * 60.0));
    o = vec4(mix(day, night, uNight), 1.0);
}`;

    const SPLAT_VS = `#version 300 es
precision highp float; precision highp int;
uniform highp sampler2D uPos, uCovA, uCovB;
uniform lowp sampler2D uCol;
uniform mat3 uRot; uniform vec3 uEye; uniform vec2 uFocal, uRes; uniform float uTime; uniform vec2 uFall;
in vec2 aCorner; in uint aIndex;
out vec4 vCol; out vec2 vPos;
void main() {
    ivec2 t = ivec2(int(aIndex & 2047u), int(aIndex >> 11));
    vec4 p = texelFetch(uPos, t, 0);
    vec3 pos = p.xyz;
    float kind = floor(p.w), ph = fract(p.w);
    vCol = texelFetch(uCol, t, 0);
    if (kind == 1.0) {                          // waterfall
        float f = fract(ph + uTime * 0.16);
        pos.y -= 6.0 * f * (0.35 + 0.65 * f);
        pos.xz += uFall * (0.15 + 0.9 * f) * f;
        vCol.a *= smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.7, 1.0, f));
    } else if (kind == 2.0) {                   // cloud drift
        float a = ph * 6.2832;
        pos.x += sin(uTime * 0.05 + a) * 0.7;
        pos.z += cos(uTime * 0.04 + a) * 0.5;
    } else if (kind == 3.0) {                   // shimmer
        vCol.a *= 0.6 + 0.4 * sin(uTime * 2.2 + ph * 6.2832);
        pos.y += fract(uTime * 0.12 + ph) * 0.25;
    }
    vec3 c = uRot * (pos - uEye);
    if (c.z < 0.2) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
    vec2 ctr = uFocal * c.xy / c.z;
    vec2 lim = 0.6 * uRes + 64.0;
    if (abs(ctr.x) > lim.x || abs(ctr.y) > lim.y) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
    vec4 a = texelFetch(uCovA, t, 0), b = texelFetch(uCovB, t, 0);
    mat3 V = mat3(a.x, a.y, a.z, a.y, a.w, b.x, a.z, b.x, b.y);
    mat3 Vc = uRot * V * transpose(uRot);
    vec3 j1 = vec3(uFocal.x / c.z, 0.0, -uFocal.x * c.x / (c.z * c.z));
    vec3 j2 = vec3(0.0, uFocal.y / c.z, -uFocal.y * c.y / (c.z * c.z));
    float c11 = dot(j1, Vc * j1) + 0.3, c12 = dot(j1, Vc * j2), c22 = dot(j2, Vc * j2) + 0.3;
    float mid = 0.5 * (c11 + c22), rad = length(vec2(0.5 * (c11 - c22), c12));
    float l1 = mid + rad, l2 = max(mid - rad, 0.1);
    vec2 dv = abs(c12) > 1e-7 ? normalize(vec2(c12, l1 - c11)) : (c11 >= c22 ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
    vec2 major = min(sqrt(2.0 * l1), 1024.0) * dv;
    vec2 minor = min(sqrt(2.0 * l2), 1024.0) * vec2(dv.y, -dv.x);
    vPos = aCorner;
    vec2 off = aCorner.x * major + aCorner.y * minor;
    gl_Position = vec4((ctr + off) / (0.5 * uRes), 0.0, 1.0);
}`;

    const SPLAT_FS = `#version 300 es
precision mediump float;
in vec4 vCol; in vec2 vPos;
out vec4 o;
void main() {
    float A = -dot(vPos, vPos);
    if (A < -4.0) discard;
    float B = exp(A) * vCol.a;
    o = vec4(vCol.rgb * B, B);
}`;

    const GLASS_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uRes; uniform vec3 uOrb; uniform vec2 uVel;
uniform float uTime, uNight, uBars, uFade;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 scene(vec2 uv, float lod) { return textureLod(uScene, clamp(uv, 0.001, 0.999), lod).rgb; }
void main() {
    vec2 p = gl_FragCoord.xy, uv = p / uRes;
    vec3 col = scene(uv, 0.0);
    vec3 bl = textureLod(uScene, uv, 4.0).rgb * 0.5 + textureLod(uScene, uv, 5.5).rgb * 0.5;
    // bloom from the blurred mips, but only from what is brighter than the
    // brightest sky, so the horizon does not haze the whole frame
    float lum = dot(bl, vec3(0.299, 0.587, 0.114));
    col += bl * max(lum - 0.84, 0.0) * 2.2;

    vec2 d = (p - uOrb.xy) / uOrb.z;
    float rr = length(d), aa = 1.5 / uOrb.z;
    float outside = smoothstep(1.0 - aa, 1.0 + aa, rr);
    float halo = exp(-pow(max(rr - 1.0, 0.0) * 5.0, 2.0));
    col *= 1.0 - 0.2 * halo * outside * (0.55 + 0.45 * smoothstep(0.5, -1.0, d.y));
    if (rr < 1.0 + aa) {
        float h = sqrt(max(1.0 - rr * rr, 0.0));
        vec3 n = normalize(vec3(d, h + 1e-3));
        float edge = 1.0 - h;
        float lod = mix(0.4, 1.8, edge) * clamp(uOrb.z / 300.0, 0.35, 1.0);
        vec2 base = d * uOrb.z;
        vec3 g;
        g.r = scene((uOrb.xy + base * (0.62 + edge * 0.92)) / uRes, lod).r;
        g.g = scene((uOrb.xy + base * (0.62 + edge * 1.04)) / uRes, lod).g;
        g.b = scene((uOrb.xy + base * (0.62 + edge * 1.18)) / uRes, lod).b;
        g = g * vec3(0.97, 0.99, 1.03) + 0.025;
        float fres = pow(edge, 3.0);
        g = mix(g, mix(vec3(0.88, 0.94, 1.0), vec3(0.62, 0.5, 0.86), uNight), fres * 0.4);
        vec3 L = normalize(vec3(-0.45, 0.6, 0.66));
        float nl = max(dot(n, L), 0.0);
        g += pow(nl, 110.0) * 1.3 + pow(nl, 14.0) * 0.07;
        vec2 dn = d / max(rr, 1e-4);
        g += smoothstep(0.8, 0.98, rr) * pow(max(dot(dn, normalize(vec2(0.55, -0.8))), 0.0), 2.0) * 0.32 * vec3(1.0, 0.9, 0.75);
        g *= 1.0 - 0.28 * smoothstep(0.965, 0.998, rr);
        g += 0.2 * smoothstep(0.93, 0.972, rr) * (1.0 - smoothstep(0.972, 0.99, rr));
        float sp = length(uVel);
        if (sp > 1.0) {
            vec2 dir = uVel / sp;
            float k = clamp(sp / 1400.0, 0.0, 1.0);
            float band = smoothstep(0.52, 0.84, rr) * (1.0 - smoothstep(0.93, 1.0, rr)) * smoothstep(0.15, 0.9, dot(dn, dir));
            vec3 spect = 0.5 + 0.5 * cos(6.2832 * (rr * 1.7 - uTime * 0.2 + vec3(0.0, 0.33, 0.67)));
            g += band * k * spect;
        }
        col = mix(col, g, 1.0 - outside);
    }
    vec2 q = (uv - 0.5) * vec2(1.0, 1.2);
    col *= 1.0 - 0.5 * pow(clamp(dot(q, q) * 1.5, 0.0, 1.0), 1.4);
    col += (hash(p + fract(uTime * 7.13) * 97.0) - 0.5) * 0.035;
    float bar = uBars * 0.105 * uRes.y;
    if (p.y < bar || p.y > uRes.y - bar) col = vec3(0.0);
    o = vec4(col * uFade, 1.0);
}`;

    function program(vs, fs) {
        const mk = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            return s;
        };
        const p = gl.createProgram();
        gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
        gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        const u = {};
        for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
            const name = gl.getActiveUniform(p, i).name;
            u[name] = gl.getUniformLocation(p, name);
        }
        return { p, u };
    }

    let skyP, splatP, glassP;
    try {
        skyP = program(FULLSCREEN_VS, SKY_FS);
        splatP = program(SPLAT_VS, SPLAT_FS);
        glassP = program(FULLSCREEN_VS, GLASS_FS);
    } catch (e) {
        console.warn("cinema: shaders failed, keeping the plain sky", e);
        return;
    }

    /* --- GPU state --------------------------------------------------------- */
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const cornerBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-2, -2, 2, -2, -2, 2, 2, 2]), gl.STATIC_DRAW);
    const aCorner = gl.getAttribLocation(splatP.p, "aCorner");
    gl.enableVertexAttribArray(aCorner);
    gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0);
    const indexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuf);
    const aIndex = gl.getAttribLocation(splatP.p, "aIndex");
    gl.enableVertexAttribArray(aIndex);
    gl.vertexAttribIPointer(aIndex, 1, gl.UNSIGNED_INT, 0, 0);
    gl.vertexAttribDivisor(aIndex, 1);
    gl.bindVertexArray(null);
    const emptyVao = gl.createVertexArray();

    const tex = () => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
    };
    const posTex = tex(), caTex = tex(), cbTex = tex(), colTex = tex();

    let scene = null, order = null, depth = null, counts = null;
    function upload(S) {
        scene = S;
        const W = 2048, H = Math.max(1, Math.ceil(S.n / W)), size = W * H * 4;
        const fit = (a, T) => { if (a.length === size) return a; const b = new T(size); b.set(a.subarray(0, Math.min(a.length, size))); return b; };
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.bindTexture(gl.TEXTURE_2D, posTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, fit(S.pos, Float32Array));
        gl.bindTexture(gl.TEXTURE_2D, caTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, fit(S.ca, Float32Array));
        gl.bindTexture(gl.TEXTURE_2D, cbTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, fit(S.cb, Float32Array));
        gl.bindTexture(gl.TEXTURE_2D, colTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, fit(S.col, Uint8Array));
        order = new Uint32Array(S.n);
        depth = new Float32Array(S.n);
        counts = new Uint32Array(65536);
        gl.bindBuffer(gl.ARRAY_BUFFER, indexBuf);
        gl.bufferData(gl.ARRAY_BUFFER, order.byteLength, gl.DYNAMIC_DRAW);
        lastSortF = null;
    }

    /* Back to front, by depth along the view direction: a 16-bit counting
       sort, linear in the number of splats. */
    let lastSortF = null, lastSortE = null;
    function sort(f, eye) {
        const n = scene.n, P = scene.pos;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < n; i++) {
            const z = (P[i * 4] - eye[0]) * f[0] + (P[i * 4 + 1] - eye[1]) * f[1] + (P[i * 4 + 2] - eye[2]) * f[2];
            depth[i] = z;
            if (z < lo) lo = z;
            if (z > hi) hi = z;
        }
        const k = 65535 / Math.max(hi - lo, 1e-6);
        counts.fill(0);
        for (let i = 0; i < n; i++) { const b = ((hi - depth[i]) * k) | 0; depth[i] = b; counts[b]++; }
        for (let i = 1; i < 65536; i++) counts[i] += counts[i - 1];
        for (let i = n - 1; i >= 0; i--) order[--counts[depth[i]]] = i;
        gl.bindBuffer(gl.ARRAY_BUFFER, indexBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, order);
        lastSortF = f.slice(); lastSortE = eye.slice();
    }

    // the offscreen target the glass samples, with mips for frost and bloom
    const sceneTex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    let fbW = 0, fbH = 0;
    function target(w, h) {
        if (w === fbW && h === fbH) return;
        fbW = w; fbH = h;
        gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* --- the page around the canvas -------------------------------------- */
    const groups = {
        a: document.getElementById("cineA"),
        b: document.getElementById("cineB"),
        c: document.getElementById("cineC"),
        cue: document.getElementById("cineCue"),
        fade: document.getElementById("cineFade"),
    };
    root.classList.add("cinema-on");
    if (still) root.classList.add("cinema-still");

    /* A blur wipe: w brings an element in from the left through a soft
       edge, x takes it out upward into blur. Opacity only -- nothing is
       hidden from assistive technology, which reads the hero as text. */
    function wipe(el, w, x) {
        if (!el) return;
        const vis = w * (1 - x);
        el.style.opacity = vis.toFixed(3);
        const blur = Math.max(1 - w, x) * 12;
        el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
        const edge = w * 140 - 20;
        const m = w >= 0.999 ? "" : `linear-gradient(90deg, #000 ${(edge - 20).toFixed(1)}%, transparent ${(edge + 20).toFixed(1)}%)`;
        el.style.webkitMaskImage = m; el.style.maskImage = m;
        el.style.transform = x > 0.001 ? `translateY(${(-x * 26).toFixed(1)}px) scale(${(1 + x * 0.03).toFixed(4)})` : "";
        el.style.pointerEvents = vis < 0.5 ? "none" : "";
    }
    const span = (t, a, b) => clamp01((t - a) / (b - a));
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Focusing a link in the call to action scrolls the hero to where the
    // call to action is visible, so keyboard users are never on an
    // invisible control.
    if (!still && groups.c) {
        groups.c.addEventListener("focusin", () => {
            if (progress() < 0.72) scrollTo({ top: hero.offsetTop + hero.offsetHeight - innerHeight, behavior: "instant" });
        });
    }

    function progress() {
        if (still) return 0;
        const r = hero.getBoundingClientRect();
        return clamp01(-r.top / Math.max(1, r.height - innerHeight));
    }

    /* --- the lens ---------------------------------------------------------
       Its resting place is a function of the scroll: a dome sitting on the
       bottom edge at the top of the page, a small lens above the call to
       action at the bottom of the hero. A spring follows that rest (or the
       pointer, while it is being dragged), and the spring's speed is what
       lights the caustic. */
    const orb = { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, drag: false, px: 0, py: 0, init: false };
    function rest(t, W, H) {
        const R0 = Math.min(W * 0.46, H * 0.62, 560);
        const R1 = Math.max(38, Math.min(64, Math.min(W, H) * 0.075));
        const s = ease(span(t, 0.06, 0.7));
        return { x: W * 0.5, y: mix(H + R0 * 0.42, H * 0.36, s), r: mix(R0, R1, s) };
    }
    function onStage(e) { const b = stage.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
    let pointer = [0, 0], pointerN = [0, 0];
    stage.addEventListener("pointermove", e => {
        const [x, y] = onStage(e);
        pointer = [x, y];
        pointerN = [x / stage.clientWidth - 0.5, y / stage.clientHeight - 0.5];
        if (orb.drag) { orb.px = x; orb.py = y; }
        else stage.style.cursor = Math.hypot(x - orb.x, y - orb.y) < orb.r && e.pointerType !== "touch" ? "grab" : "";
    });
    if (!still) {
        stage.addEventListener("pointerdown", e => {
            if (e.pointerType === "touch" || e.button !== 0) return;
            if (e.target.closest("a, button")) return;
            const [x, y] = onStage(e);
            if (Math.hypot(x - orb.x, y - orb.y) > orb.r) return;
            orb.drag = true; orb.px = x; orb.py = y;
            stage.setPointerCapture(e.pointerId);
            stage.style.cursor = "grabbing";
            e.preventDefault();
        });
        const release = () => { orb.drag = false; stage.style.cursor = ""; };
        stage.addEventListener("pointerup", release);
        stage.addEventListener("pointercancel", release);
    }

    /* --- the frame loop ---------------------------------------------------- */
    let night = darkMQ.matches;
    let quality = 1, frames = 0, slow = 0;
    let running = true, raf = 0, t0 = performance.now(), last = t0, tS = progress();
    const intro = still ? 99 : 0;

    function resize() {
        const dpr = Math.min(devicePixelRatio || 1, 1.5) * quality;
        const w = Math.max(2, Math.round(stage.clientWidth * dpr)), h = Math.max(2, Math.round(stage.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        target(w, h);
    }

    function frame(now) {
        raf = 0;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const time = still ? 20 : (now - t0) / 1000;
        const W = stage.clientWidth, H = stage.clientHeight;
        resize();

        // scroll, smoothed a little so a wheel's steps read as a glide
        const t = progress();
        tS = still ? 0 : tS + (t - tS) * Math.min(1, dt * 7);

        // copy
        if (!still) {
            const ia = ease(span(time, 0.35 + intro, 1.5 + intro));
            wipe(groups.a, ia, span(tS, 0.16, 0.3));
            wipe(groups.b, ease(span(tS, 0.3, 0.42)), span(tS, 0.56, 0.66));
            wipe(groups.c, ease(span(tS, 0.66, 0.8)), 0);
            if (groups.cue) groups.cue.style.opacity = (span(time, 1.6, 2.2) * (1 - span(tS, 0, 0.05))).toFixed(3);
            if (groups.fade) groups.fade.style.opacity = span(t, 0.86, 1).toFixed(3);
            const bar = parseInt(getComputedStyle(root).getPropertyValue("--bar-h"), 10) || 64;
            root.classList.toggle("scrolled", tS > 0.3 || hero.getBoundingClientRect().bottom <= bar);
        }

        // lens
        const R = rest(tS, W, H);
        if (!orb.init || still) { Object.assign(orb, R, { vx: 0, vy: 0, vr: 0, init: true }); }
        const tx = orb.drag ? orb.px : R.x + pointerN[0] * 18 * (1 - span(tS, 0.7, 1) * 0.5);
        const ty = orb.drag ? orb.py : R.y + pointerN[1] * 12;
        const k = 90, c = 13;
        orb.vx += ((tx - orb.x) * k - orb.vx * c) * dt;
        orb.vy += ((ty - orb.y) * k - orb.vy * c) * dt;
        orb.vr += ((R.r - orb.r) * k - orb.vr * c) * dt;
        orb.x += orb.vx * dt; orb.y += orb.vy * dt; orb.r = Math.max(8, orb.r + orb.vr * dt);

        // camera: a slow orbit that the scroll swings round and brings in
        const yaw = 0.55 + time * 0.035 + tS * 1.25 + pointerN[0] * 0.12;
        const pitch = mix(0.3, 0.1, tS) - pointerN[1] * 0.05;
        const dist = mix(13.5, 9.2, ease(tS)) * (W < 700 ? 1.3 : 1);
        const tgt = [0, 0.1 + Math.sin(time * 0.6) * 0.08 + mix(-0.4, 0.4, tS), 0];
        const eye = [tgt[0] + Math.sin(yaw) * Math.cos(pitch) * dist, tgt[1] + Math.sin(pitch) * dist, tgt[2] + Math.cos(yaw) * Math.cos(pitch) * dist];
        const f = [(tgt[0] - eye[0]) / dist, (tgt[1] - eye[1]) / dist, (tgt[2] - eye[2]) / dist];
        const fl = Math.hypot(f[0], f[1], f[2]); f[0] /= fl; f[1] /= fl; f[2] /= fl;
        const right = norm([f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0]);   // f x up
        const up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
        const rot = new Float32Array([right[0], up[0], f[0], right[1], up[1], f[1], right[2], up[2], f[2]]);
        const fy = canvas.height / (2 * Math.tan(19 * Math.PI / 180));
        const focal = [fy, fy];

        if (scene && scene.n) {
            const moved = !lastSortF || f[0] * lastSortF[0] + f[1] * lastSortF[1] + f[2] * lastSortF[2] < 0.99999
                || Math.hypot(eye[0] - lastSortE[0], eye[1] - lastSortE[1], eye[2] - lastSortE[2]) > 0.02;
            if (moved && (scene.n < 120000 || frames % 3 === 0)) sort(f, eye);
        }

        // pass 1: sky, then splats, into the offscreen target
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, fbW, fbH);
        gl.disable(gl.BLEND);
        gl.useProgram(skyP.p);
        gl.uniformMatrix3fv(skyP.u.uRot, false, rot);
        gl.uniform2f(skyP.u.uFocal, focal[0], focal[1]);
        gl.uniform2f(skyP.u.uRes, fbW, fbH);
        gl.uniform1f(skyP.u.uNight, night ? 1 : 0);
        gl.uniform1f(skyP.u.uTime, time);
        gl.bindVertexArray(emptyVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (scene && scene.n) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.useProgram(splatP.p);
            const bind = (unit, t, name) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(splatP.u[name], unit); };
            bind(0, posTex, "uPos"); bind(1, caTex, "uCovA"); bind(2, cbTex, "uCovB"); bind(3, colTex, "uCol");
            gl.uniformMatrix3fv(splatP.u.uRot, false, rot);
            gl.uniform3f(splatP.u.uEye, eye[0], eye[1], eye[2]);
            gl.uniform2f(splatP.u.uFocal, focal[0], focal[1]);
            gl.uniform2f(splatP.u.uRes, fbW, fbH);
            gl.uniform1f(splatP.u.uTime, time);
            gl.uniform2f(splatP.u.uFall, fallInfo[0], fallInfo[1]);
            gl.bindVertexArray(vao);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, scene.n);
            gl.disable(gl.BLEND);
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.generateMipmap(gl.TEXTURE_2D);

        // pass 2: the glass, the grade, the bars, to the screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(glassP.p);
        gl.uniform1i(glassP.u.uScene, 0);
        const sx = canvas.width / W;
        gl.uniform2f(glassP.u.uRes, canvas.width, canvas.height);
        gl.uniform3f(glassP.u.uOrb, orb.x * sx, (H - orb.y) * sx, orb.r * sx);
        gl.uniform2f(glassP.u.uVel, orb.vx * sx, -orb.vy * sx);
        gl.uniform1f(glassP.u.uTime, time);
        gl.uniform1f(glassP.u.uNight, night ? 1 : 0);
        gl.uniform1f(glassP.u.uBars, still ? 0 : 1 - ease(span(time, 0.5, 2.4)));
        gl.uniform1f(glassP.u.uFade, still ? 1 : ease(span(time, 0, 1.2)));
        gl.bindVertexArray(emptyVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // keep the frame budget: step resolution down if frames run long
        frames++;
        if (!still && now - t0 > 2500) {
            slow = slow * 0.95 + (dt > 0.026 ? 0.05 : 0);
            if (slow > 0.6 && quality > 0.5) { quality -= 0.15; slow = 0; }
        }
        if (running && !still) raf = requestAnimationFrame(frame);
    }

    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    new IntersectionObserver(es => {
        running = es[0].isIntersecting;
        if (running) { last = performance.now(); kick(); }
    }).observe(hero);
    addEventListener("resize", kick);

    function build() {
        const url = canvas.dataset.scene;
        if (url) {
            loadCapture(url, canvas.dataset.sceneFlip === "yz")
                .then(S => { upload(S); kick(); })
                .catch(e => { console.warn("cinema: capture failed, using the island", e); upload(buildIsland(night)); kick(); });
        } else {
            upload(buildIsland(night));
        }
    }
    darkMQ.addEventListener("change", e => { night = e.matches; if (!canvas.dataset.scene) upload(buildIsland(night)); kick(); });
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); running = false; root.classList.remove("cinema-on"); });

    build();
    kick();
})();
