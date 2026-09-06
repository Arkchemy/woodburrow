// The server's custom emoji, by name.
//
// public/emoji.json stays the registry of which names the site uses and what
// each falls back to, but the *ids* come from here rather than being copied
// into the file by hand. Upload a new emoji with the right name and it starts
// working on the site with no commit at all -- and re-uploading one (which
// gives it a new id) does not silently break the page.
//
// Read-only, no secrets in the response: emoji ids are already public to
// anyone in the server, and the CDN URLs they build are public too.

const GUILD = '1536813901491216414';

export default async function handler(req, res) {
  if (!process.env.DISCORD_BOT_TOKEN) {
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({ emoji: {}, reason: 'no-token' });
    return;
  }
  try {
    const r = await fetch(`https://discord.com/api/v10/guilds/${GUILD}/emojis`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'User-Agent': 'arkchemy-site',
      },
    });
    if (!r.ok) {
      res.setHeader('Cache-Control', 's-maxage=60');
      res.status(200).json({ emoji: {}, reason: 'discord-' + r.status });
      return;
    }
    const emoji = {};
    for (const e of await r.json()) {
      if (e.name && e.id) emoji[e.name] = { id: e.id, animated: !!e.animated };
    }
    // Emoji change rarely; an hour at the edge means one upstream call an hour
    // however many people are reading the site.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ emoji, count: Object.keys(emoji).length });
  } catch {
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({ emoji: {}, reason: 'fetch-failed' });
  }
}
