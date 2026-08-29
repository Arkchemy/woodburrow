/* Arkchemy site renderer. Written from scratch 2026-08-29.

   Everything on the page comes from data: /progress.json, /findings.json,
   /worktree.json, the CONTRIBUTORS.csv in this repo, and the same-origin
   /api/* routes that proxy GitHub and Discord.

   Built with createElement and textContent throughout. This is remote data
   rendered into the site's own origin, so it never goes near innerHTML --
   the CSP can then stay at script-src 'self' with no unsafe-inline. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function put(parent, node) { if (parent && node) parent.appendChild(node); return node; }
  function getJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error(path + ': HTTP ' + r.status);
      return r.json();
    });
  }

  /* ---- hero + status ---------------------------------------------------- */
  function renderHero(d) {
    var o = d.overall || {};
    var pct = Math.max(0, Math.min(100, Number(o.percent) || 0));

    /* headline is one sentence; summary is a paragraph written for a
       changelog. Lead with the sentence and let the reader ask for the rest. */
    var headline = $('hero-headline');
    if (headline) headline.textContent = o.headline || o.summary || '';
    if (o.summary && o.summary !== o.headline) {
      var more = $('hero-more'), sum = $('hero-summary');
      if (more && sum) { sum.textContent = o.summary; more.hidden = false; }
    }

    var val = $('gauge-value');
    if (val) val.textContent = pct + '%';
    var gauge = $('gauge');
    if (gauge) gauge.setAttribute('aria-label', 'Overall progress: ' + pct + ' percent');

    /* 2 * pi * r, r = 52 */
    var circumference = 326.7256;
    var fill = $('gauge-fill');
    if (fill) {
      /* The stylesheet already renders the ring empty, so the transition has a
         start value without JS setting one. Assign the target directly rather
         than through requestAnimationFrame: rAF does not fire in a tab that is
         not compositing, which left the gauge stuck at zero for anyone opening
         the page in a background tab -- and is exactly how it was caught
         locally in a headless pane. */
      fill.style.strokeDasharray = String(circumference);
      fill.style.strokeDashoffset = String(circumference * (1 - pct / 100));
    }

    var note = $('gauge-note');
    if (note && d.max_percent) {
      note.textContent = 'Nothing is scored above ' + d.max_percent +
        '% while the game does not yet render.';
    }

    var s = d.status || {};
    var pill = $('status-pill');
    if (pill && s.state) {
      pill.hidden = false;
      pill.setAttribute('data-state', String(s.state).toLowerCase());
      pill.textContent = s.since ? (s.state + ' · since ' + s.since) : s.state;
    }

    var links = d.links || {};
    var gh = $('link-github');
    if (gh && links.org) gh.href = links.org;
    var alt = $('hero-discord');
    if (alt && links.org) alt.href = links.org;
  }

  /* ---- now + queue ------------------------------------------------------ */
  function renderNow(d) {
    var host = $('now-body');
    if (!host) return;
    host.textContent = '';

    var cw = d.current_work;
    if (cw) {
      var main = el('div', 'now-main');
      if (cw.repo) put(main, el('span', 'tag', cw.repo));
      put(main, el('h3', null, cw.title || ''));
      if (cw.detail) put(main, el('p', null, cw.detail));
      if (cw.blocked_on) put(main, el('p', 'now-blocked', 'Blocked on: ' + cw.blocked_on));
      put(host, main);
    }

    var next = d.next_work;
    if (Array.isArray(next) && next.length) {
      var ol = el('ol', 'queue');
      next.forEach(function (n) {
        var li = el('li');
        put(li, el('b', null, typeof n === 'string' ? n : (n.title || n.name || '')));
        var detail = (typeof n === 'object') && (n.detail || n.why || n.note);
        if (detail) put(li, el('span', null, detail));
        put(ol, li);
      });
      put(host, ol);
    }
  }

  /* ---- projects --------------------------------------------------------- */
  function renderProjects(d) {
    var host = $('projects-grid');
    if (!host || !Array.isArray(d.projects)) return;
    host.textContent = '';

    d.projects.forEach(function (p) {
      var pct = Math.max(0, Math.min(100, Number(p.percent) || 0));
      var card = p.url ? el('a', 'card') : el('div', 'card');
      if (p.url) { card.href = p.url; card.rel = 'noopener'; }
      if (p.state) card.setAttribute('data-state', String(p.state).toLowerCase());

      var top = el('div', 'card-top');
      put(top, el('span', 'card-name', p.name || p.id || ''));
      put(top, el('span', 'card-pct', pct + '%'));
      put(card, top);

      if (p.role) put(card, el('div', 'card-role', p.role));

      var meter = el('div', 'meter');
      meter.setAttribute('role', 'progressbar');
      meter.setAttribute('aria-valuenow', String(pct));
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '100');
      meter.setAttribute('aria-label', (p.name || 'project') + ' progress');
      var bar = el('span');
      bar.style.width = pct + '%';
      put(meter, bar);
      put(card, meter);

      if (p.summary) {
        put(card, el('p', 'card-sum', p.summary));
        /* Only offer the toggle when there is actually more to show -- a
           button that expands nothing is worse than no button. */
        if (p.summary.length > 190) {
          var btn = el('button', 'card-more', 'Read more');
          btn.type = 'button';
          btn.addEventListener('click', function (ev) {
            ev.preventDefault(); ev.stopPropagation();
            var open = card.classList.toggle('is-open');
            btn.textContent = open ? 'Show less' : 'Read more';
          });
          put(card, btn);
        }
      }
      put(host, card);
    });
  }

  /* ---- work tree -------------------------------------------------------- */
  function renderWorktree(w) {
    var f = w.focus, host = $('worktree-focus');
    if (host && f) {
      host.textContent = '';
      if (Array.isArray(f.path) && f.path.length) {
        var path = el('div', 'focus-path');
        f.path.forEach(function (seg, i) {
          if (i) path.appendChild(document.createTextNode(' › '));
          put(path, el(i === f.path.length - 1 ? 'b' : 'span', null, seg));
        });
        put(host, path);
      }
      put(host, el('h3', null, f.substep || ''));
      if (f.why) put(host, el('p', null, f.why));
      if (f.blocked_on) put(host, el('p', 'now-blocked', 'Blocked on: ' + f.blocked_on));
    }

    var body = $('worktree-body');
    if (!body || !Array.isArray(w.tree)) return;
    body.textContent = '';
    put(body, buildBranch(w.tree, 0));
  }

  function buildBranch(nodes, depth) {
    var ul = el('ul');
    nodes.forEach(function (n) {
      var li = el('li');
      if (n.status) li.setAttribute('data-status', String(n.status).toLowerCase());

      var kids = Array.isArray(n.children) && n.children.length;
      var head = el('div', 'node');
      put(head, el('span', 'dot'));
      put(head, el('span', 'node-name', n.name || ''));
      if (typeof n.percent === 'number') put(head, el('span', 'tag', n.percent + '%'));
      if (n.note) put(head, el('span', 'node-note', n.note));

      if (kids) {
        var det = el('details');
        /* open the top two levels, and anything actively being worked on */
        det.open = depth < 1 || String(n.status).toLowerCase() === 'active';
        var sum = el('summary');
        put(sum, head);
        put(det, sum);
        put(det, buildBranch(n.children, depth + 1));
        put(li, det);
      } else {
        put(li, head);
      }
      put(ul, li);
    });
    return ul;
  }

  /* ---- findings --------------------------------------------------------- */
  function renderFindings(d) {
    var host = $('findings-body');
    if (!host || !d || !Array.isArray(d.findings)) return;
    host.textContent = '';

    var areas = [];
    d.findings.forEach(function (f) {
      if (f.area && areas.indexOf(f.area) < 0) areas.push(f.area);
    });

    var filter = $('findings-filter');
    if (filter && areas.length > 1) {
      filter.textContent = '';
      makeChip(filter, 'All', null, true);
      areas.forEach(function (a) { makeChip(filter, a, a, false); });
    }

    d.findings.forEach(function (f) {
      var det = el('details', 'finding');
      if (f.area) det.setAttribute('data-area', f.area);

      var sum = el('summary');
      put(sum, el('span', null, f.title || ''));
      var tags = el('span', 'tags');
      if (f.area) put(tags, el('span', 'tag', f.area));
      if (f.confidence) {
        var c = el('span', 'tag tag-conf', f.confidence);
        c.setAttribute('data-level', String(f.confidence).toLowerCase());
        put(tags, c);
      }
      put(sum, tags);
      put(det, sum);

      var body = el('div', 'finding-body');
      [[null, f.detail],
       ['Why it matters', f.why_it_matters],
       ['What would disprove it', f.falsifiable_by],
       ['Prior art on Discord', f.discord_prior_art]].forEach(function (pair) {
        if (!pair[1]) return;
        var p = el('p');
        if (pair[0]) put(p, el('b', null, pair[0] + ': '));
        p.appendChild(document.createTextNode(pair[1]));
        put(body, p);
      });
      put(det, body);
      put(host, det);
    });

    var oq = $('open-questions');
    if (oq && Array.isArray(d.open_questions) && d.open_questions.length) {
      oq.textContent = '';
      put(oq, el('h3', null, 'Open questions'));
      d.open_questions.forEach(function (q) {
        var box = el('div', 'q');
        put(box, el('b', null, q.question || q.title || ''));
        if (q.detail) put(box, el('p', null, q.detail));
        put(oq, box);
      });
    }
  }

  function makeChip(host, label, area, pressed) {
    var b = el('button', 'chip', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(host.querySelectorAll('.chip'), function (c) {
        c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
      });
      Array.prototype.forEach.call(document.querySelectorAll('.finding'), function (f) {
        f.hidden = !!(area && f.getAttribute('data-area') !== area);
      });
    });
    put(host, b);
  }

  /* ---- games + timeline ------------------------------------------------- */
  function renderGames(d) {
    var r = d.roadmap, host = $('games-grid');
    if (!host || !r || !Array.isArray(r.games)) return;
    var note = $('games-note');
    if (note && r.note) note.textContent = r.note;
    host.textContent = '';
    r.games.forEach(function (g) {
      var card = el('div', 'card');
      if (g.state) card.setAttribute('data-state', String(g.state).toLowerCase().replace(/\s+/g, '-'));
      put(card, el('div', 'card-name', g.title || ''));
      if (g.state) put(card, el('div', 'card-role', g.state));
      if (g.wiiu_port_studio) put(card, el('p', 'card-sum', 'Wii U port: ' + g.wiiu_port_studio));
      if (g.note) put(card, el('p', 'card-sum', g.note));
      put(host, card);
    });
  }

  function renderTimeline(d) {
    var t = d.timeline, host = $('timeline-body');
    if (!host || !t) return;
    host.textContent = '';
    [['Started', t.started], ['Optimistic', t.estimate_fast],
     ['Realistic', t.estimate_realistic], ['Confidence', t.confidence]].forEach(function (pair) {
      if (!pair[1]) return;
      var dl = el('dl', 'tl');
      put(dl, el('dt', null, pair[0]));
      put(dl, el('dd', null, pair[1]));
      put(host, dl);
    });
    if (t.milestone) put(host, el('p', 'tl-note', 'Milestone: ' + t.milestone));
    if (d.max_percent_reason) put(host, el('p', 'tl-note', d.max_percent_reason));
  }

  /* ---- people ----------------------------------------------------------- */
  function parseCSV(text) {
    var rows = [], row = [], field = '', q = false, i;
    for (i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function renderPeople() {
    var url = 'https://raw.githubusercontent.com/Arkchemy/woodburrow/refs/heads/main/CONTRIBUTORS.csv?t=' + Date.now();
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error('CONTRIBUTORS.csv: HTTP ' + r.status);
      return r.text();
    }).then(function (text) {
      var rows = parseCSV(text.trim());
      if (rows.length < 2) return;
      var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
      var idx = {};
      head.forEach(function (h, i) { idx[h] = i; });

      var main = $('contributors'), thanks = $('thanks');
      if (main) main.textContent = '';
      if (thanks) thanks.textContent = '';

      rows.slice(1).forEach(function (r) {
        if (!r.length || !(r[idx.name] || '').trim()) return;
        var section = (r[idx.section] || '').trim().toLowerCase();
        var host = (section && section !== 'n/a') ? thanks : main;
        if (host) put(host, personCard(r, idx));
      });
    }).catch(function (e) {
      var main = $('contributors');
      if (main) main.textContent = 'Could not load contributors: ' + e.message;
    });
  }

  function personCard(r, idx) {
    var name = (r[idx.name] || '').trim();
    var role = (r[idx.role] || '').trim();
    var gh = (r[idx.github_url] || '').trim();
    var did = (r[idx.discord_id] || '').trim();
    var prefer = (r[idx.avatar] || '').trim().toLowerCase();

    var card = el('div', 'person');

    var ghUser = '';
    if (gh && gh.indexOf('github.com/') >= 0) ghUser = gh.split('github.com/')[1].replace(/\/+$/, '');

    var useDiscord = (prefer === 'discord' && did && did !== 'n/a');
    if (useDiscord) {
      var ph = el('div', 'avatar-fallback', name.slice(0, 1).toUpperCase());
      put(card, ph);
      fetch('/api/discord-avatar?id=' + encodeURIComponent(did))
        .then(function (x) { return x.ok ? x.json() : null; })
        .then(function (j) {
          if (!j || !j.avatar_url) return;
          var im = el('img');
          im.src = '/api/avatar-image?src=' + encodeURIComponent(j.avatar_url);
          im.alt = '';
          im.loading = 'lazy';
          if (ph.parentNode) ph.parentNode.replaceChild(im, ph);
        }).catch(function () {});
    } else if (ghUser) {
      var img = el('img');
      img.src = '/api/avatar-image?src=' + encodeURIComponent('https://github.com/' + ghUser + '.png');
      img.alt = '';
      img.loading = 'lazy';
      put(card, img);
    } else {
      put(card, el('div', 'avatar-fallback', name.slice(0, 1).toUpperCase()));
    }

    put(card, el('div', 'person-name', name));
    if (role && role !== 'n/a') put(card, el('div', 'person-role', role));

    var links = el('div', 'person-links');
    if (gh && gh !== 'n/a') {
      var a = el('a', null, 'GitHub');
      a.href = gh; a.rel = 'noopener';
      put(links, a);
    }
    if (links.childNodes.length) put(card, links);
    return card;
  }

  /* ---- repositories ----------------------------------------------------- */
  function renderRepos() {
    var host = $('repo-list');
    if (!host) return;
    host.textContent = '';
    put(host, el('p', 'loading', 'Loading repositories…'));
    fetch('/api/github-repos?user=Arkchemy').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (list) {
      if (!Array.isArray(list)) list = list && list.repos ? list.repos : [];
      host.textContent = '';
      if (!list.length) { put(host, el('p', 'empty', 'No repositories returned.')); return; }
      list.forEach(function (repo) {
        var card = el('a', 'card');
        card.href = repo.html_url || ('https://github.com/Arkchemy/' + repo.name);
        card.rel = 'noopener';
        put(card, el('div', 'card-name', repo.name || ''));
        if (repo.description) put(card, el('p', 'card-sum', repo.description));
        if (repo.language) put(card, el('div', 'card-role', repo.language));
        put(host, card);
      });
    }).catch(function (e) {
      host.textContent = '';
      put(host, el('p', 'empty', 'Repositories unavailable: ' + e.message));
    });
  }

  /* ---- at-a-glance strip + live commit feed ------------------------------
     The numbers people actually want first: how much is done, how much is
     known, and whether anyone is still working on it. The last one cannot
     come from a JSON file that someone has to remember to update, so it comes
     from GitHub. */
  function stat(host, label, value, note) {
    var d = el('div');
    put(d, el('dt', null, label));
    put(d, el('dd', null, value));
    if (note) put(d, el('div', 'sub-note', note));
    put(host, d);
  }

  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!isFinite(s) || s < 0) return '';
    var units = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
    for (var i = 0; i < units.length; i++) {
      if (s >= units[i][0]) return Math.floor(s / units[i][0]) + units[i][1] + ' ago';
    }
    return 'just now';
  }

  function renderStats(prog, findings, activity) {
    var host = $('stats');
    if (!host) return;
    host.textContent = '';

    var pct = Number((prog.overall || {}).percent) || 0;
    stat(host, 'Overall', pct + '%', prog.max_percent ? ('capped at ' + prog.max_percent + '%') : null);

    if (findings && Array.isArray(findings.findings)) {
      var open = Array.isArray(findings.open_questions) ? findings.open_questions.length : 0;
      stat(host, 'Findings', String(findings.findings.length), open ? (open + ' still open') : null);
    }
    if (Array.isArray(prog.projects)) {
      stat(host, 'Repositories', String(prog.projects.length), 'one job each');
    }
    if (activity && activity.totals && activity.totals.lastPush) {
      stat(host, 'Last commit', ago(activity.totals.lastPush), 'across the org');
    }
    if (prog.timeline && prog.timeline.started) {
      stat(host, 'Started', prog.timeline.started, ago(prog.timeline.started).replace(' ago', ' in'));
    }
  }

  function renderFeed(activity) {
    var host = $('feed');
    if (!host) return;
    host.textContent = '';
    var list = (activity && activity.commits) || [];
    if (!list.length) {
      put(host, el('li', 'empty', 'No recent commits returned.'));
      return;
    }
    list.forEach(function (c) {
      var li = el('li');
      put(li, el('span', 'repo-tag', c.repo || ''));
      var msg = el('span', 'msg');
      if (c.url) {
        var a = el('a', null, c.message || c.sha);
        a.href = c.url; a.rel = 'noopener';
        a.title = c.message || '';
        put(msg, a);
      } else {
        msg.textContent = c.message || c.sha || '';
      }
      put(li, msg);
      put(li, el('span', 'when', ago(c.date)));
      put(host, li);
    });
  }

  /* ---- nav highlighting -------------------------------------------------- */
  function spy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.topnav a'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var seen = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      var current = null;
      links.forEach(function (a) {
        var id = a.getAttribute('href').slice(1);
        if (!current && seen[id]) current = id;
      });
      links.forEach(function (a) {
        if (a.getAttribute('href').slice(1) === current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-12% 0px -70% 0px' });
    links.forEach(function (a) {
      var t = document.getElementById(a.getAttribute('href').slice(1));
      if (t) obs.observe(t);
    });
  }

  /* ---- go ---------------------------------------------------------------- */
  getJSON('/progress.json').then(function (d) {
    renderHero(d); renderNow(d); renderProjects(d); renderGames(d); renderTimeline(d);
  }).catch(function (e) {
    var h = $('hero-headline');
    if (h) h.textContent = 'Progress data unavailable (' + e.message + ').';
  });

  getJSON('/worktree.json').then(renderWorktree).catch(function () {});
  getJSON('/findings.json').then(renderFindings).catch(function () {});

  /* The strip needs all three, and a failure in any one of them should still
     leave the others showing rather than blanking the row. */
  Promise.all([
    getJSON('/progress.json').catch(function () { return {}; }),
    getJSON('/findings.json').catch(function () { return null; }),
    fetch('/api/github-activity?limit=12')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
  ]).then(function (all) {
    renderStats(all[0], all[1], all[2]);
    renderFeed(all[2]);
  });
  renderPeople();
  renderRepos();
  spy();
})();
