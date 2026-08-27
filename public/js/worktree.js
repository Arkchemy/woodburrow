/* Renders /worktree.json as a collapsible tree, with whatever is being
   worked on right now raised out of the page.

   Kept as its own file rather than inline so the site's CSP can stay on
   a plain script-src 'self'. Everything is built with createElement and
   textContent -- the JSON is data fetched at runtime and rendered into
   this origin, so it never goes near innerHTML. */
(function () {
  var STATUS_ORDER = { active: 0, next: 1, blocked: 2, paused: 3, done: 4 };
  var root = document.getElementById('worktree');
  if (!root) return;

  var focusEl = document.getElementById('worktree-focus');
  var countsEl = document.getElementById('worktree-counts');
  var controlsEl = document.getElementById('worktree-controls');
  var filter = 'all';
  var focusNode = null;

  fetch('/worktree.json')
    .then(function (res) {
      if (!res.ok) throw new Error('worktree.json: HTTP ' + res.status);
      return res.json();
    })
    .then(render)
    .catch(function (err) {
      console.error('Error loading worktree.json:', err);
      var p = document.createElement('p');
      p.className = 'worktree-empty';
      p.textContent = 'Work tree unavailable.';
      root.appendChild(p);
    });

  function render(data) {
    renderFocus(data.focus, data.generated);
    var counts = { active: 0, next: 0, blocked: 0, paused: 0, done: 0 };
    var list = buildList(data.tree || [], counts, 0);
    root.appendChild(list);
    markFocus(data.focus);
    renderCounts(counts);
    renderFilters();
  }

  function renderFocus(focus, generated) {
    if (!focus || !focusEl) return;

    var label = document.createElement('div');
    label.className = 'worktree-focus-label';
    var dot = document.createElement('span');
    dot.className = 'worktree-focus-dot';
    label.appendChild(dot);
    label.appendChild(document.createTextNode(
      generated ? 'Current substep · as of ' + generated : 'Current substep'));
    focusEl.appendChild(label);

    if (Array.isArray(focus.path)) {
      var path = document.createElement('div');
      path.className = 'worktree-focus-path';
      focus.path.forEach(function (part) {
        var s = document.createElement('span');
        s.textContent = part;
        path.appendChild(s);
      });
      focusEl.appendChild(path);
    }

    var step = document.createElement('div');
    step.className = 'worktree-focus-substep';
    step.textContent = focus.substep || '';
    focusEl.appendChild(step);

    if (focus.why) {
      var why = document.createElement('div');
      why.className = 'worktree-focus-why';
      why.textContent = focus.why;
      focusEl.appendChild(why);
    }

    if (focus.blocked_on) {
      var blocked = document.createElement('div');
      blocked.className = 'worktree-focus-blocked';
      var strong = document.createElement('strong');
      strong.textContent = 'Blocked on: ';
      blocked.appendChild(strong);
      blocked.appendChild(document.createTextNode(focus.blocked_on));
      focusEl.appendChild(blocked);
    }
  }

  function buildList(nodes, counts, depth) {
    var ul = document.createElement('ul');

    nodes.slice().sort(function (a, b) {
      var sa = STATUS_ORDER[a.status], sb = STATUS_ORDER[b.status];
      if (sa === undefined) sa = 9;
      if (sb === undefined) sb = 9;
      return sa - sb;
    }).forEach(function (node) {
      ul.appendChild(buildNode(node, counts, depth));
    });

    return ul;
  }

  function buildNode(node, counts, depth) {
    var li = document.createElement('li');
    li.className = 'worktree-item';
    li.dataset.status = node.status || 'next';
    if (node.kind) li.dataset.kind = node.kind;
    if (counts[node.status] !== undefined) counts[node.status]++;

    var row = document.createElement('div');
    row.className = 'worktree-node';

    var kids = Array.isArray(node.children) ? node.children : [];
    var hasKids = kids.length > 0;

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'worktree-toggle' + (hasKids ? '' : ' is-leaf');
    toggle.textContent = '▾';
    if (!hasKids) {
      toggle.setAttribute('aria-hidden', 'true');
      toggle.tabIndex = -1;
    }
    row.appendChild(toggle);

    var body = document.createElement('div');
    body.className = 'worktree-body';

    var name = document.createElement('div');
    name.className = 'worktree-name';
    name.appendChild(document.createTextNode(node.name || ''));

    if (node.status) {
      var chip = document.createElement('span');
      chip.className = 'worktree-chip';
      chip.textContent = node.status;
      name.appendChild(chip);
    }

    if (typeof node.percent === 'number') {
      var pct = document.createElement('span');
      pct.className = 'worktree-percent';
      pct.textContent = node.percent + '%';
      name.appendChild(pct);
    }

    body.appendChild(name);

    if (node.note) {
      var note = document.createElement('span');
      note.className = 'worktree-note';
      note.textContent = node.note;
      body.appendChild(note);
    }

    row.appendChild(body);
    li.appendChild(row);

    if (hasKids) {
      var childList = buildList(kids, counts, depth + 1);
      li.appendChild(childList);

      // Anything finished collapses by default below the top level --
      // the point of the view is what is live, not what is behind us.
      var collapsed = depth > 0 && node.status === 'done';
      setExpanded(toggle, childList, !collapsed);

      toggle.addEventListener('click', function () {
        setExpanded(toggle, childList, toggle.getAttribute('aria-expanded') === 'false');
      });
    }

    return li;
  }

  function setExpanded(toggle, list, expanded) {
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    toggle.setAttribute('aria-label', expanded ? 'Collapse' : 'Expand');
    list.classList.toggle('worktree-hidden', !expanded);
  }

  /* Find the node named by focus.path and give it the strongest
     treatment, then make sure every ancestor is expanded so it is
     actually visible without clicking anything. */
  function markFocus(focus) {
    if (!focus || !Array.isArray(focus.path) || !focus.path.length) return;
    var target = focus.path[focus.path.length - 1];

    var items = root.querySelectorAll('.worktree-item');
    for (var i = 0; i < items.length; i++) {
      var nameEl = items[i].querySelector(':scope > .worktree-node .worktree-name');
      if (!nameEl) continue;
      if (nameEl.firstChild && nameEl.firstChild.textContent === target) {
        items[i].classList.add('is-focus');
        focusNode = items[i];
        expandAncestors(items[i]);
        break;
      }
    }
  }

  function expandAncestors(item) {
    var node = item.parentElement;
    while (node && node !== root) {
      if (node.tagName === 'UL' && node.classList.contains('worktree-hidden')) {
        var owner = node.parentElement;
        var toggle = owner && owner.querySelector(':scope > .worktree-node .worktree-toggle');
        if (toggle) setExpanded(toggle, node, true);
      }
      node = node.parentElement;
    }
  }

  function renderCounts(counts) {
    if (!countsEl) return;
    var parts = [];
    ['active', 'next', 'blocked', 'paused', 'done'].forEach(function (k) {
      if (counts[k]) parts.push(counts[k] + ' ' + k);
    });
    countsEl.textContent = parts.join(' · ');
  }

  function renderFilters() {
    if (!controlsEl) return;
    [
      { key: 'all', label: 'Everything' },
      { key: 'active', label: 'In flight' },
      { key: 'blocked', label: 'Blocked' }
    ].forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'worktree-filter';
      btn.textContent = opt.label;
      btn.setAttribute('aria-pressed', opt.key === filter ? 'true' : 'false');
      btn.addEventListener('click', function () {
        filter = opt.key;
        controlsEl.querySelectorAll('.worktree-filter').forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        applyFilter();
      });
      controlsEl.insertBefore(btn, countsEl);
    });
  }

  /* Filtering keeps a node when it matches, or when any descendant does,
     so a matching leaf never loses the branch that explains where it sits. */
  function applyFilter() {
    var items = root.querySelectorAll('.worktree-item');
    items.forEach(function (item) { item.classList.remove('worktree-hidden'); });
    if (filter === 'all') {
      items.forEach(function (item) {
        var list = item.querySelector(':scope > ul');
        var toggle = item.querySelector(':scope > .worktree-node .worktree-toggle');
        if (list && toggle) setExpanded(toggle, list, toggle.getAttribute('aria-expanded') === 'true');
      });
      return;
    }

    items.forEach(function (item) {
      var matches = item.dataset.status === filter ||
        item.querySelector('.worktree-item[data-status="' + filter + '"]') !== null;
      item.classList.toggle('worktree-hidden', !matches);
      if (matches) {
        var list = item.querySelector(':scope > ul');
        var toggle = item.querySelector(':scope > .worktree-node .worktree-toggle');
        if (list && toggle) setExpanded(toggle, list, true);
      }
    });
  }
})();
