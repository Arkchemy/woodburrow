/* The contributors page: who builds Arkchemy, the research and help the port
   leans on, and the beta-tester waiting list pulled live from the Discord
   role. Depends on js/common.js for the element palette and the reveal system.

   Deliberately a readable grid rather than the moving rail on the front page:
   that rail is a glance, this page is the list, and a list you cannot stop to
   read is a worse list. */

const setCount = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };

/* Discord avatars are resolved once per person and then applied to every card
   showing them, since the same person can appear on more than one. */
const resolveAvatars = ids => [...new Set(ids.filter(Boolean))].forEach(id => {
    fetch("/api/discord-avatar?id=" + id).then(r => r.json()).then(d => {
        if (!d || !d.avatar) return;
        document.querySelectorAll(`img[data-discord="${id}"]`).forEach(img => { img.src = d.avatar; });
    }).catch(() => {});
});

/* Roles are stored as "Special Thanks -- Community Research"; on a page whose
   heading already says Special Thanks, only the second half carries meaning.
   The CSV is plain ASCII, so any remaining -- is a dash the file could not
   spell. */
const trimRole = r => (r || "").replace(/^special thanks\s*--\s*/i, "").replace(/ -- /g, " \u2014 ");

function personCard(c, big) {
    const el = document.createElement(c.github ? "a" : "div");
    el.className = "person reveal" + (big ? " person-lead" : "");
    if (c.github) { el.href = c.github; el.target = "_blank"; el.rel = "noopener"; }
    el.style.setProperty("--el", ELEMENT_COLOUR[c.element] || "#b9a9c6");
    const elFile = ELEMENT_FILE[c.element];
    /* The local file renders first so a card is never empty; the Discord
       avatar replaces it once resolved. /api/discord-avatar returns JSON whose
       avatar field is already proxied -- the CSP is img-src 'self', so a
       cdn.discordapp.com URL would be blocked outright. */
    el.innerHTML =
        `<span class="face">` +
          `<img class="pfp" src="images/contributors/${c.slug}.png"` +
          ` data-discord="${c.discordId || ""}" alt="" loading="lazy">` +
          (elFile ? `<img class="elicon" src="images/elements/${elFile}.webp" alt="${c.element}">` : "") +
        `</span>` +
        `<span class="body">` +
          `<span class="p-name fit">${esc(c.name)}</span>` +
          `<span class="p-role fit">${esc(big ? c.role.replace(/ -- /g, " \u2014 ") : trimRole(c.role))}</span>` +
        `</span>` +
        (c.github ? `<span class="p-go" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="15" height="15"><path fill="currentColor" d="M8 0a8 8 0 00-2.5 15.6c.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-1-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1 0-.2-.3-1 .1-2.1 0 0 .7-.2 2.2.8a7.6 7.6 0 014 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3.1-1.8 3.8-3.6 4 .3.3.6.8.6 1.6v2.3c0 .2.1.5.5.4A8 8 0 008 0z"/></svg>
        </span>` : "");
    return el;
}

fetch("contributors.json" + DATA_V).then(r => r.json()).then(list => {
    const core = list.filter(c => c.section !== "special-thanks");
    const thanks = list.filter(c => c.section === "special-thanks");

    setCount("statCore", core.length);
    setCount("statThanks", thanks.length);

    const lede = document.getElementById("contribLede");
    if (lede) lede.textContent = core.length === 1
        ? "Arkchemy is written by one person. Everything below it exists because other people gave their time to it."
        /* not "write the code" -- this group includes format research, which is
           what unblocked the port, and calling that coding would be wrong. */
        : core.length + " people build Arkchemy directly.";

    const grid = document.getElementById("contribGrid");
    core.forEach(c => grid.appendChild(personCard(c, true)));

    const thanksHost = document.getElementById("thanksGrid");
    thanks.forEach((c, i) => {
        const card = personCard(c, false);
        card.style.setProperty("--i", Math.min(i, 12));
        thanksHost.appendChild(card);
    });

    resolveAvatars(list.map(c => c.discordId));
    watchReveal();
    fitText();
}).catch(() => {
    const grid = document.getElementById("contribGrid");
    if (grid) grid.innerHTML = '<p class="feed-empty">The contributor list is unavailable right now.</p>';
});

/* --- the beta-tester waiting list, from the Discord role ---------------- */
fetch("/api/discord-role?role=testers").then(r => r.json()).then(d => {
    const host = document.getElementById("testerGrid");
    const lede = document.getElementById("testerLede");
    if (d.error) {
        host.innerHTML = '<p class="feed-empty">' +
            (d.hint ? "The tester list is unavailable: " + esc(d.hint) + "."
                    : "The tester list is unavailable right now.") + '</p>';
        return;
    }
    if (!d.members || !d.members.length) {
        host.innerHTML = '<p class="feed-empty">Nobody has signed up yet.</p>';
        return;
    }
    setCount("statTesters", d.count);
    if (lede) lede.textContent = d.count + " " + (d.count === 1 ? "person is" : "people are") +
        " signed up to test as soon as a build is ready. Builds are not released publicly.";
    d.members.forEach((t, i) => {
        const el = document.createElement("div");
        el.className = "tester reveal";
        el.style.setProperty("--i", Math.min(i, 12));
        el.innerHTML =
            (t.avatar ? `<img src="${t.avatar}" alt="" loading="lazy">`
                      : `<span class="noav">${esc(t.name.slice(0, 1).toUpperCase())}</span>`) +
            `<span class="tname fit">${esc(t.name)}</span>`;
        host.appendChild(el);
    });
    watchReveal();
    fitText();
}).catch(() => {
    const host = document.getElementById("testerGrid");
    if (host) host.innerHTML = '<p class="feed-empty">The tester list is unavailable right now.</p>';
});
