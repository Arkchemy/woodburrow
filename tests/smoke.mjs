// Smoke test for the whole site, in a real browser.
//
//   python3 tools/serve.py 8902 &      # production headers, stubbed /api
//   node tests/smoke.mjs [base-url]     # default http://127.0.0.1:8902
//
// Every page in public/ is loaded at a desktop and a phone width under the
// production Content-Security-Policy (tools/serve.py sends vercel.json's
// headers), and fails on:
//   * an uncaught exception or a console error
//   * a CSP violation -- the class of bug that renders an empty page in
//     production and nothing locally
//   * a same-origin request that comes back 4xx/5xx (a broken image, a
//     missing script, an /api route the page calls that does not exist)
//   * a page wider than the phone viewport (sideways scrolling)
//   * a <main> with next to no text in it
// and the front page's hero is checked in its three modes: rendered
// (WebGL2), still (reduced motion) and plain (no WebGL at all).
//
// Screenshots of every page land in tests/out/ for a human to look at; CI
// uploads them as an artifact.
//
// Needs Playwright (npm install --no-save playwright) and a Chromium; the
// hero runs on SwiftShader, Chromium's software GPU, so no graphics card is
// needed but frames are slow -- nothing here waits on animation.

import { readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8902").replace(/\/$/, "");
const OUT = join(ROOT, "tests", "out");
mkdirSync(OUT, { recursive: true });

const pages = readdirSync(join(ROOT, "public"))
    .filter(f => f.endsWith(".html"))
    .map(f => f === "index.html" ? "/" : "/" + f.replace(/\.html$/, ""))
    .sort();

const VIEWPORTS = [
    { name: "desktop", width: 1280, height: 800 },
    { name: "phone", width: 390, height: 844 },
];

const failures = [];
const fail = (where, what) => { failures.push(`${where}: ${what}`); console.log(`  FAIL ${what}`); };

async function visit(browser, path, vp, opts = {}) {
    const where = `${path} @ ${vp.name}${opts.label ? " " + opts.label : ""}`;
    console.log(where);
    const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: opts.reduce ? "reduce" : "no-preference",
        colorScheme: opts.dark ? "dark" : "light",
    });
    const page = await ctx.newPage();
    // CSP violations do not always reach the console as errors; listen for
    // the DOM event itself, before any page script runs
    await page.addInitScript(() => {
        window.__csp = [];
        document.addEventListener("securitypolicyviolation",
            e => window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || "inline"}`));
    });
    page.on("pageerror", e => fail(where, "uncaught: " + e.message));
    page.on("console", m => {
        if (m.type() !== "error") return;
        // a failed load is reported below with its URL and status
        if (/^Failed to load resource/.test(m.text())) return;
        fail(where, "console error: " + m.text());
    });
    page.on("response", r => {
        if (r.url().startsWith(BASE) && r.status() >= 400)
            fail(where, `${r.status()} for ${r.url().slice(BASE.length)}`);
    });

    const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
    const expect404 = path === "/404";
    if (!res || (!expect404 && res.status() !== 200)) fail(where, `page status ${res && res.status()}`);
    await page.waitForTimeout(1500);

    const csp = await page.evaluate(() => window.__csp);
    for (const v of csp) fail(where, "CSP: " + v);

    const { overflow, text, cls } = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        text: (document.querySelector("main") || document.body).innerText.trim().length,
        cls: document.documentElement.className,
    }));
    if (overflow > 1) fail(where, `page is ${overflow}px wider than the viewport`);
    if (text < 200) fail(where, `<main> has only ${text} characters of text`);

    if (path === "/" && opts.expect) {
        const has = c => cls.split(/\s+/).includes(c);
        if (opts.expect === "rendered" && !(has("cinema-on") && !has("cinema-still")))
            fail(where, `hero not rendered (html class "${cls}")`);
        if (opts.expect === "still" && !(has("cinema-on") && has("cinema-still")))
            fail(where, `hero not in still mode (html class "${cls}")`);
        if (opts.expect === "plain") {
            if (has("cinema-on")) fail(where, "hero claims WebGL with WebGL disabled");
            const sky = await page.evaluate(() => getComputedStyle(document.querySelector(".sky")).display);
            if (sky === "none") fail(where, "no WebGL and the CSS sky is hidden: an empty hero");
        }
    }

    const shot = `${(path === "/" ? "index" : path.slice(1))}-${vp.name}${opts.label ? "-" + opts.label : ""}.png`;
    await page.screenshot({ path: join(OUT, shot), timeout: 120000 });
    await ctx.close();
}

const GL = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const browser = await chromium.launch({ args: GL });
for (const path of pages) {
    for (const vp of VIEWPORTS) {
        // the hero at 1280x800 on a software GPU is slow but fine; the check
        // is only that it starts, not how fast it runs
        await visit(browser, path, vp, path === "/" ? { expect: "rendered" } : {});
    }
}
await visit(browser, "/", VIEWPORTS[0], { expect: "still", reduce: true, label: "reduced-motion" });
await visit(browser, "/", VIEWPORTS[0], { expect: "rendered", dark: true, label: "dark" });
await browser.close();

const noGL = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
await visit(noGL, "/", VIEWPORTS[1], { expect: "plain", label: "no-webgl" });
await noGL.close();

if (failures.length) {
    console.log(`\n${failures.length} failure(s):\n` + failures.map(f => "  " + f).join("\n"));
    process.exit(1);
}
console.log(`\nall ${pages.length} pages clean at ${VIEWPORTS.length} sizes, and the hero in all three modes`);
