// Test for api/feed.js, with its two sources mocked: no network, no Discord
// token. Checks the feed is served, escapes hostile text, survives one source
// being down, and refuses to serve an empty feed when both are.
//
//   node tests/feed.mjs > /tmp/feed.xml && python3 -c "import xml.dom.minidom,sys; xml.dom.minidom.parse(sys.argv[1])" /tmp/feed.xml
//
// Prints the full feed on stdout so it can be checked with a real XML parser;
// everything else goes to stderr.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const findings = JSON.parse(readFileSync(join(ROOT, "public", "findings.json"), "utf8"));
const discord = { messages: [
    { id: "1", content: "**Stall** narrowed <:bootLoop:123> to the pool & <script>alert(1)</script>",
      timestamp: "2026-09-24T10:00:00Z", author: { name: "a <b>" } },
    { id: "2", content: "control \u0001 char and \"quotes\"", timestamp: "2026-09-25T10:00:00Z",
      edited: "2026-09-25T11:00:00Z", author: { name: "b" } },
]};

let mode;
globalThis.fetch = async url => {
    if (mode === "down") return { ok: false, status: 500 };
    if (url.endsWith("/findings.json")) return { ok: true, json: async () => findings };
    if (mode === "no-discord") return { ok: false, status: 502 };
    return { ok: true, json: async () => discord };
};
const { default: handler } = await import(join(ROOT, "api", "feed.js"));

async function run(m) {
    mode = m;
    const res = { code: 0, headers: {}, body: "",
        status(c) { this.code = c; return this; },
        setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
        send(b) { this.body = String(b); } };
    await handler({ headers: {}, query: {} }, res);
    return res;
}

let bad = 0;
const check = (ok, what) => { if (!ok) { bad++; console.error("FAIL " + what); } };

const full = await run("ok");
check(full.code === 200, "served with both sources up");
check(/application\/atom\+xml/.test(full.headers["content-type"] || ""), "atom content type");
const entries = (full.body.match(/<entry>/g) || []).length;
const dated = findings.findings.filter(f => f.title).length;
check(entries === dated + 2, `every finding and post is an entry (${entries} of ${dated + 2})`);
check(!full.body.includes("<script>"), "markup in a post is escaped");
check(full.body.includes(":bootLoop:"), "custom emoji become :name:");
check(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(full.body), "no XML-illegal control characters");
check(full.body.indexOf("control") < full.body.indexOf("Stall"), "newest entry first");

const half = await run("no-discord");
check(half.code === 200 && (half.body.match(/<entry>/g) || []).length === dated, "findings alone when Discord is down");

const none = await run("down");
check(none.code === 503, "503, not an empty feed, when both sources are down");

process.stdout.write(full.body);
console.error(bad ? `${bad} failure(s)` : `feed ok: ${entries} entries`);
process.exit(bad ? 1 : 0);
