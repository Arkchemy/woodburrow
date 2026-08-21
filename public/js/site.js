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
        <li><button type="button" class="theme-toggle" id="theme-toggle" aria-label="Toggle dark/light theme">🌓</button></li>
      </ul>
    </div>
  </nav>
  `;

  // Was previously only hardcoded into index.html -- injected on every
  // page now (same pattern as the navbar) so the Skylanders Wiki credit
  // for the element symbols and Portal of Power artwork appears
  // everywhere those assets are actually used, not just the homepage.
  const footerHTML = `
  <footer class="site-footer">
    <div class="container">
      <div>© Arkchemy — content from public GitHub data.</div>
      <div class="credits">Elemental symbols and Portal of Power artwork courtesy of the <a href="https://skylanderswiki.com" target="_blank" rel="noopener noreferrer">Skylanders Wiki</a> (CC BY-SA).</div>
    </div>
  </footer>
  `;

  // Real brand mark SVGs (Simple Icons' standard single-path versions,
  // the same shapes GitHub/Discord's own brand kits use), inlined
  // rather than fetched from an icon site so there's no extra network
  // dependency or rendering delay. currentColor fill so each inherits
  // the link's own text color, light or dark theme alike.
  const ICON_GITHUB = '<svg class="contributor-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>';
  const ICON_DISCORD = '<svg class="contributor-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>';

  // Real Skylanders element symbols -- these are the actual in-game
  // icons, originally sourced from the Skylanders Wiki's own asset CDN
  // (static.wikia.nocookie.net) but downloaded and self-hosted under
  // /images/elements/ rather than hotlinked: the wiki's CDN isn't
  // reliably reachable from every visitor's network, which was
  // producing real broken-image icons. Self-hosting means this site
  // never depends on a third party being up.
  const ELEMENT_INFO = {
    air: { label: 'Air', color: '#5bc8e8', img: 'air.webp' },
    dark: { label: 'Dark', color: '#4a3768', img: 'dark.webp' },
    earth: { label: 'Earth', color: '#c97a34', img: 'earth.webp' },
    fire: { label: 'Fire', color: '#e8531f', img: 'fire.webp' },
    kaos: { label: 'Kaos', color: '#a349a4', img: 'kaos.webp' },
    life: { label: 'Life', color: '#4caf50', img: 'life.webp' },
    light: { label: 'Light', color: '#f0c419', img: 'light.webp' },
    magic: { label: 'Magic', color: '#9c4dcc', img: 'magic.webp' },
    tech: { label: 'Tech', color: '#e8b923', img: 'tech.webp' },
    undead: { label: 'Undead', color: '#6a4c93', img: 'undead.webp' },
    water: { label: 'Water', color: '#2196f3', img: 'water.webp' },
  };

  function elementInfoFor(name){
    if (!name) return null;
    const key = name.trim().toLowerCase();
    return ELEMENT_INFO[key] || null;
  }

  function elementImageUrl(path){
    return `/images/elements/${path}`;
  }

  const THEME_KEY = 'arkchemy-theme';

  function applyStoredTheme(){
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  }

  function toggleTheme(){
    const current = document.documentElement.getAttribute('data-theme')
      || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  }

  // Applied immediately (not waiting for DOMContentLoaded) so the page
  // doesn't flash the wrong theme for a frame before this script runs.
  applyStoredTheme();

  document.addEventListener('DOMContentLoaded', () => {
    injectNavbar();
    injectFooter();

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

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  }

  function injectFooter(){
    const existing = document.querySelector('footer.site-footer');
    if (existing) existing.remove();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = footerHTML.trim();
    document.body.appendChild(wrapper.firstChild);
  }

  async function fetchRepos(user = 'Arkchemy'){
    const container = document.getElementById('github-repos');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading repositories…</div>';
    try {
      const res = await fetch(`/api/github-repos?user=${encodeURIComponent(user)}`);
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const data = await res.json();
      renderRepos(data, container);
    } catch (err) {
      container.innerHTML = `<div class="error">Could not load repos: ${err.message}</div>`;
    }
  }

  // raw.githubusercontent.com sits behind a real CDN that caches by
  // URL for several minutes regardless of the page's own fetch cache
  // mode -- confirmed directly (fetched the same file via the GitHub
  // API right after a push and got different, newer content than what
  // the raw URL was still serving). A cache-busting query param makes
  // every page load a genuinely new URL, so visitors always see
  // current data instead of whatever was cached at the last CDN pull.
  function cacheBusted(url){
    return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
  }

  // Fetch raw LICENSE text from the woodburrow repo and render it
  async function fetchLicense(){
    const container = document.getElementById('license-content');
    if (!container) return;
    container.textContent = 'Loading license…';
    const url = cacheBusted('https://raw.githubusercontent.com/Arkchemy/woodburrow/refs/heads/main/LICENSE');
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
    const url = cacheBusted('https://raw.githubusercontent.com/Arkchemy/woodburrow/refs/heads/main/CONTRIBUTORS.csv');
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
    const items = rows.map((r, i) => {
      const hasDiscord = r.discord_id && r.discord_id !== 'n/a';
      const ghUser = githubUsernameFromUrl(r.github_url);
      const initial = (r.name || '?').replace(/[("].*$/, '').trim().charAt(0).toUpperCase() || '?';
      const avatarId = `contributor-avatar-${i}`;
      const ghLinkId = `contributor-gh-link-${i}`;
      const dcLinkId = `contributor-dc-link-${i}`;
      const elem = elementInfoFor(r.element);
      // Placeholder avatar until the real fetches below resolve --
      // GitHub's own avatar-by-username shortcut (github.com/{u}.png)
      // is used as an immediate first paint (real, public, no fetch
      // needed), routed through /api/avatar-image so the browser still
      // never talks to github.com directly, then swapped for the
      // /api/github-user response's own avatar_url once that real
      // lookup completes, so a slow/failed JSON fetch never leaves a
      // contributor with no image at all.
      const avatar = ghUser
        ? `<img class="contributor-avatar" id="${avatarId}" src="/api/avatar-image?src=${encodeURIComponent('https://github.com/' + ghUser + '.png')}" alt="" loading="lazy">`
        : `<div class="contributor-avatar contributor-avatar-fallback" id="${avatarId}">${escapeHtml(initial)}</div>`;
      // Styled after the real in-game HUD's health/mana bar (icon set
      // into the bar's left end) rather than a corner badge on the
      // portrait -- see contributor-element-bar's own CSS comment.
      const elementBar = elem
        ? `<div class="contributor-element-bar" title="${escapeHtml(elem.label)} element"><span class="contributor-element-icon-wrap"><img class="contributor-element-icon" src="${elementImageUrl(elem.img)}" alt="${escapeHtml(elem.label)} element" loading="lazy"></span><span class="contributor-element-fill"></span></div>`
        : '';
      // GitHub first, Discord second -- GitHub is the priority source
      // (real display name + real photo, no proxy/serverless function
      // needed) whenever a contributor has one. The real fetched
      // display name lands on the link's title attribute (a hover
      // tooltip) once fillGithubInfo/fillDiscordInfo resolve, rather
      // than as its own separate visible line -- the card's own name
      // (styled as its "Skylander name") is already the primary label,
      // and stacking "GitHub: Real Name" under it again just repeated
      // what the link itself already represents.
      const links = [
        ghUser ? `<a class="contributor-link" id="${ghLinkId}" href="${escapeHtml(r.github_url)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub">${ICON_GITHUB}GitHub</a>` : '',
        hasDiscord ? `<a class="contributor-link" id="${dcLinkId}" href="https://discord.com/users/${encodeURIComponent(r.discord_id)}" target="_blank" rel="noopener noreferrer" aria-label="Discord">${ICON_DISCORD}Discord</a>` : ''
      ].filter(Boolean).join(' ');
      const style = elem ? ` style="--elem-color:${elem.color}"` : '';
      return `<article class="project-card contributor-card"${style}><div class="contributor-card-inner"><div class="contributor-avatar-wrap">${avatar}</div><div class="contributor-info"><h3 class="contributor-name">${escapeHtml(r.name || 'Unknown')}</h3>${elementBar}<p>${escapeHtml(r.role || '')}</p><div class="contributor-links">${links}</div></div></div></article>`;
    }).join('');
    container.innerHTML = items;

    rows.forEach((r, i) => {
      const avatarId = `contributor-avatar-${i}`;
      const ghLinkId = `contributor-gh-link-${i}`;
      const dcLinkId = `contributor-dc-link-${i}`;
      const hasDiscord = r.discord_id && r.discord_id !== 'n/a';
      const ghUser = githubUsernameFromUrl(r.github_url);
      // GitHub is the priority source for the avatar too: Discord only
      // gets to set the avatar when there's no GitHub to use instead.
      if (ghUser) fillGithubInfo(ghUser, avatarId, ghLinkId);
      if (hasDiscord) fillDiscordInfo(r.discord_id, avatarId, dcLinkId, !ghUser);
    });

    attachTiltEffect(container);
  }

  // One name, not "display name (@username)" -- a lot of accounts just
  // have a display name that's the same name with different
  // capitalization, which reads as redundant. Prefers the real display
  // name; falls back to the username only when there's no distinct
  // display name to show.
  function pickName(displayName, username){
    if (displayName && displayName.toLowerCase() !== (username || '').toLowerCase()) {
      return displayName;
    }
    return `@${username}`;
  }

  function setLinkTitle(linkId, text){
    const el = document.getElementById(linkId);
    if (el) el.title = text;
  }

  // Real 3D tilt: each card rotates toward the cursor as it moves across
  // it, like a figure on a rotating display stand, and eases back flat
  // on pointer leave. Skipped on touch (no hover/pointermove signal to
  // drive it from, and CSS `:hover` still gives touch a flat tap-state).
  function attachTiltEffect(container){
    const cards = container.querySelectorAll('.contributor-card');
    cards.forEach(card => {
      card.addEventListener('pointermove', (ev) => {
        if (ev.pointerType === 'touch') return;
        const rect = card.getBoundingClientRect();
        const px = (ev.clientX - rect.left) / rect.width - 0.5;
        const py = (ev.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--tilt-x', (py * -10).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', (px * 10).toFixed(2) + 'deg');
        card.style.setProperty('--shine-x', ((px + 0.5) * 100).toFixed(1) + '%');
        card.style.setProperty('--shine-y', ((py + 0.5) * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  function swapAvatar(avatarId, src){
    const el = document.getElementById(avatarId);
    if (!el) return;
    const img = new Image();
    img.onload = () => {
      const replacement = document.createElement('img');
      replacement.className = 'contributor-avatar';
      replacement.id = avatarId;
      replacement.loading = 'lazy';
      replacement.alt = '';
      replacement.src = img.src;
      el.replaceWith(replacement);
    };
    img.src = src;
  }

  // Real Discord username + display name + avatar, via this site's own
  // same-origin serverless function (/api/discord-avatar), which holds
  // a real Discord bot token and calls Discord's own official Bot API
  // server-side. Two earlier client-side-only attempts didn't work and
  // won't ever: a public third-party proxy (dcdn.dstn.ru) that doesn't
  // send CORS headers at all, and Lanyard (api.lanyard.rest), which is
  // CORS-friendly but only returns data for users who've joined
  // Lanyard's own Discord server -- neither fixable from the browser
  // side, since Discord's real API itself has no public,
  // unauthenticated lookup. Every fetch here is still wrapped so a
  // failure (env var not set yet, Discord API hiccup, rate limit) just
  // leaves the existing initial-letter fallback and no title tooltip,
  // never a broken image or a thrown error visible to a visitor.
  async function fillDiscordInfo(id, avatarId, linkId, useAvatar){
    try {
      const res = await fetch(`/api/discord-avatar?id=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data) return;
      if (data.username) {
        setLinkTitle(linkId, `Discord: ${pickName(data.display_name, data.username)}`);
      }
      if (useAvatar && data.avatar) swapAvatar(avatarId, data.avatar);
    } catch (err) {
      // Server route unreachable/erroring -- leave the initial letter
      // and no Discord handle line, this is a real, expected
      // possibility (e.g. before the bot token env var is set), not a
      // bug to surface to the visitor.
    }
  }

  // Real GitHub username + display name + avatar, via this site's own
  // /api/github-user route rather than api.github.com directly -- keeps
  // the browser talking only to this origin (never github.com or
  // githubusercontent.com), and moves every visitor's lookups onto one
  // shared 5-minute edge cache instead of each browser burning its own
  // share of GitHub's unauthenticated rate limit.
  async function fillGithubInfo(username, avatarId, linkId){
    try {
      const res = await fetch(`/api/github-user?username=${encodeURIComponent(username)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data) return;
      setLinkTitle(linkId, `GitHub: ${pickName(data.name, data.login)}`);
      if (data.avatar_url) swapAvatar(avatarId, data.avatar_url);
    } catch (err) {
      // /api/github-user unreachable/erroring -- the proxied
      // github.com/{u}.png shortcut used for the initial paint stays in
      // place, and no title tooltip gets added. Not a bug to surface.
    }
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
