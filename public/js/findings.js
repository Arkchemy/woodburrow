/* /findings -- what the teardown has established, and where it was wrong.

   findings.json is generated alongside the work and had never been rendered:
   44 findings, 8 open questions and 17 corrections sitting in a file nobody
   could read. This page is that file.

   Three things about the data shape, all measured rather than assumed:

     * fields are optional and vary. `area` is on 40 of 44, `why_it_matters` on
       29, `falsifiable_by` on 10, `disproved_by` on 6, `date` on 1. Every
       field is therefore rendered only if present -- a template that assumes
       them produces empty labels on most entries.
     * `confidence` carries three values in the data (hardware_confirmed,
       static_confirmed, confirmed) but the legend documents a different three
       -- `confirmed` is undocumented and `static_single_source` is unused. The
       undocumented one is shown with its raw name rather than dropped, since
       hiding a confidence level is worse than showing an unexplained one.
     * nothing here is HTML. Every value goes through esc(), because this is a
       generated file and a generator is exactly the thing that will one day
       put a < in a title.

   Depends on js/common.js. */

(function () {
    const listEl = document.getElementById("findingsList");
    if (!listEl) return;

    const areaEl   = document.getElementById("fArea");
    const confEl   = document.getElementById("fConf");
    const searchEl = document.getElementById("fSearch");
    const countEl  = document.getElementById("fCount");

    /* Readable names for the machine-readable values in the data. Anything not
       listed falls back to its raw id, so a new area appearing in the JSON
       shows up as itself rather than vanishing from the filter. */
    const AREA_NAME = {
        "graphics": "Graphics", "gx2": "GX2", "alchemy-memory": "Alchemy · memory",
        "alchemy-boot": "Alchemy · boot", "alchemy-reflection": "Alchemy · reflection",
        "cafeos": "Cafe OS", "recompiler": "Recompiler", "engine": "Engine",
        "tooling": "Tooling", "assets": "Assets", "wiiu-format": "Wii U formats",
        "method": "Method"
    };
    const CONF_NAME = {
        "hardware_confirmed": "Hardware confirmed",
        "static_confirmed": "Static, cross-checked",
        "static_single_source": "Static, single source",
        "confirmed": "Confirmed"
    };
    const pretty = (map, v) => map[v] || v;

    let all = [];

    const row = (label, value, cls) =>
        value ? `<p class="f-row${cls ? " " + cls : ""}"><b>${label}</b> ${mdLite(value)}</p>` : "";

    function card(f, i) {
        const conf = f.confidence || "";
        const parts = [
            `<article class="finding reveal" style="--i:${i % 12}" data-conf="${esc(conf)}">`,
            `<header class="f-head">`,
            `<h3>${esc(f.title || f.id || "Untitled")}</h3>`,
            `<p class="f-badges">`,
            f.area ? `<span class="f-badge f-area">${esc(pretty(AREA_NAME, f.area))}</span>` : "",
            conf ? `<span class="f-badge f-conf f-conf-${esc(conf)}">${esc(pretty(CONF_NAME, conf))}</span>` : "",
            f.date ? `<span class="f-badge f-date">${esc(f.date)}</span>` : "",
            `</p></header>`,
            f.detail ? `<div class="f-detail">${mdLite(f.detail)}</div>` : "",
            row("Why it matters:", f.why_it_matters),
            row("How it was established:", f.how_established || f.method_note),
            row("Measured:", f.measured),
            row("Applies to:", f.applies_to),
            /* The two that make a claim falsifiable are given their own
               styling: they are the difference between a finding and an
               opinion, and they should not read as footnotes. */
            row("Would be disproved by:", f.falsifiable_by || f.what_would_disprove, "f-falsify"),
            row("Disproved by:", f.disproved_by, "f-falsify"),
            row("Prior art checked:", f.discord_prior_art, "f-prior"),
            row("Also worth knowing:", f.also_worth_knowing || f.note),
            `</article>`
        ];
        return parts.join("");
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
            : `${hit.length} of ${all.length} findings`;

        listEl.innerHTML = hit.length
            ? hit.map(card).join("")
            : '<p class="feed-empty">Nothing matches those filters.</p>';
        watchReveal();
    }

    fetch("findings.json" + DATA_V).then(r => r.json()).then(d => {
        all = d.findings || [];

        /* The legend, from the data rather than hardcoded, so it cannot drift
           from what the entries actually claim. */
        const legend = document.getElementById("confLegend");
        const how = (d.about && d.about.how_to_read_confidence) || {};
        const used = new Set(all.map(f => f.confidence).filter(Boolean));
        legend.innerHTML = Array.from(used).sort().map(k =>
            `<p class="conf-item"><span class="f-badge f-conf f-conf-${esc(k)}">${esc(pretty(CONF_NAME, k))}</span>` +
            `<span>${esc(how[k] || "Not described in the source data.")}</span></p>`
        ).join("");

        const caveat = document.getElementById("findingsCaveat");
        if (caveat && d.about && d.about.caveat) caveat.textContent = d.about.caveat;

        /* Filter options come from the data too. */
        const areas = Array.from(new Set(all.map(f => f.area).filter(Boolean))).sort();
        areas.forEach(x => areaEl.insertAdjacentHTML("beforeend",
            `<option value="${esc(x)}">${esc(pretty(AREA_NAME, x))}</option>`));
        Array.from(used).sort().forEach(x => confEl.insertAdjacentHTML("beforeend",
            `<option value="${esc(x)}">${esc(pretty(CONF_NAME, x))}</option>`));

        [areaEl, confEl].forEach(el => el.addEventListener("change", render));
        searchEl.addEventListener("input", render);
        render();

        /* Open questions. */
        const openEl = document.getElementById("openList");
        const open = d.open_questions || [];
        openEl.innerHTML = open.length ? open.map((q, i) =>
            `<article class="finding reveal" style="--i:${i % 12}">` +
            `<header class="f-head"><h3>${esc(q.question || "")}</h3></header>` +
            (q.detail ? `<div class="f-detail">${mdLite(q.detail)}</div>` : "") +
            `</article>`).join("")
            : '<p class="feed-empty">No open questions recorded.</p>';

        /* Corrections. was -> now -> what it cost, in that order, because the
           cost is the part that makes the entry worth having. */
        const corrEl = document.getElementById("corrList");
        const corr = d.corrections || [];
        corrEl.innerHTML = corr.length ? corr.map((c, i) =>
            `<article class="correction reveal" style="--i:${i % 12}">` +
            `<header class="f-head">` +
            `<h3>${esc((c.id || "").replace(/-/g, " ") || "Correction")}</h3>` +
            (c.date ? `<p class="f-badges"><span class="f-badge f-date">${esc(c.date)}</span></p>` : "") +
            `</header>` +
            (c.was ? `<p class="c-was"><b>We said</b> ${mdLite(c.was)}</p>` : "") +
            (c.now ? `<p class="c-now"><b>Actually</b> ${mdLite(c.now)}</p>` : "") +
            (c.why_it_mattered ? `<p class="c-cost"><b>What it cost</b> ${mdLite(c.why_it_mattered)}</p>` : "") +
            `</article>`).join("")
            : '<p class="feed-empty">No corrections recorded.</p>';

        watchReveal();
    }).catch(() => {
        listEl.innerHTML = '<p class="feed-empty">Findings are unavailable.</p>';
    });
})();
