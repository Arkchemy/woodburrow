# Discord

Things that live on the Arkchemy server rather than the website.

| file | what it is |
|---|---|
| `EMOJI.md` | the emoji to create, and the naming convention they follow |
| `rules.json` | the #rules content, as Discord embeds |
| `post.py` | posts `rules.json` to a channel |
| `emoji_sync.py` | fills `public/emoji.json`'s ids in from the server |

## Posting the rules

```bash
DISCORD_BOT_TOKEN=... python3 discord/post.py <channel_id> --dry-run
```

Drop `--dry-run` to send. The token is the same one the site uses; it is in the
Vercel project's environment variables.

`post.py` only posts. It deletes nothing, and it is not going to: deleting the
old message is two clicks in Discord and cannot be undone, which is not a thing
to hand to a script.

## Emoji on the website

`public/emoji.json` is the shared registry: the same `:name:` works in Discord
and on the site. Every entry has a unicode fallback, so the site is correct
before a single emoji has been uploaded.

Rather than copying ids by hand, sync them:

```bash
DISCORD_BOT_TOKEN=... python3 discord/emoji_sync.py --dry-run
```

It matches on name and reports three things: what it filled in, what the
registry expects that the server does not have, and what the server has that
the registry has never heard of — the last is usually a typo at upload time.
Drop `--dry-run` to write, then `python3 tools/stamp.py` to bust the cache.
