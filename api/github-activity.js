// Vercel serverless function: a merged recent-commit feed across the
// Arkchemy org's repositories.
//
// Same reasoning as github-repos.js and github-user.js -- the browser only
// ever talks to this origin, and every visitor shares one edge-cached lookup
// instead of each one spending its own slice of GitHub's unauthenticated
// rate limit. Doing the merge here also means the page makes a single
// request rather than one per repository.
//
// Only public data, no auth, and the repo list is fetched rather than
// hardcoded so a new repo appears without a code change.
export default async function handler(req, res) {
  const org = /^[A-Za-z0-9-]{1,39}$/.test(req.query.user || '') ? req.query.user : 'Arkchemy';
  const want = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 30);
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'arkchemy-site' };

  try {
    const repoRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(org)}/repos?per_page=100&sort=pushed`,
      { headers });
    if (!repoRes.ok) throw new Error('repos: HTTP ' + repoRes.status);
    const repos = await repoRes.json();
    if (!Array.isArray(repos)) throw new Error('unexpected repo payload');

    // Only the handful most recently pushed to; the rest cannot contribute
    // anything recent enough to survive the sort below.
    const recent = repos.filter(r => !r.fork).slice(0, 6);

    const perRepo = await Promise.all(recent.map(async (r) => {
      try {
        const c = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(org)}/${encodeURIComponent(r.name)}/commits?per_page=10`,
          { headers });
        if (!c.ok) return [];
        const list = await c.json();
        if (!Array.isArray(list)) return [];
        return list.map(x => ({
          repo: r.name,
          sha: (x.sha || '').slice(0, 7),
          url: x.html_url,
          date: x.commit && x.commit.author ? x.commit.author.date : null,
          // first line only: commit bodies here are long by design
          message: ((x.commit && x.commit.message) || '').split('\n')[0].slice(0, 140),
          author: (x.author && x.author.login) || (x.commit && x.commit.author && x.commit.author.name) || ''
        }));
      } catch { return []; }
    }));

    const commits = perRepo.flat()
      .filter(c => c.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, want);

    const totals = {
      repos: repos.filter(r => !r.fork).length,
      stars: repos.reduce((n, r) => n + (r.stargazers_count || 0), 0),
      lastPush: repos.reduce((d, r) => (r.pushed_at && r.pushed_at > d ? r.pushed_at : d), '')
    };

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ commits, totals });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
