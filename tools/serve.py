#!/usr/bin/env python3
"""Serve public/ with the production headers from vercel.json.

The previous local server sent no CSP, so an inline <script> passed every
local check and then rendered an empty page in production, where
script-src 'self' blocks it. Test against the real headers.
"""
import http.server, socketserver, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PUB  = ROOT / "public"
HEADERS = []
cfg = json.loads((ROOT / "vercel.json").read_text())
for rule in cfg.get("headers", []):
    if rule.get("source") in ("/(.*)", "/(.*)/"):
        HEADERS += [(h["key"], h["value"]) for h in rule["headers"]]

_INTENT_OFF = True
_LOCAL_DISCORD = {
    "progress": {"messages": [
        # Oldest first, which is what /api/discord-channel hands the page: it
        # reverses Discord's newest-first pages. The front page reverses again
        # for this feed. The stub used to list these newest-first, so locally
        # the feed came out backwards and the two-post cap showed the two
        # oldest posts -- a bug in the fixture that looked like a bug in the page.
        {"id": "8", "content": "**Wordmark** redrawn as outlined paths so it needs no font to have loaded.",
         "timestamp": "2026-09-03T09:10:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "7", "content": "`igArchive` v4 layout written up. Four file opens before the stall.",
         "timestamp": "2026-09-04T14:20:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "6", "content": "Pool index 28 is invisible to LZMA. Chasing the wipe at call 440,610.",
         "timestamp": "2026-09-05T16:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "1", "content": "**Boot** reached static-init 113/114; the stall is a freed frame manager.",
         "timestamp": "2026-09-06T09:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "2", "content": "Roster now covers all six games. `rosters.json` rebuilt.",
         "timestamp": "2026-09-06T11:30:00+00:00",
         "author": {"name": "Claude", "id": "2", "avatar": None, "bot": True},
         "attachments": []}]},
    "faq": {"messages": [{'id': '3', 'content': '**Who is Xpec guy? <:xpecGuy:1543926752856776804>** A running joke in the server.', 'timestamp': '2026-09-01T10:00:00+00:00', 'author': {'name': 'Aaronateataco', 'id': '1', 'avatar': None, 'bot': False}, 'attachments': []}, {'id': '4', 'content': '**Why not talk about Arkchemy in the Skylanders: Reverse Engineering discord?**\nThey are heavily against GenAI in any project (even though I have an understanding of code and simply use it as a tool and use claude AI code).\nhttps://canary.discord.com/channels/832613039340650516/832613039340650519/1540510000101720186', 'timestamp': '2026-09-02T10:00:00+00:00', 'author': {'name': 'Aaronateataco', 'id': '1', 'avatar': None, 'bot': False}, 'attachments': []}, {'id': '5', 'content': '**Markdown check** normal, **bold**, *italic*, __underline__, ***bold italic***, __**bold underline**__, ~~strike~~, ||spoiler||, `code`, [masked](https://example.com)\n> a quote\n- one\n- two\n```\nint main(void) { return 0; }\n```', 'timestamp': '2026-09-03T10:00:00+00:00', 'author': {'name': 'Aaronateataco', 'id': '1', 'avatar': None, 'bot': False}, 'attachments': []}]},
}

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(PUB), **kw)

    def do_GET(self):
        # Vercel serves /api/* from serverless functions that are not running
        # here. Answer them locally so the page can be exercised end to end;
        # DISCORD_BOT_TOKEN and the live channels only exist in production.
        if self.path.startswith("/api/"):
            import json as _j, urllib.parse as _u
            q = _u.urlparse(self.path)
            args = dict(_u.parse_qsl(q.query))
            if q.path == "/api/discord-channel":
                # ?simulate=intentoff reproduces a bot without Message Content
                # Intent: Discord returns the messages but blanks the text.
                if args.get("simulate") == "intentoff":
                    body = _j.dumps({"fetched": 7, "withText": 0,
                                     "needsMessageContentIntent": True,
                                     "count": 0, "messages": []}).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers(); self.wfile.write(body); return
                which = args.get("channel", "")
                body = _j.dumps(_LOCAL_DISCORD.get(which, {"messages": []})).encode()
            elif q.path == "/api/avatar-image":
                # Vercel runs the real hardened proxy; locally just fetch the
                # allowlisted host so images resolve and a local check does not
                # report false broken-image counts.
                import urllib.request as _r
                src = args.get("src", "")
                if not src.startswith(("https://cdn.discordapp.com/",
                                       "https://avatars.githubusercontent.com/",
                                       "https://github.com/")):
                    self.send_error(400); return
                try:
                    up = _r.urlopen(_r.Request(src, headers={"User-Agent": "arkchemy-local"}), timeout=20)
                    data = up.read()
                    self.send_response(200)
                    self.send_header("Content-Type", up.headers.get("Content-Type", "image/png"))
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers(); self.wfile.write(data); return
                except Exception:
                    self.send_error(502); return
            elif q.path == "/api/discord-role":
                body = _j.dumps({"role": "testers", "scanned": 42, "count": 5,
                    "members": [{"id": str(i), "name": n, "avatar": None, "bot": False}
                                for i, n in enumerate(
                                    ["bonesinmysoup", "gutterbeasts", "jackthebloke",
                                     "LG-RZ", "retexcraft"], start=1)]}).encode()
            elif q.path == "/api/discord-avatar":
                body = _j.dumps({"username": "stub", "display_name": None,
                                 "avatar": None}).encode()
            elif q.path == "/api/discord-emoji":
                # Stands in for the live guild lookup. Gives one emoji a real
                # id so the "merge live ids over the registry" path is actually
                # exercised locally rather than assumed.
                body = _j.dumps({"emoji": {"buildPass": {"id": "1543926752856776804",
                                                         "animated": False}},
                                 "count": 1}).encode()
            elif q.path == "/api/discord-invite":
                # The real route reads Discord's public widget and falls back
                # to the permanent invite. ?simulate=none returns neither, to
                # check the footer hides the link rather than showing a dead one.
                if args.get("simulate") == "none":
                    body = _j.dumps({"invite": None, "reason": "widget-disabled"}).encode()
                else:
                    body = _j.dumps({"invite": "https://discord.com/invite/KJWyHUczCV",
                                     "source": "widget", "name": "Arkchemy",
                                     "online": 7}).encode()
            elif q.path == "/api/license":
                lic = ROOT / ("LEGAL.md" if args.get("repo") == "legal" else "LICENSE")
                body = _j.dumps({"repo": args.get("repo", "woodburrow"),
                                 "text": lic.read_text() if lic.exists() else ""}).encode()
            else:
                self.send_error(404); return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers(); self.wfile.write(body); return

        # vercel.json sets cleanUrls, so /legal serves legal.html. Without this
        # the sub-pages 404 locally and only ever get tested at the wrong URL.
        clean = self.path.split("?")[0].split("#")[0].strip("/")
        if clean and "." not in clean and (PUB / (clean + ".html")).exists():
            self.path = "/" + clean + ".html"
        super().do_GET()
    def end_headers(self):
        for k, v in HEADERS:
            if k.lower() != "strict-transport-security":   # pointless over http
                self.send_header(k, v)
        super().end_headers()
    def log_message(self, *a): pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8902
socketserver.TCPServer.allow_reuse_address = True
print(f"serving {PUB} on http://127.0.0.1:{port} with {len(HEADERS)} production headers")
with socketserver.ThreadingTCPServer(("127.0.0.1", port), H) as s:
    s.serve_forever()
