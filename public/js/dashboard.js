/* Renders the masthead dial and the per-repository progress cards from
   /progress.json.

   Lifted out of index.html as an inline <script> on 2026-08-27 so that
   vercel.json's Content-Security-Policy can use a plain `script-src
   'self'` -- no 'unsafe-inline', no per-deploy hash to keep in sync.
   Everything is built with createElement and textContent: this is data
   fetched at runtime and rendered into the site's own origin, so it
   never goes near innerHTML. */
(function () {
  fetch('/progress.json')
    .then(function (res) {
      if (!res.ok) throw new Error('progress.json: HTTP ' + res.status);
      return res.json();
    })
    .then(render)
    .catch(function (err) {
      console.error('Error loading progress.json:', err);
      var headline = document.getElementById('project-headline');
      if (headline) headline.textContent = 'Progress data unavailable.';
    });

  function render(data) {
    renderDial(data);
    renderStatus(data.status);

    var headline = document.getElementById('project-headline');
    if (headline && data.overall) headline.textContent = data.overall.headline || '';

    var grid = document.getElementById('projects-list');
    if (!grid || !Array.isArray(data.projects)) return;

    data.projects.forEach(function (project) {
      grid.appendChild(buildCard(project));
    });
  }

  function renderDial(data) {
    var dial = document.getElementById('overall-dial');
    var value = document.getElementById('overall-value');
    if (!dial || !data.overall) return;
    var pct = Number(data.overall.percent) || 0;
    dial.style.setProperty('--pct', pct);
    dial.setAttribute('role', 'img');
    dial.setAttribute('aria-label', 'Overall project progress: ' + pct + ' percent');
    if (value) value.textContent = pct + '%';

    var meta = document.getElementById('overall-meta');
    if (meta && data.max_percent) {
      var cap = document.createElement('span');
      cap.textContent = 'Nothing is scored above ' + data.max_percent +
        '% while the game does not yet render.';
      meta.appendChild(cap);
    }
  }

  function renderStatus(status) {
    var el = document.getElementById('project-status');
    if (!el || !status) return;
    var b = document.createElement('b');
    b.textContent = status.state || 'unknown';
    el.appendChild(document.createTextNode('Status: '));
    el.appendChild(b);
    if (status.since) {
      el.appendChild(document.createTextNode(' since ' + status.since));
    }
  }

  function buildCard(project) {
    var card = document.createElement('article');
    card.className = 'progress-card';
    if (project.state) card.dataset.state = project.state;

    var top = document.createElement('div');
    top.className = 'progress-card-top';

    var name;
    if (project.url) {
      name = document.createElement('a');
      name.href = project.url;
      name.rel = 'noopener';
    } else {
      name = document.createElement('span');
    }
    name.className = 'progress-card-name';
    name.textContent = project.name || project.id || '';
    top.appendChild(name);

    var pct = Number(project.percent) || 0;
    var pctEl = document.createElement('span');
    pctEl.className = 'progress-card-pct';
    pctEl.textContent = pct + '%';
    top.appendChild(pctEl);
    card.appendChild(top);

    if (project.role) {
      var role = document.createElement('div');
      role.className = 'progress-card-role';
      role.textContent = project.role;
      card.appendChild(role);
    }

    var bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', String(pct));
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-label', (project.name || 'project') + ' progress');
    var fill = document.createElement('span');
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    card.appendChild(bar);

    if (project.summary) {
      var summary = document.createElement('p');
      summary.className = 'progress-card-summary';
      summary.textContent = project.summary;
      card.appendChild(summary);
    }

    return card;
  }
})();
