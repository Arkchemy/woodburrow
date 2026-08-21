// Vercel serverless function: looks up a GitHub user's real display name
// and avatar server-side, same reasoning as discord-avatar.js -- the
// visitor's browser talks only to this same-origin route, never
// directly to api.github.com. That matters for two real reasons: it
// keeps a visitor's own IP off GitHub's request logs for a page they
// didn't ask to talk to GitHub, and it moves everyone's combined
// traffic onto ONE shared, edge-cached lookup per username instead of
// each visitor's browser burning its own share of GitHub's
// unauthenticated 60-requests-per-hour-per-IP limit (which is what
// produced real 403s during testing with several page reloads in a
// short window).
//
// avatar_url comes back already rewritten to /api/avatar-image, so the
// client never touches githubusercontent.com directly either.
export default async function handler(req, res) {
  const username = req.query.username;
  if (!username || !/^[A-Za-z0-9-]{1,39}$/.test(username)) {
    res.status(400).json({ error: 'invalid username' });
    return;
  }

  try {
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'arkchemy-woodburrow' },
    });

    if (!ghRes.ok) {
      res.status(ghRes.status).json({ error: 'github lookup failed' });
      return;
    }

    const data = await ghRes.json();

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json({
      login: data.login || username,
      name: data.name || null,
      avatar_url: data.avatar_url
        ? `/api/avatar-image?src=${encodeURIComponent(data.avatar_url)}`
        : null,
    });
  } catch (err) {
    res.status(502).json({ error: 'upstream error' });
  }
}
