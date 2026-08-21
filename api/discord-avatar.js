// Vercel serverless function: looks up a Discord user's real avatar via
// Discord's own official Bot API (GET /users/{id}) -- this is a real,
// documented endpoint, not a scraping hack, and works for any user by
// id regardless of whether they've opted in to anything (unlike
// Lanyard) or joined any particular server. Runs server-side so CORS
// doesn't apply here the way it did for the two client-side proxy
// attempts that didn't work (see site.js's own comment history) --
// the browser only ever talks to this same-origin route, never to
// Discord directly, so the bot token never reaches the client.
//
// Needs a real Discord bot token set as the DISCORD_BOT_TOKEN
// environment variable in the Vercel project settings. Create a bot at
// https://discord.com/developers/applications, no special permissions
// or server membership needed for this specific lookup.
export default async function handler(req, res) {
  const id = req.query.id;
  if (!id || !/^\d{5,25}$/.test(id)) {
    res.status(400).json({ error: 'invalid id' });
    return;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'server not configured' });
    return;
  }

  try {
    const discordRes = await fetch(`https://discord.com/api/v10/users/${id}`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!discordRes.ok) {
      res.status(discordRes.status).json({ error: 'discord lookup failed' });
      return;
    }

    const data = await discordRes.json();
    const avatar = data.avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${data.avatar}.${data.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : null;

    // Cached for a day at the CDN edge -- this data changes rarely and
    // there's no reason to hit Discord's API fresh on every single page
    // load from every visitor.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      username: data.username || null,
      display_name: data.global_name || null,
      avatar,
    });
  } catch (err) {
    res.status(502).json({ error: 'upstream error' });
  }
}
