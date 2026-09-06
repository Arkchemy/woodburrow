# Discord

Things that live on the Arkchemy server rather than the website.

| file | what it is |
|---|---|
| `EMOJI.md` | the emoji to create, and the naming convention they follow |
| `rules.json` | the #rules content, as Discord embeds |
| `post.py` | posts `rules.json` to a channel |
| `emoji_sync.py` | fills `public/emoji.json`'s ids in from the server |

## How the rules get there

`discord/rules.json` is the source of truth, and the deployed site reconciles
the channel to it: `/api/rules-sync` runs daily on a Vercel cron, posts any
message that is missing and **edits** any that has drifted. Editing is why
this works at all -- a bot can edit its own messages, so "replacing the rules"
never needs a delete.

It never removes anything. Messages posted by a person are left alone (a bot
cannot edit someone else's message anyway), and if `rules.json` ever shrinks,
the surplus is reported rather than deleted.

Two env vars matter, both Secrets in the Vercel project:

* `DISCORD_BOT_TOKEN` -- the bot. Its value cannot be read back by anyone,
  which is exactly why this runs server-side instead of from a laptop.
* `CRON_SECRET` -- gates the route. Vercel sends it as a bearer token on cron
  invocations. **Without it the route returns 503 and does nothing**, so it is
  inert until deliberately configured.

To see what it would do without touching anything:

```
GET /api/rules-sync?dry=1&key=<CRON_SECRET>
```

Drop `dry=1` to apply. Change `rules.json`, push, and the next run picks it up
-- or hit the URL yourself if you do not want to wait for the cron.

## Posting from a terminal instead

`post.py` does the same job from a laptop, for when you have the token to
hand and do not want to wait for a deploy:

```bash
DISCORD_BOT_TOKEN=... python3 discord/post.py rules --dry-run
```

Drop `--dry-run` to send. The token is the same one the site uses; it is in the
Vercel project's environment variables.

The channel can be a name or an id. `--list` prints every text channel the bot
can see. Before sending anything, the embeds are checked against Discord's
limits (6000 characters an embed, 1024 a field, 25 fields), so a bad edit fails
up front rather than after the first of three messages has already landed.

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
