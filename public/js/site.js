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
