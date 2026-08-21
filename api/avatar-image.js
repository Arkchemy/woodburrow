// Vercel serverless function: fetches an avatar image server-side and
// streams the bytes back through this same origin. Used for both GitHub
// (avatars.githubusercontent.com / github.com/{u}.png) and Discord
// (cdn.discordapp.com) avatars so the visitor's browser never makes a
// direct request to either third party -- it only ever talks to
// arkchemy.vercel.app, for the JSON lookups (see github-user.js and
// discord-avatar.js) and now the images too.
//
// Only a fixed allowlist of real avatar-hosting domains is fetchable
// here -- this is a public route with no auth, so without the allowlist
// it'd be an open image-fetching proxy for literally any URL (a real
// SSRF risk), not just a narrow avatar helper.
const ALLOWED_HOSTS = new Set([
  'avatars.githubusercontent.com',
  'github.com',
  'cdn.discordapp.com',
]);

export default async function handler(req, res) {
  const src = req.query.src;
  if (!src) {
    res.status(400).json({ error: 'missing src' });
    return;
  }

  let url;
  try {
    url = new URL(src);
  } catch (err) {
    res.status(400).json({ error: 'invalid src' });
    return;
  }

  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    res.status(400).json({ error: 'host not allowed' });
    return;
  }

  try {
    const upstream = await fetch(url.toString());
    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
    // Same 5-minute edge cache as the JSON lookups -- there's only a
    // handful of distinct avatar URLs in play (one per contributor), so
    // this keeps real upstream traffic low without serving a stale
    // image for long if someone updates their profile picture.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).send(buf);
  } catch (err) {
    res.status(502).end();
  }
}
