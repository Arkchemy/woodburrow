/* /findings -- what the teardown has established, and where it was wrong.

   Four tabs over one file, findings.json: findings, corrections, open
   questions, and confirmations of other people's work.

   Things about the data shape, measured rather than assumed:

     * fields are optional and vary. `area`, `why_it_matters`,
       `falsifiable_by`, `disproved_by` and `date` are each on only some
       entries, so every field is rendered only if present -- a template that
       assumes them produces empty labels on most entries.
     * most findings are undated (dating started on 2026-09-13), but nearly
       every correction is dated. So findings are grouped with the dated ones
       first and the rest under "Earlier", while corrections get the full
       timeline: that is where the story of a bug -- theory, disproof,
       correction -- actually lives.
     * a correction's explanation is in `why_it_mattered` on older entries
       and `why` on newer ones. Both are read.
     * `confidence` values the legend does not document are shown with their
       raw name rather than dropped: hiding a confidence level is worse than
       showing an unexplained one.
     * nothing here is HTML. Every value goes through esc() or mdLite(),
       because this is a generated file and a generator is exactly the thing
       that will one day put a < in a title.

   The tabs follow the ARIA tabs pattern: arrow keys move between them, and
   the URL hash (#corrections, #open, #confirmations) selects one, so old
   links to those sections still land in the right place. A #f-<id> hash
   opens the findings tab and scrolls to that card.

   Depends on js/common.js. */

