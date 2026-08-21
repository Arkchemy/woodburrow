/* Shared site JS: inject a consistent navbar and fetch GitHub repos for Arkchemy */
(function(){
  const navbarHTML = `
  <nav class="site-navbar">
    <div class="nav-inner">
      <a class="brand" href="/">Arkchemy</a>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/projects.html">Projects</a></li>
        <li><a href="/about.html">About</a></li>
        <li><a href="/contributors.html">Contributors</a></li>
        <li><a href="/license.html">License</a></li>
        <li><a href="#" id="repos-toggle">Repos</a></li>
      </ul>
    </div>
  </nav>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    injectNavbar();

    // If on the root page, open repos panel automatically
    if (location.pathname === '/' || location.pathname.endsWith('/index.html')) {
      const container = document.getElementById('github-repos');
      if (container) container.classList.add('open');
      if (container && !container.dataset.loaded) { fetchRepos(); container.dataset.loaded = '1'; }
    }

    // If on the license page, fetch and render the LICENSE file
    if (location.pathname.endsWith('/license.html') || location.pathname.endsWith('/license')){
      if (!document.getElementById('license-content')) return;
      fetchLicense();
    }

    // If on the contributors page, fetch and render CONTRIBUTORS.csv
    if (document.getElementById('contributors-list')) {
      fetchContributors();
    }
  });

  function injectNavbar(){
    const wrapper = document.createElement('div');
    wrapper.innerHTML = navbarHTML.trim();
    const navNode = wrapper.firstChild;

    const existing = document.querySelectorAll('nav, .site-navbar');
    if (existing.length) {
      existing.forEach(e => e.replaceWith(navNode.cloneNode(true)));
    } else {
      document.body.prepend(navNode);
    }

    const toggle = document.getElementById('repos-toggle');
    if (toggle) toggle.addEventListener('click', (ev) => { ev.preventDefault(); toggleRepos(); });
  }

  async function fetchRepos(user = 'Arkchemy'){
    const container = document.getElementById('github-repos');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading repositories…</div>';
    try {
      const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=updated`);
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const data = await res.json();
      renderRepos(data, container);
    } catch (err) {
      container.innerHTML = `<div class="error">Could not load repos: ${err.message}</div>`;
    }
  }

  // Fetch raw LICENSE text from the woodburrow repo and render it
  async function fetchLicense(){
    const container = document.getElementById('license-content');
    if (!container) return;
    container.textContent = 'Loading license…';
    const url = 'https://raw.githubusercontent.com/Arkchemy/woodburrow/refs/heads/main/LICENSE';
    try{
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const text = await res.text();
      // Use textContent to preserve formatting exactly
      container.textContent = text;
    }catch(err){
      container.textContent = 'Could not load license: ' + err.message;
    }
  }

  // Fetch and render CONTRIBUTORS.csv from the woodburrow repo -- same
  // "pull real data from GitHub, don't hardcode it" approach as
  // fetchRepos/fetchLicense above. No Discord avatar/display-name
  // lookups yet: Discord has no public, unauthenticated API for
  // looking up an arbitrary user's profile from client-side JS (that
  // needs a bot token behind a real server), so this just renders
  // name/role/contact straight from the CSV for now.
  async function fetchContributors(){
    const container = document.getElementById('contributors-list');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading contributors…</div>';
    const url = 'https://raw.githubusercontent.com/Arkchemy/woodburrow/refs/heads/main/CONTRIBUTORS.csv';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const text = await res.text();
      renderContributors(parseCsv(text), container);
    } catch (err) {
      container.innerHTML = `<div class="error">Could not load contributors: ${err.message}</div>`;
    }
  }

  // Minimal CSV parser: handles quoted fields (contributor names contain
  // parenthesized nicknames but no embedded commas/quotes today, so this
  // doesn't need to be more than "good enough" -- still handles a quoted
  // field defensively in case a future entry needs one).
  function parseCsv(text){
    const lines = text.trim().split(/\r?\n/);
    const header = splitCsvLine(lines[0]);
    return lines.slice(1).map(line => {
      const cells = splitCsvLine(line);
      const row = {};
      header.forEach((key, i) => { row[key.trim()] = (cells[i] || '').trim(); });
      return row;
    });
  }

  function splitCsvLine(line){
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++){
      const c = line[i];
      if (c === '"') { inQuotes = !inQuotes; continue; }
      if (c === ',' && !inQuotes) { cells.push(cur); cur = ''; continue; }
      cur += c;
    }
    cells.push(cur);
    return cells;
  }

  // GitHub's own avatar-by-username endpoint (github.com/{user}.png) is
  // real and genuinely public, no auth needed -- unlike Discord, which
  // has no equivalent unauthenticated lookup (see fetchContributors'
  // own comment). So a contributor with a known GitHub gets a real
  // photo; a Discord-only contributor gets an initial instead.
  function githubUsernameFromUrl(url){
    if (!url || url === 'n/a') return null;
    const m = url.match(/github\.com\/([^\/?#]+)/i);
    return m ? m[1] : null;
  }

  function renderContributors(rows, container){
    if (!rows.length){
      container.innerHTML = '<div class="empty">No contributors listed.</div>';
      return;
    }
    const items = rows.map(r => {
      const contact = r.contact && r.contact !== 'n/a' ? `<div class="meta">${escapeHtml(r.contact)}</div>` : '';
      const hasDiscord = r.discord_id && r.discord_id !== 'n/a';
      const ghUser = githubUsernameFromUrl(r.github_url);
      const initial = (r.name || '?').replace(/[("].*$/, '').trim().charAt(0).toUpperCase() || '?';
      const avatar = ghUser
        ? `<img class="contributor-avatar" src="https://github.com/${encodeURIComponent(ghUser)}.png" alt="" loading="lazy">`
        : `<div class="contributor-avatar contributor-avatar-fallback">${escapeHtml(initial)}</div>`;
      const links = [
        hasDiscord ? `<a class="contributor-link" href="https://discord.com/users/${encodeURIComponent(r.discord_id)}" target="_blank" rel="noopener noreferrer">Discord</a>` : '',
        ghUser ? `<a class="contributor-link" href="${escapeHtml(r.github_url)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''
      ].filter(Boolean).join(' ');
      return `<article class="project-card contributor-card">${avatar}<div class="contributor-info"><h3>${escapeHtml(r.name || 'Unknown')}</h3><p>${escapeHtml(r.role || '')}</p>${contact}<div class="contributor-links">${links}</div></div></article>`;
    }).join('');
    container.innerHTML = items;
  }

  function renderRepos(repos, container){
    if (!Array.isArray(repos) || repos.length === 0){
      container.innerHTML = '<div class="empty">No repositories found.</div>';
      return;
    }

    const items = repos.slice(0, 30).map(r => {
      const desc = r.description ? `<div class="desc">${escapeHtml(r.description)}</div>` : '';
      const lang = r.language ? `<span class="lang">${r.language}</span>` : '';
      return `<li class="repo"><a href="${r.html_url}" target="_blank" rel="noopener noreferrer">${r.name}</a>${desc}<div class="meta">⭐ ${r.stargazers_count} ${lang}</div></li>`;
    }).join('');

    container.innerHTML = `<ul class="repo-list">${items}</ul>`;
  }

  function toggleRepos(){
    const container = document.getElementById('github-repos');
    if (!container) return;
    const open = container.classList.toggle('open');
    if (open && !container.dataset.loaded){ fetchRepos(); container.dataset.loaded = '1'; }
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

})();
