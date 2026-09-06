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

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(PUB), **kw)
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
