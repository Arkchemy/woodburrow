// Vercel serverless function: the site as an Atom feed, served at /feed.xml
// (see the rewrite in vercel.json).
//
// Two kinds of entry, newest first:
//   * every finding in findings.json, linked to its card on /findings
//   * the recent posts in the Discord progress channel, linked to /progress
//
// So anyone can follow the project without Discord, in any feed reader, and
// any "draft once, post everywhere" tool that takes a feed (a self-hosted
// scheduler, n8n, a feed-to-Bluesky bridge) can fan each update out on its
// own. This route posts nothing anywhere itself.
//
// Both sources are read from the live site rather than re-implemented here:
// findings.json is a static file, and the Discord posts come through
// /api/discord-channel, which holds the bot token and the channel allowlist.
// The origin is fixed, never taken from the request's Host header -- a feed
// that fetched from whatever host it was asked on would fetch from anywhere.

const SITE = 'https://arkchemy.vercel.app';
const MAX_POSTS = 30;

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  // XML 1.0 forbids most control characters; one in a Discord message would
  // make the whole feed unparseable
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const iso = d => {
  const t = new Date(d.length === 10 ? d + 'T12:00:00Z' : d);
  return isNaN(t) ? null : t.toISOString();
};

// A title for a Discord post: its first line, without markdown markers,
// shortened at a word boundary
function titleOf(text) {
  const line = String(text).split('\n').map(l => l.trim()).find(Boolean) || 'Progress update';
  const plain = line.replace(/<a?:(\w+):\d+>/g, ':$1:').replace(/[*_`~>#|]+/g, '').trim() || 'Progress update';
  if (plain.length <= 90) return plain;
  const cut = plain.slice(0, 90);
  return cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : 90) + '…';
}

async function getJSON(path) {
  const r = await fetch(SITE + path, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}

export default async function handler(req, res) {
  const entries = [];

  const [findings, progress] = await Promise.allSettled([
    getJSON('/findings.json'),
    getJSON('/api/discord-channel?channel=progress'),
  ]);

  if (findings.status === 'fulfilled') {
    // Most findings carry no date of their own; those take the file's
    // generated_at, the date they were last published as they stand
    const asOf = findings.value.generated_at && iso(findings.value.generated_at);
    for (const f of findings.value.findings || []) {
      const when = (f.date && iso(f.date)) || asOf;
      if (!when || !f.title) continue;
      const id = f.id || f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      entries.push({
        id: `${SITE}/findings#f-${id}`,
        link: `${SITE}/findings#f-${encodeURIComponent(id)}`,
        title: 'Finding: ' + f.title,
        updated: when,
        category: f.area || 'finding',
        summary: f.detail || '',
      });
    }
  }

  if (progress.status === 'fulfilled') {
    const posts = (progress.value.messages || []).slice().reverse().slice(0, MAX_POSTS);
    for (const m of posts) {
      const when = m.timestamp && iso(m.timestamp);
      if (!when || !m.content) continue;
      entries.push({
        id: `${SITE}/progress#${m.id}`,
        link: `${SITE}/progress`,
        title: titleOf(m.content),
        updated: (m.edited && iso(m.edited)) || when,
        published: when,
        category: 'progress',
        summary: m.content,
        author: m.author && m.author.name,
      });
    }
  }

  if (!entries.length) {
    // Both sources down: say so rather than serve an empty, valid-looking
    // feed that a reader would cache as "nothing new"
    res.status(503).setHeader('Retry-After', '300').send('feed sources unavailable');
    return;
  }

  entries.sort((a, b) => (a.updated < b.updated ? 1 : -1));
  const updated = entries[0].updated;

  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    '  <title>Arkchemy</title>',
    '  <subtitle>Porting Skylanders: Spyro\'s Adventure to the Nintendo Switch: findings and the build log.</subtitle>',
    `  <id>${SITE}/</id>`,
    `  <link rel="self" type="application/atom+xml" href="${SITE}/feed.xml"/>`,
    `  <link rel="alternate" type="text/html" href="${SITE}/"/>`,
    `  <updated>${updated}</updated>`,
    '  <author><name>Arkchemy</name></author>',
    `  <icon>${SITE}/images/logo/arkchemy-icon-256.png</icon>`,
    ...entries.map(e => [
      '  <entry>',
      `    <id>${esc(e.id)}</id>`,
      `    <title>${esc(e.title)}</title>`,
      `    <link rel="alternate" type="text/html" href="${esc(e.link)}"/>`,
      `    <updated>${e.updated}</updated>`,
      e.published ? `    <published>${e.published}</published>` : null,
      e.author ? `    <author><name>${esc(e.author)}</name></author>` : null,
      `    <category term="${esc(e.category)}"/>`,
      `    <summary type="text">${esc(e.summary)}</summary>`,
      '  </entry>',
    ].filter(Boolean).join('\n')),
    '</feed>',
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(xml);
}
