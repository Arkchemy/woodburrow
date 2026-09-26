/* The front page: what this is, where it stands, and a glance at the newest
   progress, findings and people.

   Everything here is a pointer somewhere else. The full build log is
   /progress, the findings are /findings, the people are /contributors -- the
   front page's job is to say what this is and show enough that the rest is
   worth a click, not to be a worse copy of four other pages.

   The six stages are plain HTML in index.html rather than data: they change
   about once a month, and a page whose most important section needs
   JavaScript to exist is a worse page. The text around them -- what is being
   worked on now and what comes next -- comes from progress.json, which is
   regenerated alongside the work. Depends on js/common.js. */

const fmtDate = iso => {
    const d = new Date(iso + (iso.length === 10 ? "T12:00:00Z" : ""));
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/* --- now and next, from progress.json ------------------------------------
   Only the prose fields. The percentages in that file were withdrawn from
   the site on 2026-09-20 -- loading turned out to be non-deterministic, so
   no single figure was defensible -- and they are deliberately not read. */
fetch("progress.json" + DATA_V).then(r => r.json()).then(d => {
    const cw = d.current_work;
    if (cw) {
        if (cw.title) document.getElementById("nowTitle").textContent = cw.title;
        if (cw.detail) document.getElementById("nowDetail").textContent = cw.detail;
        const meta = document.getElementById("nowMeta");
        const bits = [];
        if (cw.repo) bits.push(`In <a href="https://github.com/Arkchemy/${esc(cw.repo)}">${esc(cw.repo)}</a>`);
        if (d.generated_at) bits.push("as of " + esc(fmtDate(d.generated_at)));
        meta.innerHTML = bits.join(" &middot; ");
    }

    const list = document.getElementById("nextList");
    (d.next_work || []).slice(0, 3).forEach(n => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${esc(n.name || "")}</b>` + (n.detail ? `<span>${esc(n.detail)}</span>` : "");
        list.appendChild(li);
    });
    if (!list.children.length) list.closest(".next-card").hidden = true;

    const chip = document.getElementById("heroNow");
    if (chip && d.generated_at) {
        chip.textContent = "Current wall: loading · updated " + fmtDate(d.generated_at);
        chip.hidden = false;
    }
}).catch(() => {});

/* --- the newest progress posts, live from Discord --------------------------
   Through /api/discord-channel, which holds the bot token server-side and
   only accepts the two channel names. Three posts: enough to show the log is
   alive, few enough that the page does not become the log. */
fetch("/api/discord-channel?channel=progress").then(r => r.json()).then(d => {
    const host = document.getElementById("progressFeed");
    if (!d.messages || !d.messages.length) { host.innerHTML = feedEmpty(d); return; }
    d.messages.slice().reverse().slice(0, 3).forEach((m, i) => {
        const el = document.createElement("article");
        el.className = "post reveal";
        el.style.setProperty("--i", i);
        el.innerHTML =
            `<header>` +
              (m.author.avatar ? `<img src="${m.author.avatar}" alt="" loading="lazy">` : `<span class="noav"></span>`) +
              `<b>${withEmoji(esc(m.author.name))}</b><time datetime="${m.timestamp}">${timeAgo(m.timestamp)}</time>` +
            `</header><div class="body">${mdLite(m.content)}</div>`;
        host.appendChild(el);
    });
    watchReveal();
}).catch(() => { document.getElementById("progressFeed").innerHTML =
    '<p class="feed-empty">The progress feed is unavailable right now.</p>'; });

/* --- the newest findings ------------------------------------------------------
   Undated entries predate dating and sort after every dated one. Each links
   to its own card on /findings, which carries the id as its anchor. */
const CONF_SHORT = {
    hardware_confirmed: "Hardware confirmed",
    static_confirmed: "Static, cross-checked",
    static_single_source: "Static, single source",
    confirmed: "Confirmed"
};
fetch("findings.json" + DATA_V).then(r => r.json()).then(d => {
    const host = document.getElementById("latestFindings");
    const all = (d.findings || []).map((f, i) => ({ f, i }));
    all.sort((a, b) => (b.f.date || "").localeCompare(a.f.date || "") || a.i - b.i);
    all.slice(0, 4).forEach(({ f }, i) => {
        const a = document.createElement("a");
        a.className = "mini-f reveal";
        a.style.setProperty("--i", i);
        a.href = "/findings#f-" + encodeURIComponent(f.id || "");
        a.innerHTML =
            `<p class="f-badges">` +
              (f.date ? `<span class="f-badge f-date">${esc(fmtDate(f.date))}</span>` : "") +
              (f.confidence ? `<span class="f-badge f-conf-${esc(f.confidence)}">${esc(CONF_SHORT[f.confidence] || f.confidence)}</span>` : "") +
            `</p><b>${esc(f.title || f.id || "")}</b>`;
        host.appendChild(a);
    });
    watchReveal();

    // the live totals for the stats band, before it counts up
    const setStat = (id, n) => { const el = document.getElementById(id); if (el) { el.dataset.to = n; el.textContent = n.toLocaleString("en-GB"); } };
    setStat("statFindings", (d.findings || []).length);
    setStat("statCorrections", (d.corrections || []).length);

    // the marquee: every finding, split across two rows
    const titled = (d.findings || []).filter(f => f.title);
    fillMarquee(document.getElementById("marqueeA"), titled.filter((_, i) => i % 2 === 0));
    fillMarquee(document.getElementById("marqueeB"), titled.filter((_, i) => i % 2 === 1));
}).catch(() => {
    document.getElementById("latestFindings").innerHTML = '<p class="feed-empty">Findings are unavailable right now.</p>';
    document.querySelectorAll(".marquee-band").forEach(b => { b.hidden = true; });
});

/* --- the findings marquee ----------------------------------------------------
   One track holding the titles twice; CSS slides it by exactly half its
   width and loops, so the seam never shows. The second copy is hidden from
   assistive technology and from tabbing, so each finding is announced and
   focusable once. Hover or focus pauses it (CSS). */
function fillMarquee(host, list) {
    if (!host || !list.length) return;
    const track = document.createElement("div");
    track.className = "marquee-track";
    const item = (f, dup) => {
        const a = document.createElement("a");
        a.className = "marquee-item";
        a.href = "/findings#f-" + encodeURIComponent(f.id || "");
        a.innerHTML = `<span class="marquee-conf f-conf-${esc(f.confidence || "")}" aria-hidden="true"></span>${esc(f.title)}`;
        if (dup) { a.tabIndex = -1; a.setAttribute("aria-hidden", "true"); }
        return a;
    };
    list.forEach(f => track.appendChild(item(f, false)));
    list.forEach(f => track.appendChild(item(f, true)));
    // the same speed whatever the row's length: about 60px a second
    host.style.setProperty("--dur", Math.max(30, Math.round(list.length * 260 / 60)) + "s");
    host.appendChild(track);
}

/* --- the stats band: count up once, on first sight -----------------------------
   The number is already in the markup, so this only animates it. Nothing
   moves with reduced motion. */
{
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const run = el => {
        const to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0), suffix = el.dataset.suffix || "";
        if (!isFinite(to)) return;
        const fmt = v => v.toLocaleString("en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
        const t0 = performance.now(), dur = 1400;
        const step = now => {
            const t = Math.min(1, (now - t0) / dur);
            const e = 1 - Math.pow(1 - t, 4);
            el.textContent = fmt(to * e);
            if (t < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
        };
        requestAnimationFrame(step);
    };
    const ticks = document.querySelectorAll(".tick");
    if (!reduce && ticks.length && "IntersectionObserver" in window) {
        const io = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting) { io.unobserve(e.target); run(e.target); }
        }), { threshold: 0.6 });
        ticks.forEach(t => io.observe(t));
    }
}

/* --- the elements orbit ----------------------------------------------------------
   Spyro's Adventure: eight elements, four Skylanders each. The emblems
   circle the portal (CSS, paused while the pointer or focus is on it);
   choosing one lists its four in the centre, each linking to its card on
   /skylanders. The roster comes from rosters.json. */
fetch("rosters.json" + DATA_V).then(r => r.json()).then(d => {
    const orbit = document.getElementById("orbit");
    const ssa = d.games && d.games.ssa && d.games.ssa.roster;
    if (!orbit || !ssa) return;
    const name = document.getElementById("orbitName");
    const crew = document.getElementById("orbitCrew");
    const buttons = orbit.querySelectorAll(".orb-el");
    const pick = btn => {
        const el = btn.dataset.el;
        buttons.forEach(b => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        orbit.style.setProperty("--el", ELEMENT_COLOUR[el] || "var(--gold)");
        orbit.classList.add("picked");
        name.textContent = el;
        crew.innerHTML = (ssa[el] || []).map(c =>
            `<li><a href="/skylanders?game=ssa&amp;s=${encodeURIComponent(c.slug)}">` +
            `<img src="images/characters/${esc(c.icon || c.slug)}.png" alt="" loading="lazy" width="56" height="56">` +
            `<span>${esc(c.name)}</span></a></li>`).join("");
    };
    buttons.forEach(b => {
        b.style.setProperty("--c", ELEMENT_COLOUR[b.dataset.el] || "#888");
        b.addEventListener("click", () => pick(b));
    });
}).catch(() => {});

/* --- the people, in brief ---------------------------------------------------
   The core contributors only. Special thanks and the beta-tester list are
   their own sections on /contributors. */
fetch("contributors.json" + DATA_V).then(r => r.json()).then(list => {
    const host = document.getElementById("peopleGrid");
    if (!host) return;
    const core = list.filter(c => c.section !== "special-thanks");
    const lede = document.getElementById("peopleLede");
    if (lede && core.length > 1)
        lede.textContent = core.length + " people build Arkchemy directly, with a lot of others behind them.";

    core.forEach(c => {
        const el = document.createElement(c.github ? "a" : "div");
        el.className = "person person-lead reveal";
        if (c.github) { el.href = c.github; el.target = "_blank"; el.rel = "noopener"; }
        el.style.setProperty("--el", ELEMENT_COLOUR[c.element] || "#b9a9c6");
        const elFile = ELEMENT_FILE[c.element];
        el.innerHTML =
            `<span class="face">` +
              `<img class="pfp" src="images/contributors/${c.slug}.png"` +
              ` data-discord="${c.discordId || ""}" alt="" loading="lazy">` +
              (elFile ? `<img class="elicon" src="images/elements/${elFile}.webp" alt="${c.element}">` : "") +
            `</span>` +
            `<span class="body">` +
              `<span class="p-name fit">${esc(c.name)}</span>` +
              `<span class="p-role fit">${esc(c.role.replace(/ -- /g, " — "))}</span>` +
            `</span>`;
        host.appendChild(el);

        if (c.discordId) {
            fetch("/api/discord-avatar?id=" + c.discordId).then(r => r.json()).then(d => {
                if (!d || !d.avatar) return;
                el.querySelectorAll("img.pfp").forEach(img => { img.src = d.avatar; });
            }).catch(() => {});
        }
    });
    watchReveal();
    fitText();
}).catch(() => {});
