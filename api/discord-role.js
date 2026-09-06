// Vercel serverless function: lists the members of one Arkchemy Discord role
// through Discord's own Bot API, for the site's Testers section.
//
//   testers  1545207979190788126
//   (guild   1536813901491216414)
//
// Only named roles are resolvable -- the id is never taken from the query
// string. A route that accepted any role id would let anyone with the URL
// enumerate the membership of any role in any guild this bot is in.
//
// Requires DISCORD_BOT_TOKEN, the bot in the guild, and the privileged
// SERVER MEMBERS INTENT enabled on the application. GET /guilds/{id}/members
// is gated behind that intent and returns 403 without it -- which this
// surfaces rather than reporting as an empty role.
//
// Avatar URLs are returned pointing at /api/avatar-image so the browser never
// talks to cdn.discordapp.com directly; the page's CSP is img-src 'self'.

const ROLES = { testers: '1545207979190788126' };
const GUILD = '1536813901491216414';

export default async function handler(req, res) {
  const which = String(req.query.role || 'testers');
  const roleId = ROLES[which];
  if (!roleId) {
    res.status(400).json({ error: 'unknown role' });
    return;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'server not configured' });
    return;
  }

  try {
    // Page through the member list; 1000 is the API maximum per request.
    let members = [];
    let after = '0';
    for (let page = 0; page < 5; page++) {
      const url = new URL(`https://discord.com/api/v10/guilds/${GUILD}/members`);
      url.searchParams.set('limit', '1000');
      url.searchParams.set('after', after);

      const r = await fetch(url, { headers: { Authorization: `Bot ${token}` } });
      if (!r.ok) {
        if (page === 0) {
          res.status(502).json({
            error: 'discord',
            status: r.status,
            // 403 here is almost always the privileged intent, not permissions.
            hint: r.status === 403
              ? 'enable SERVER MEMBERS INTENT on the bot application'
              : undefined,
          });
          return;
        }
        break;
      }

      const batch = await r.json();
      if (!batch.length) break;
      members = members.concat(batch);
      after = batch[batch.length - 1].user.id;
      if (batch.length < 1000) break;
    }

    const testers = members
      .filter(m => m.roles && m.roles.includes(roleId))
      .map(m => ({
        id: m.user.id,
        name: m.nick || m.user.global_name || m.user.username,
        // Proxied, not a direct CDN link: the page's CSP is img-src 'self'.
        avatar: m.user.avatar
          ? '/api/avatar-image?src=' + encodeURIComponent(
              `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=128`)
          : null,
        joined: m.joined_at || null,
        bot: !!m.user.bot,
      }))
      .filter(t => !t.bot)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.status(200).json({
      role: which, guild: GUILD,
      scanned: members.length,
      count: testers.length,
      members: testers,
    });
  } catch (e) {
    res.status(502).json({ error: 'fetch failed' });
  }
}
