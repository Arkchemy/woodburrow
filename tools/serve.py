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
        {"id": "1", "content": "**Boot** reached static-init 113/114; the stall is a freed frame manager.",
         "timestamp": "2026-09-06T09:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "2", "content": "Roster now covers all six games. `rosters.json` rebuilt.",
         "timestamp": "2026-09-06T11:30:00+00:00",
         "author": {"name": "Claude", "id": "2", "avatar": None, "bot": True},
         "attachments": []}]},
    "faq": {"messages": [
        {"id": "3", "content": "**Is this legal?** Arkchemy ships no game content. You supply your own copy.",
         "timestamp": "2026-09-01T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "4", "content": "**Does it run yet?** Not yet -- boot stops while decompressing the first archive.",
         "timestamp": "2026-09-02T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "5", "content": "**What hardware does it target?** The Nintendo Switch. Docked output is 1080p.",
         "timestamp": "2026-09-06T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "6", "content": "**Do I need my own copy?** Yes. Arkchemy ships no game content.",
         "timestamp": "2026-09-07T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "7", "content": "**Why a recompiler and not an emulator?** The PowerPC code is translated to C ahead of time, then built for ARM64.",
         "timestamp": "2026-09-08T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "8", "content": "**Which games are covered?** All six share one engine, so work on the first carries over.",
         "timestamp": "2026-09-09T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "9", "content": "**Can I help?** Yes -- the repositories are on GitHub under Arkchemy.",
         "timestamp": "2026-09-01T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "10", "content": "**Are the voice lines included?** They are archived for documentation, like the wiki does.",
         "timestamp": "2026-09-02T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "11", "content": "**When will it be playable?** Boot currently stops on the first archive; no date.",
         "timestamp": "2026-09-03T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []},
        {"id": "12", "content": "**Does it work on other consoles?** Not yet. The shim layer targets the Switch.",
         "timestamp": "2026-09-04T10:00:00+00:00",
         "author": {"name": "Aaronateataco", "id": "1", "avatar": None, "bot": False},
         "attachments": []}]},
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
            elif q.path == "/api/license":
                lic = ROOT / "LICENSE"
                body = _j.dumps({"repo": args.get("repo", "woodburrow"),
                                 "text": lic.read_text() if lic.exists() else ""}).encode()
            else:
                self.send_error(404); return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers(); self.wfile.write(body); return
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