(function () {
    const listEl = document.getElementById("findingsList");
    if (!listEl) return;

    const areaEl   = document.getElementById("fArea");
    const confEl   = document.getElementById("fConf");
    const searchEl = document.getElementById("fSearch");
    const countEl  = document.getElementById("fCount");

    /* Readable names for the machine-readable values in the data. Anything
       not listed falls back to its raw id, so a new area appearing in the
       JSON shows up as itself rather than vanishing from the filter. */
    const AREA_NAME = {
        "graphics": "Graphics", "gx2": "GX2", "loading": "Loading",
        "alchemy-memory": "Alchemy · memory", "alchemy-boot": "Alchemy · boot",
        "alchemy-reflection": "Alchemy · reflection", "cafeos": "Cafe OS",
        "recompiler": "Recompiler", "engine": "Engine", "tooling": "Tooling",
        "assets": "Assets", "wiiu-format": "Wii U formats", "method": "Method"
    };
    const CONF_NAME = {
        "hardware_confirmed": "Hardware confirmed",
        "static_confirmed": "Static, cross-checked",
        "static_single_source": "Static, single source",
        "confirmed": "Confirmed"
    };
    const pretty = (map, v) => map[v] || v;

    const fmtDate = iso => {
        const d = new Date(iso + "T12:00:00Z");
        return isNaN(d) ? iso : d.toLocaleDateString("en-GB",
            { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    };
    const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    /* --- tabs ------------------------------------------------------------ */
    const tabs = Array.from(document.querySelectorAll('.f-tabs [role="tab"]'));
    const TAB_BY_HASH = { corrections: "tab-corrections", open: "tab-open", confirmations: "tab-confirmations", findings: "tab-findings" };

    function selectTab(tab, focus) {
        tabs.forEach(t => {
            const on = t === tab;
            t.setAttribute("aria-selected", on ? "true" : "false");
            t.tabIndex = on ? 0 : -1;
            document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
        });
        if (focus) tab.focus();
        watchReveal();
    }
    tabs.forEach((t, i) => {
        t.addEventListener("click", () => {
            selectTab(t);
            /* replaceState: switching a tab is not navigation, and a history
               entry per click would trap the back button */
            const key = t.id.replace("tab-", "");
            history.replaceState(null, "", key === "findings" ? location.pathname : "#" + key);
        });
        t.addEventListener("keydown", e => {
            let n = null;
            if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
            if (e.key === "ArrowLeft")  n = tabs[(i - 1 + tabs.length) % tabs.length];
            if (e.key === "Home") n = tabs[0];
            if (e.key === "End")  n = tabs[tabs.length - 1];
            if (n) { e.preventDefault(); n.click(); n.focus(); }
        });
    });

    function fromHash() {
        const h = decodeURIComponent(location.hash.slice(1));
        if (!h) return;
        if (TAB_BY_HASH[h]) { selectTab(document.getElementById(TAB_BY_HASH[h])); return; }
        if (h.startsWith("f-")) {
            /* a deep link to one finding: clear the filters so it is certain
               to be rendered, then bring it into view */
            areaEl.value = ""; confEl.value = ""; searchEl.value = "";
            render();
            selectTab(document.getElementById("tab-findings"));
            const el = document.getElementById(h);
            if (el) {
                el.classList.remove("reveal");
                el.scrollIntoView({ block: "start" });
                el.classList.add("is-target");
            }
        }
    }
    addEventListener("hashchange", fromHash);

    /* --- findings ---------------------------------------------------------- */
    let all = [];

    const row = (label, value, cls) =>
        value ? `<p class="f-row${cls ? " " + cls : ""}"><b>${label}</b> ${mdLite(value)}</p>` : "";

    function card(f, i) {
        const conf = f.confidence || "";
        /* The detail and the two falsifiability lines are always visible:
           they are the difference between a finding and an opinion. The rest
           folds away, so fifty cards read as a list rather than a wall. */
        const more = [
            row("How it was established:", f.how_established || f.method_note),
            row("Measured:", f.measured),
            row("Applies to:", f.applies_to),
            row("Prior art checked:", f.discord_prior_art, "f-prior"),
            row("Also worth knowing:", f.also_worth_knowing || f.note)
        ].join("");
        return [
            `<article class="finding reveal" id="f-${esc(f.id || slug(f.title))}" style="--i:${i % 8}" data-conf="${esc(conf)}">`,
            `<header class="f-head">`,
            `<h3>${esc(f.title || f.id || "Untitled")}</h3>`,
            `<p class="f-badges">`,
            f.area ? `<span class="f-badge f-area">${esc(pretty(AREA_NAME, f.area))}</span>` : "",
            conf ? `<span class="f-badge f-conf-${esc(conf)}">${esc(pretty(CONF_NAME, conf))}</span>` : "",
            `</p></header>`,
            TOOLS,
            f.detail ? `<div class="f-detail">${mdLite(f.detail)}</div>` : "",
            row("Why it matters:", f.why_it_matters),
            row("Would be disproved by:", f.falsifiable_by || f.what_would_disprove, "f-falsify"),
            row("Disproved by:", f.disproved_by, "f-falsify"),
            more ? `<details><summary>How we know</summary>${more}</details>` : "",
            `</article>`
        ].join("");
    }

    /* Group by date, newest first; undated entries go last, under "Earlier",
       in the order the file lists them. */
    function grouped(items, render, undatedLabel) {
        const byDate = new Map();
        items.forEach(x => {
            const k = x.date || "";
            if (!byDate.has(k)) byDate.set(k, []);
            byDate.get(k).push(x);
        });
        const keys = Array.from(byDate.keys()).sort((a, b) =>
            (a === "") - (b === "") || b.localeCompare(a));
        let n = 0;
        return keys.map(k => {
            const group = byDate.get(k);
            const head = k
                ? `<h2 class="t-date">${esc(fmtDate(k))}<small>${group.length}</small></h2>`
                : `<h2 class="t-date">${esc(undatedLabel)}<small>${group.length}</small></h2>`;
            return `<section class="t-day">${head}<div class="t-items">` +
                   group.map(x => render(x, n++)).join("") + `</div></section>`;
        }).join("");
    }

    function render() {
        const a = areaEl.value, c = confEl.value;
        const q = searchEl.value.trim().toLowerCase();
        const hit = all.filter(f => {
            if (a && f.area !== a) return false;
            if (c && f.confidence !== c) return false;
            if (!q) return true;
            return JSON.stringify(f).toLowerCase().includes(q);
        });

        countEl.textContent = hit.length === all.length
            ? `${all.length} findings`
            : `${hit.length} of ${all.length}`;

        listEl.innerHTML = hit.length
            ? grouped(hit, card, "Earlier, before entries were dated")
            : '<p class="feed-empty">Nothing matches those filters.</p>';
        watchReveal();
    }

    /* --- corrections, shown as retractions -------------------------------- */
    function correction(c, i) {
        const title = c.id ? c.id.replace(/-/g, " ") : "Correction";
        const why = c.why_it_mattered || c.why;
        return `<article class="correction reveal" style="--i:${i % 8}" id="c-${esc(c.id || "x" + i)}">` +
            `<header class="f-head"><p class="f-badges"><span class="f-badge f-retracted">Retracted</span></p>` +
            `<h3>${esc(title.charAt(0).toUpperCase() + title.slice(1))}</h3></header>` +
            `<div class="c-pair">` +
              (c.was ? `<div class="c-was"><b>We said</b><span class="c-said">${mdLite(c.was)}</span></div>` : "") +
              (c.now ? `<div class="c-now"><b>It was actually</b>${mdLite(c.now)}</div>` : "") +
            `</div>` +
            (why ? `<p class="c-cost"><b>What it cost:</b> ${mdLite(why)}</p>` : "") +
            `</article>`;
    }

    fetch("findings.json" + DATA_V).then(r => r.json()).then(d => {
        all = d.findings || [];
        const corr = d.corrections || [];
        const open = d.open_questions || [];
        const confs = d.confirmations || [];

        document.getElementById("nFindings").textContent = all.length;
        document.getElementById("nCorrections").textContent = corr.length;
        document.getElementById("nOpen").textContent = open.length;
        document.getElementById("nConf").textContent = confs.length;
        if (!confs.length) document.getElementById("tab-confirmations").hidden = true;

        /* The legend, from the data rather than hardcoded, so it cannot drift
           from what the entries actually claim. */
        const legend = document.getElementById("confLegend");
        const how = (d.about && d.about.how_to_read_confidence) || {};
        const used = new Set(all.map(f => f.confidence).filter(Boolean));
        legend.innerHTML = Array.from(used).sort().map(k =>
            `<p class="conf-item"><span class="f-badge f-conf-${esc(k)}">${esc(pretty(CONF_NAME, k))}</span>` +
            `<span>${esc(how[k] || "Not described in the source data.")}</span></p>`
        ).join("");
        const caveat = document.getElementById("findingsCaveat");
        if (caveat && d.about && d.about.caveat) caveat.textContent = d.about.caveat;

        /* Filter options come from the data too. */
        Array.from(new Set(all.map(f => f.area).filter(Boolean))).sort().forEach(x =>
            areaEl.insertAdjacentHTML("beforeend", `<option value="${esc(x)}">${esc(pretty(AREA_NAME, x))}</option>`));
        Array.from(used).sort().forEach(x =>
            confEl.insertAdjacentHTML("beforeend", `<option value="${esc(x)}">${esc(pretty(CONF_NAME, x))}</option>`));
        [areaEl, confEl].forEach(el => el.addEventListener("change", render));
        searchEl.addEventListener("input", render);
        render();

        document.getElementById("corrList").innerHTML = corr.length
            ? grouped(corr, correction, "Undated")
            : '<p class="feed-empty">No corrections recorded.</p>';
        if (d.method_note) {
            document.getElementById("methodText").textContent = d.method_note;
            document.getElementById("methodNote").hidden = false;
        }

        document.getElementById("openList").innerHTML = open.length ? open.map((q, i) =>
            `<article class="finding q-card reveal" style="--i:${i % 8}"${q.id ? ` id="q-${esc(q.id)}"` : ""}>` +
            `<header class="f-head"><h3>${esc(q.question || "")}</h3></header>` +
            (q.detail ? `<div class="f-detail">${mdLite(q.detail)}</div>` : "") +
            row("Why it is still open:", q.why_open) +
            row("What would settle it:", q.how_to_settle, "f-falsify") +
            `</article>`).join("")
            : '<p class="feed-empty">No open questions recorded.</p>';

        document.getElementById("confList").innerHTML = confs.map((c, i) =>
            `<article class="finding reveal" style="--i:${i % 8}">` +
            `<header class="f-head"><h3>${esc(c.title || c.id || "")}</h3></header>` +
            row("Credit:", c.credit) +
            row("Why it is recorded:", c.why_recorded) +
            `</article>`).join("");

        fromHash();
        watchReveal();
    }).catch(() => {
        listEl.innerHTML = '<p class="feed-empty">Findings are unavailable right now.</p>';
    });
})();

/* --- the card toolbar ---------------------------------------------------------
   A small floating toolbar on every finding: copy a link to the card, or hand
   it to the device's share sheet where there is one. It fades in on hover
   and on keyboard focus inside the card. One delegated listener serves all
   of them. */
const TOOLS =
    `<div class="f-tools" role="group" aria-label="This finding">` +
      `<button type="button" data-act="copy"><svg aria-hidden="true"><use href="#i-link"/></svg><span>Copy link</span></button>` +
      (navigator.share ? `<button type="button" data-act="share"><svg aria-hidden="true"><use href="#i-share"/></svg><span>Share</span></button>` : "") +
    `</div>`;

document.addEventListener("click", e => {
    const b = e.target.closest(".f-tools button");
    if (!b) return;
    const card = b.closest(".finding");
    const url = location.origin + location.pathname + "#" + card.id;
    const title = (card.querySelector("h3") || {}).textContent || "Arkchemy finding";
    const label = b.querySelector("span");
    const flash = text => {
        const was = label.textContent;
        label.textContent = text;
        b.classList.add("done");
        setTimeout(() => { label.textContent = was; b.classList.remove("done"); }, 1600);
    };
    if (b.dataset.act === "share") {
        navigator.share({ title, url }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => flash("Copied"), () => flash("Copy failed"));
    } else {
        flash("Copy failed");
    }
});
