// Vercel serverless function: the server's current invite, from Discord's
// public widget endpoint.
//
// Not hardcoded into the pages, because the widget mints a *temporary*
// invite -- the one live when this was written expired the next day. Fetched
// per request (edge-cached) so the footer link is always one that works, and
// it keeps working if the invite is ever regenerated.
//
// Needs no bot token: the widget is public, as long as it is enabled in
// Server Settings -> Widget. If it is turned off, Discord returns 403 and the
// page simply leaves the link hidden rather than showing a dead one.

const GUILD = '1536813901491216414';

export default async function handler(req, res) {
  try {
    const r = await fetch(`https://discord.com/api/guilds/${GUILD}/widget.json`, {
      headers: { 'User-Agent': 'arkchemy-site' },
    });

    if (!r.ok) {
      // 403 means the widget is disabled; anything else is Discord being
      // Discord. Either way there is no invite to give out.
      res.setHeader('Cache-Control', 's-maxage=300');
      res.status(200).json({ invite: null, reason: r.status === 403 ? 'widget-disabled' : 'discord-' + r.status });
      return;
    }

    const d = await r.json();

    // Cached well inside the invite's lifetime. A widget invite typically
    // lasts a day, so an hour at the edge is fresh enough to never hand out
    // a dead one while still costing almost nothing.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json({
      invite: d.instant_invite || null,
      name: d.name || null,
      online: typeof d.presence_count === 'number' ? d.presence_count : null,
    });
  } catch {
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({ invite: null, reason: 'fetch-failed' });
  }
}
