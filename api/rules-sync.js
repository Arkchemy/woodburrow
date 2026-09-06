// Keeps #rules in sync with discord/rules.json.
//
// The rules live in git and this reconciles the channel to them, which means
// the deployed site is the only thing that ever needs the bot token --
// DISCORD_BOT_TOKEN is a Vercel "Secret", so its value cannot be read back
// by anyone and can only be used from inside a function like this one.
//
// It never deletes anything. Messages the bot already posted are edited in
// place (PATCH), which is what "replacing the rules" actually needs; missing
// ones are posted. If rules.json ever has *fewer* messages than the channel,
// the surplus is reported rather than removed -- deleting Discord messages is
// irreversible and is a decision for a person, not a cron job.
//
// Messages posted by anyone other than the bot are left alone entirely. The
// bot cannot edit them even if it wanted to; Discord only allows an author to
// edit their own.

import rules from '../discord/rules.json' with { type: 'json' };

const GUILD = '1536813901491216414';
const API = 'https://discord.com/api/v10';
const CHANNEL_NAME = 'rules';

const bot = (path, init) =>
  fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'arkchemy-rules-sync (https://github.com/Arkchemy, 1.0)',
      ...(init && init.headers),
    },
  });

// Discord echoes embeds back with fields we never set (type, and a colour it
// has normalised), so compare only what rules.json actually declares.
const shape = e => JSON.stringify({
  title: e.title || null,
  description: e.description || null,
  color: typeof e.color === 'number' ? e.color : null,
  fields: (e.fields || []).map(f => [f.name, f.value, !!f.inline]),
  footer: (e.footer && e.footer.text) || null,
});

const same = (a, b) =>
  a.length === b.length && a.every((e, i) => shape(e) === shape(b[i]));

export default async function handler(req, res) {
  // Safe by default: with no CRON_SECRET set the route does nothing at all,
  // so it cannot be poked by anyone who finds the URL before it is configured.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({
      error: 'not configured',
      hint: 'Set CRON_SECRET in the Vercel project to enable this route. ' +
            'Vercel sends it as a bearer token on cron invocations.',
    });
    return;
  }
  const auth = req.headers.authorization || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query.key || '');
  if (given !== secret) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }
  if (!process.env.DISCORD_BOT_TOKEN) {
    res.status(500).json({ error: 'DISCORD_BOT_TOKEN missing from this environment' });
    return;
  }

  const dry = req.query.dry === '1';
  const out = { dry, channel: CHANNEL_NAME, edited: [], posted: [], unchanged: [], notes: [] };

  try {
    const me = await bot('/users/@me');
    if (!me.ok) { res.status(502).json({ error: 'discord /users/@me', status: me.status }); return; }
    const botId = (await me.json()).id;

    const cr = await bot(`/guilds/${GUILD}/channels`);
    if (!cr.ok) { res.status(502).json({ error: 'discord channels', status: cr.status }); return; }
    const chan = (await cr.json()).find(c => c.name === CHANNEL_NAME && (c.type === 0 || c.type === 5));
    if (!chan) { res.status(404).json({ error: `no text channel named #${CHANNEL_NAME}` }); return; }

    // Newest first from Discord; oldest first is the order they were posted in.
    const mr = await bot(`/channels/${chan.id}/messages?limit=50`);
    if (!mr.ok) { res.status(502).json({ error: 'discord messages', status: mr.status }); return; }
    const all = (await mr.json()).reverse();

    const mine = all.filter(m => m.author && m.author.id === botId);
    const theirs = all.length - mine.length;
    if (theirs) {
      out.notes.push(`${theirs} message${theirs === 1 ? '' : 's'} in #${CHANNEL_NAME} ` +
                     'from someone other than the bot; left untouched, and only a person can remove them.');
    }

    for (let i = 0; i < rules.messages.length; i++) {
      const want = rules.messages[i];
      const title = want.embeds[0].title;
      const have = mine[i];

      if (!have) {
        if (!dry) {
          const r = await bot(`/channels/${chan.id}/messages`, { method: 'POST', body: JSON.stringify(want) });
          if (!r.ok) { out.notes.push({ title, failed: 'post', status: r.status, body: (await r.text()).slice(0, 300) }); break; }
          out.posted.push({ title, id: (await r.json()).id });
          await new Promise(s => setTimeout(s, 1100));
        } else out.posted.push({ title, id: null });
        continue;
      }

      if (same(have.embeds || [], want.embeds)) { out.unchanged.push(title); continue; }

      if (!dry) {
        const r = await bot(`/channels/${chan.id}/messages/${have.id}`, { method: 'PATCH', body: JSON.stringify(want) });
        if (!r.ok) { out.notes.push({ title, failed: 'edit', status: r.status, body: (await r.text()).slice(0, 300) }); break; }
        await new Promise(s => setTimeout(s, 1100));
      }
      out.edited.push({ title, id: have.id });
    }

    if (mine.length > rules.messages.length) {
      const extra = mine.length - rules.messages.length;
      out.notes.push(`${extra} bot message${extra === 1 ? '' : 's'} beyond what rules.json defines. ` +
                     'Not removed -- delete by hand if they are no longer wanted.');
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: String(e), out });
  }
}
