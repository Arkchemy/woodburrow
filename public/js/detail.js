/* Renders the sections that were being served and never shown: what is
   being worked on right now, the research findings, the timeline, and the
   roadmap. All of it already existed in /progress.json and /findings.json
   -- the page just never read past `projects`.

   createElement/textContent throughout: this is runtime-fetched data
   rendered into the site's own origin, so it never goes near innerHTML. */
(function () {
  Promise.all([
    fetch('/progress.json').then(function (r) { if (!r.ok) throw new Error('progress ' + r.status); return r.json(); }),
    fetch('/findings.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (both) {
    renderNow(both[0]);
    renderTimeline(both[0]);
    renderRoadmap(both[0]);
    renderFindings(both[1]);
  }).catch(function (err) {
    console.error('Error loading site detail data:', err);
  });

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function show(id) {
    var s = document.getElementById(id);
    if (s) s.hidden = false;
    return s;
  }

  /* A nav entry pointing at a section that never rendered is a dead link,
     so entries start hidden and are revealed with their section. */
  function hideNavFor(ids) {
    ids.forEach(function (id) {
      var a = document.querySelector('.section-nav a[href="#' + id + '"]');
      if (a) a.hidden = true;
    });
  }
  function showNavFor(id) {
    var a = document.querySelector('.section-nav a[href="#' + id + '"]');
    if (a) a.hidden = false;
  }
  hideNavFor(['now', 'findings', 'timeline', 'roadmap']);

  /* ---- what's happening right now ---- */
  function renderNow(data) {
    var host = document.getElementById('now-body');
    if (!host || !data || !data.current_work) return;
    var cw = data.current_work;

    var card = el('div', 'now-card');
    if (cw.repo) card.appendChild(el('span', 'now-repo', cw.repo));
    card.appendChild(el('h3', 'now-title', cw.title || ''));
    if (cw.detail) card.appendChild(el('p', 'now-detail', cw.detail));
    if (cw.blocked_on) {
      var b = el('p', 'now-blocked');
      b.appendChild(el('strong', null, 'Blocked on: '));
      b.appendChild(document.createTextNode(cw.blocked_on));
      card.appendChild(b);
    }
    host.appendChild(card);

    if (Array.isArray(data.next_work) && data.next_work.length) {
      host.appendChild(el('h3', 'subhead', 'Queued next'));
      var ol = el('ol', 'next-list');
      data.next_work.forEach(function (n) {
        var li = document.createElement('li');
        li.appendChild(el('span', 'next-title', typeof n === 'string' ? n : (n.title || n.name || '')));
        var detail = (typeof n === 'object') && (n.detail || n.why || n.note);
        if (detail) li.appendChild(el('span', 'next-detail', detail));
        ol.appendChild(li);
      });
      host.appendChild(ol);
    }
    show('now');
    showNavFor('now');
  }

  /* ---- timeline / honest estimates ---- */
  function renderTimeline(data) {
    var host = document.getElementById('timeline-body');
    var t = data && data.timeline;
    if (!host || !t) return;

    if (t.milestone) {
      host.appendChild(el('p', 'timeline-milestone', t.milestone));
    }
    var dl = el('dl', 'timeline-grid');
    [
      ['Started', t.started],
      ['Optimistic', t.estimate_fast],
      ['Realistic', t.estimate_realistic],
      ['Confidence', t.confidence]
    ].forEach(function (pair) {
      if (!pair[1]) return;
      dl.appendChild(el('dt', null, pair[0]));
      dl.appendChild(el('dd', null, pair[1]));
    });
    host.appendChild(dl);

    if (data.max_percent_reason) {
      host.appendChild(el('p', 'timeline-note', data.max_percent_reason));
    }
    show('timeline');
    showNavFor('timeline');
  }

  /* ---- which games, and where each stands ---- */
  function renderRoadmap(data) {
    var host = document.getElementById('roadmap-body');
    var r = data && data.roadmap;
    if (!host || !r || !Array.isArray(r.games)) return;

    if (r.note) host.appendChild(el('p', 'section-lede', r.note));
    var grid = el('div', 'roadmap-grid');
    r.games.forEach(function (g) {
      var card = el('div', 'roadmap-card');
      if (g.state) card.dataset.state = String(g.state).toLowerCase().replace(/\s+/g, '-');
      card.appendChild(el('span', 'roadmap-title', g.title || ''));
      if (g.state) card.appendChild(el('span', 'roadmap-state', g.state));
      if (g.wiiu_port_studio) {
        card.appendChild(el('span', 'roadmap-meta', 'Wii U port: ' + g.wiiu_port_studio));
      }
      if (g.note) card.appendChild(el('span', 'roadmap-meta', g.note));
      grid.appendChild(card);
    });
    host.appendChild(grid);
    show('roadmap');
    showNavFor('roadmap');
  }

  /* ---- research findings ---- */
  function renderFindings(data) {
    var host = document.getElementById('findings-body');
    if (!host || !data || !Array.isArray(data.findings)) return;

    if (data.about && data.about.scope) {
      host.appendChild(el('p', 'section-lede', data.about.scope));
    }

    data.findings.forEach(function (f) {
      var det = document.createElement('details');
      det.className = 'finding';

      var sum = document.createElement('summary');
      sum.appendChild(el('span', 'finding-title', f.title || ''));
      var tags = el('span', 'finding-tags');
      if (f.area) tags.appendChild(el('span', 'finding-tag', f.area));
      if (f.confidence) {
        var c = el('span', 'finding-tag finding-confidence', f.confidence);
        c.dataset.level = String(f.confidence).toLowerCase();
        tags.appendChild(c);
      }
      sum.appendChild(tags);
      det.appendChild(sum);

      var body = el('div', 'finding-body');
      [
        [null, f.detail],
        ['Why it matters', f.why_it_matters],
        ['What would disprove it', f.falsifiable_by],
        ['Prior art on Discord', f.discord_prior_art]
      ].forEach(function (pair) {
        if (!pair[1]) return;
        var p = el('p', null);
        if (pair[0]) p.appendChild(el('strong', null, pair[0] + ': '));
        p.appendChild(document.createTextNode(pair[1]));
        body.appendChild(p);
      });
      det.appendChild(body);
      host.appendChild(det);
    });

    /* Work confirmed rather than discovered here is listed separately and
       credited by name. Someone else found these first. */
    if (Array.isArray(data.confirmations) && data.confirmations.length) {
      host.appendChild(el('h3', 'subhead', 'Confirmations of other people’s work'));
      var ul = el('ul', 'confirm-list');
      data.confirmations.forEach(function (c) {
        var li = document.createElement('li');
        li.appendChild(el('span', 'confirm-title', c.title || ''));
        if (c.credit) li.appendChild(el('span', 'confirm-credit', 'Credit: ' + c.credit));
        if (c.why_recorded) li.appendChild(el('span', 'confirm-why', c.why_recorded));
        ul.appendChild(li);
      });
      host.appendChild(ul);
    }
    show('findings');
    showNavFor('findings');
  }
})();

/* Section-nav behaviour and the findings expand/collapse controls.
   Separate IIFE so a failure in either cannot take the other down --
   the contributors section went dark today for exactly that reason. */
(function () {
  var expand = document.getElementById('findings-expand');
  var collapse = document.getElementById('findings-collapse');
  function setAll(open) {
    document.querySelectorAll('#findings-body .finding').forEach(function (d) { d.open = open; });
  }
  if (expand) expand.addEventListener('click', function () { setAll(true); });
  if (collapse) collapse.addEventListener('click', function () { setAll(false); });

  /* Highlight whichever section is on screen. IntersectionObserver rather
     than a scroll handler so it costs nothing while idle. */
  var links = Array.prototype.slice.call(document.querySelectorAll('.section-nav a'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  var byId = {};
  links.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    var target = document.getElementById(id);
    if (target) byId[id] = a;
  });

  var visible = {};
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
    var current = null;
    Object.keys(byId).forEach(function (id) {
      if (!current && visible[id]) current = id;
    });
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (id === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }, { rootMargin: '-15% 0px -70% 0px' });

  Object.keys(byId).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) obs.observe(el);
  });
})();
