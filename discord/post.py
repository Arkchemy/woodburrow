#!/usr/bin/env python3
"""Post the embeds in rules.json to a channel.

Usage:
    DISCORD_BOT_TOKEN=... python3 post.py <channel_id> [--dry-run]

This script only ever POSTs. It does not delete, edit or move anything, so the
worst it can do is add messages you then remove by hand. Clearing the old
#rules posts is left to you deliberately -- deleting Discord messages is not
reversible, and a script that does it in bulk is one typo away from taking out
the wrong channel.

The bot needs: View Channel, Send Messages, and Embed Links on the target
channel.
"""
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

API = "https://discord.com/api/v10"
HERE = pathlib.Path(__file__).resolve().parent


def post(token: str, channel: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"{API}/channels/{channel}/messages",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bot {token}",
            "Content-Type": "application/json",
            "User-Agent": "arkchemy-rules (https://github.com/Arkchemy, 1.0)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv

    if len(args) != 1:
        print(__doc__, file=sys.stderr)
        return 2
    channel = args[0]

    token = os.environ.get("DISCORD_BOT_TOKEN")
    if not token and not dry:
        print("DISCORD_BOT_TOKEN is not set. It is the same token the site uses;\n"
              "copy it out of the Vercel project's environment variables.", file=sys.stderr)
        return 2

    messages = json.loads((HERE / "rules.json").read_text())["messages"]

    for i, msg in enumerate(messages, 1):
        title = msg["embeds"][0].get("title", "(no title)")
        if dry:
            print(f"  [dry-run] {i}/{len(messages)}  {title}")
            continue
        try:
            sent = post(token, channel, msg)
            print(f"  posted {i}/{len(messages)}  {title}  -> message {sent['id']}")
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:400]
            print(f"  FAILED {i}/{len(messages)}  {title}\n    HTTP {e.code}: {body}", file=sys.stderr)
            return 1
        # Discord's per-channel limit is 5 messages / 5s; this stays well under.
        time.sleep(1.2)

    if dry:
        print("\nNothing was sent. Drop --dry-run to post for real.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
