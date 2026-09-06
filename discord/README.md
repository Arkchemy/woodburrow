# Discord

Things that live on the Arkchemy server rather than the website.

| file | what it is |
|---|---|
| `EMOJI.md` | the emoji to create, and the naming convention they follow |
| `rules.json` | the #rules content, as Discord embeds |
| `post.py` | posts `rules.json` to a channel |

## Posting the rules

```bash
DISCORD_BOT_TOKEN=... python3 discord/post.py <channel_id> --dry-run
```

Drop `--dry-run` to send. The token is the same one the site uses; it is in the
Vercel project's environment variables.

`post.py` only posts. It deletes nothing — clearing the old messages is a
manual step, on purpose: Discord deletions cannot be undone, and a script that
does them in bulk is one mistyped channel id away from an accident.

To remove the old #rules posts, the least risky route is to delete the channel
and make a new one (Discord treats that as one action you confirm, rather than
many), then run `post.py` against the new channel.

## Emoji on the website

`public/emoji.json` is the shared registry: the same `:name:` works in Discord
and on the site. Every entry has a unicode fallback, so the site is correct
before a single emoji has been uploaded.
