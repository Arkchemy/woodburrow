// Vercel serverless function: serves the canonical LICENSE straight from the
// GitHub repository, so the site cannot drift from the licence the code
// actually ships under.
//
// Fetched server-side and cached at the edge rather than fetched by the
// browser: the page's CSP does allow raw.githubusercontent.com in connect-src,
// but going through here means one cached hit instead of one per visitor, and
// it keeps working if that CSP is ever tightened.

const REPOS = ['conquertron', 'jouster', 'woodburrow', 'blaster', 'armory'];
// 'legal' serves LEGAL.md instead of LICENSE, from the same place, so the
// privacy notice on the site cannot drift from the one in the repository.
const DOCS = { legal: ['woodburrow', 'LEGAL.md'] };

export default async function handler(req, res) {
  const repo = String(req.query.repo || 'woodburrow');
  const doc = DOCS[repo];
  if (!doc && !REPOS.includes(repo)) {
    res.status(400).json({ error: 'unknown repo' });
    return;
  }
  const [ghRepo, file] = doc || [repo, 'LICENSE'];

  try {
    const r = await fetch(
      `https://raw.githubusercontent.com/Arkchemy/${ghRepo}/main/${file}`,
      { headers: { 'User-Agent': 'arkchemy-site' } }
    );
    if (!r.ok) {
      res.status(502).json({ error: 'github', status: r.status });
      return;
    }
    const text = await r.text();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ repo, text });
  } catch (e) {
    res.status(502).json({ error: 'fetch failed' });
  }
}
