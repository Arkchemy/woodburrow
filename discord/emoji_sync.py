#!/usr/bin/env python3
"""Fill public/emoji.json's ids in from the server's actual emoji.

Usage:
    DISCORD_BOT_TOKEN=... python3 discord/emoji_sync.py [--dry-run]

Reads every custom emoji on the guild and matches it to the registry by name.
Copying ids by hand is the step most likely to go wrong, and it has to happen
again every time an emoji is re-uploaded, so it may as well be one command.

Reports three things: what it filled in, what the registry wants that the
server does not have, and what the server has that the registry has never
heard of -- the last one is usually a name typo at upload time.
"""
import json
import os
import pathlib
import sys
import urllib.request

API = "https://discord.com/api/v10"
GUILD = "1536813901491216414"
REG = pathlib.Path(__file__).resolve().parent.parent / "public" / "emoji.json"


def guild_emoji(token: str) -> dict:
    req = urllib.request.Request(
        f"{API}/guilds/{GUILD}/emojis",
        headers={"Authorization": f"Bot {token}",
                 "User-Agent": "arkchemy-emoji (https://github.com/Arkchemy, 1.0)"},
    )
    with urllib.request.urlopen(req) as r:
        return {e["name"]: e for e in json.load(r)}


def main() -> int:
    dry = "--dry-run" in sys.argv
    token = os.environ.get("DISCORD_BOT_TOKEN")
    if not token:
        print("DISCORD_BOT_TOKEN is not set. It is the same token the site uses;\n"
              "copy it out of the Vercel project's environment variables.", file=sys.stderr)
        return 2

    doc = json.loads(REG.read_text())
    reg = doc["emoji"]
    live = guild_emoji(token)

    filled, changed, missing = [], [], []
    for name, entry in reg.items():
        got = live.get(name)
        if not got:
            missing.append(name)
            continue
        if entry.get("id") == got["id"]:
            continue
        (changed if entry.get("id") else filled).append(name)
        entry["id"] = got["id"]
        # An animated emoji is served as .gif; the site needs to know which.
        if got.get("animated"):
            entry["animated"] = True
        elif "animated" in entry:
            del entry["animated"]

    unknown = [n for n in live if n not in reg]

    for label, names in (("filled in", filled), ("id changed", changed),
                         ("not on the server", missing),
                         ("on the server but not in the registry", unknown)):
        if names:
            print(f"  {label} ({len(names)}): {', '.join(sorted(names))}")
    if not (filled or changed):
        print("  registry already matches the server")

    if dry:
        print("\n--dry-run: public/emoji.json was not written.")
        return 0
    if filled or changed:
        REG.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        print(f"\n  wrote {REG.relative_to(REG.parents[2])} -- run tools/stamp.py to bust the cache")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
