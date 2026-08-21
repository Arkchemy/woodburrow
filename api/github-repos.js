// Vercel serverless function: proxies the Arkchemy org's public repo
// listing from api.github.com, same reasoning as github-user.js -- the
// browser only ever talks to this origin, and every visitor's page load
// shares one 5-minute edge-cached lookup instead of each browser
// spending its own share of GitHub's unauthenticated rate limit.
export default async function handler(req, res) {
  const user = /^[A-Za-z0-9-]{1,39}$/.test(req.query.user || '') ? req.query.user : 'Arkchemy';

  try {
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=updated`, {
      headers: { 'User-Agent': 'arkchemy-woodburrow' },
    });

    if (!ghRes.ok) {
      res.status(ghRes.status).json({ error: 'github lookup failed' });
      return;
    }

    const data = await ghRes.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json(Array.isArray(data)
      ? data.map(r => ({
          name: r.name,
          html_url: r.html_url,
          description: r.description,
          language: r.language,
          stargazers_count: r.stargazers_count,
        }))
      : []);
  } catch (err) {
    res.status(502).json({ error: 'upstream error' });
  }
}
