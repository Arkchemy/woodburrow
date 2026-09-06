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

/* Everything image-shaped is handed back pointing at /api/avatar-image. The
   page's CSP is img-src 'self', so a raw cdn.discordapp.com URL renders as a
   broken image -- which is exactly what happened to the progress avatars. */
const proxy = u => '/api/avatar-image?src=' + encodeURIComponent(u);

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

  // Discord caps one request at 100, so walk backwards with ?before= to pick
  // up older posts. Capped so a long-running channel cannot turn one page load
  // into an unbounded crawl: the FAQ is a reference channel and wants all of
  // it, progress only needs recent history.
  const MAX_PAGES = which === 'faq' ? 10 : 3;   // up to 1000 / 300 messages

  let raw = [];
  let before = null;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(`https://discord.com/api/v10/channels/${id}/messages`);
      url.searchParams.set('limit', '100');
      if (before) url.searchParams.set('before', before);

      const r = await fetch(url, { headers: { Authorization: `Bot ${token}` } });

      if (r.status === 429) {
        // Rate limited. Keep whatever pages already succeeded rather than
        // failing the whole request and showing an empty channel.
        break;
      }
      if (!r.ok) {
        if (page === 0) {
          // Surface Discord's own status so a permissions problem is
          // diagnosable rather than looking like an empty channel.
          res.status(502).json({ error: 'discord', status: r.status });
          return;
        }
        break;
      }

      const batch = await r.json();
      if (!batch.length) break;
      raw = raw.concat(batch);
      before = batch[batch.length - 1].id;   // oldest in this page
      if (batch.length < 100) break;          // reached the start of the channel
    }
  } catch (e) {
    res.status(502).json({ error: 'fetch failed' });
    return;
  }

  {
    const messages = raw
      /* Keep anything with text, an embed, or an image. Without Message
         Content Intent `content` is blank but embeds and attachments still
         come through, so a screenshot-only update is still worth showing. */
      .filter(m => (m.content && m.content.trim())
                || (m.embeds && m.embeds.length)
                || (m.attachments && m.attachments.length))
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
            ? proxy(`https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64`)
            : null,
          bot: !!m.author.bot,
        },
        attachments: (m.attachments || [])
          .filter(a => a.content_type && a.content_type.startsWith('image/'))
          .map(a => ({ url: proxy(a.url), width: a.width, height: a.height })),
      }))
      // Discord returns newest first within each page, and pages walk further
      // back, so the whole set is newest-first. The FAQ reads oldest-first.
      .reverse();

    // Cached at the edge so the page is live without hammering Discord: served
    // instantly, revalidated in the background. The FAQ is cached far longer --
    // it changes rarely and now costs up to ten upstream requests to rebuild,
    // while progress is the feed people expect to be current.
    res.setHeader('Cache-Control', which === 'faq'
      ? 's-maxage=900, stale-while-revalidate=3600'
      : 's-maxage=60, stale-while-revalidate=600');
    /* Diagnostics, because "0 messages" has three very different causes and
       they are indistinguishable from the outside:
         fetched 0                  -> the channel really is empty, or the id is
                                       wrong (permissions would have 403'd above)
         fetched > 0, withText 0    -> Message Content Intent is off. Discord
                                       returns the messages but blanks `content`
                                       for guild messages unless the bot has the
                                       privileged intent enabled. This is a REST
                                       restriction too, not gateway-only.
         fetched > 0, withText > 0  -> working */
    const withText = raw.filter(m => m.content && m.content.trim()).length;
    res.status(200).json({
      channel: which, guild: GUILD, count: messages.length,
      fetched: raw.length,
      withText,
      needsMessageContentIntent: raw.length > 0 && withText === 0,
      complete: raw.length < MAX_PAGES * 100,   // false = the cap was hit
      messages,
    });
  }
}
