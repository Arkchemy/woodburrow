// Vercel serverless function: reads recent messages from one Arkchemy Discord
// channel through Discord's own Bot API (GET /channels/{id}/messages).
//
// Two channels are allowed and nothing else -- the id is never taken from the
// query string. An open proxy that forwarded any channel id would let anyone
// with the URL read any channel this bot can see.
//
//   faq       1540514996704780380
//   progress  1542245342190374975
//   (server   1536813901491216414)
//
// Needs DISCORD_BOT_TOKEN in the Vercel project settings, and the bot must be
// in the server with "View Channel" + "Read Message History" on both channels.
// The token stays server-side; the browser only ever talks to this route.

const CHANNELS = {
  faq:      '1540514996704780380',
  progress: '1542245342190374975',
};
const GUILD = '1536813901491216414';

export default async function handler(req, res) {
  const which = String(req.query.channel || '');
  const id = CHANNELS[which];
  if (!id) {
    res.status(400).json({ error: 'unknown channel' });
    return;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'server not configured' });
    return;
  }

  const limit = which === 'faq' ? 50 : 20;

  try {
    const r = await fetch(
      `https://discord.com/api/v10/channels/${id}/messages?limit=${limit}`,
      { headers: { Authorization: `Bot ${token}` } }
    );

    if (!r.ok) {
      // Surface Discord's own status so a permissions problem is diagnosable
      // rather than looking like an empty channel.
      res.status(502).json({ error: 'discord', status: r.status });
      return;
    }

    const raw = await r.json();

    const messages = raw
      .filter(m => (m.content && m.content.trim()) || (m.embeds && m.embeds.length))
      .map(m => ({
        id: m.id,
        content: m.content || (m.embeds[0] && (m.embeds[0].description || m.embeds[0].title)) || '',
        timestamp: m.timestamp,
        edited: m.edited_timestamp || null,
        pinned: !!m.pinned,
        author: {
          name: (m.member && m.member.nick) || m.author.global_name || m.author.username,
          id: m.author.id,
          avatar: m.author.avatar
            ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64`
            : null,
          bot: !!m.author.bot,
        },
        attachments: (m.attachments || [])
          .filter(a => a.content_type && a.content_type.startsWith('image/'))
          .map(a => ({ url: a.url, width: a.width, height: a.height })),
      }))
      // Discord returns newest first; the FAQ reads better oldest-first.
      .reverse();

    // Cached at the edge so the page is live without hammering Discord: served
    // instantly, revalidated in the background.
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.status(200).json({ channel: which, guild: GUILD, count: messages.length, messages });
  } catch (e) {
    res.status(502).json({ error: 'fetch failed' });
  }
}
