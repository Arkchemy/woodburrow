/* Data files change more often than the page; without a version the
       browser serves a stale copy and new fields silently go missing. The
       stamp is the newest data-file mtime -- a date alone does not bust the
       cache when the data is regenerated the same day. Refresh it with
       tools/stamp.py after changing any .json here. */
    const DATA_V = "?v=1788656736";

    /* Data files change more often than the page; without a version the
       browser serves a stale copy and new fields silently go missing. The
       stamp is the newest data-file mtime -- a date alone does not bust the
       cache when the data is regenerated the same day. Refresh it with
       tools/stamp.py after changing any .json here. */

/* --- the roster, per game ------------------------------------------- */
    const ELEMENT_COLOUR = {
        Magic:"#a763d8", Tech:"#e8942e", Fire:"#e34a2c", Water:"#2b9fd8",
        Earth:"#b07b3e", Air:"#7fc9e8", Life:"#63b64a", Undead:"#8d8ab8",
        Light:"#f0d264", Dark:"#5b5470"
    };
    const ELEMENT_FILE = { Magic:"magic", Tech:"tech", Fire:"fire", Water:"water",
                           Earth:"earth", Air:"air", Life:"life", Undead:"undead",
                           Light:"light", Dark:"dark" };
    const ORDER = ["Magic","Tech","Fire","Water","Earth","Air","Life","Undead","Light","Dark"];
    const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    let DATA = null;        /* rosters.json */
    let GAME = "ssa";       /* selected game */
    let VISIBLE = [];       /* flat list of the selected game's characters */
    let scIndex = 0;
    const audioEl = new Audio();
    const SC = document.getElementById("showcase");

    fetch("rosters.json" + DATA_V).then(r => r.json()).then(d => {
        DATA = d;
        const tabs = document.getElementById("gameTabs");
        d.order.forEach(g => {
            const b = document.createElement("button");
            b.type = "button";
            b.dataset.game = g;
            b.innerHTML = d.games[g].title + "<small>" + d.games[g].count + " Skylanders</small>";
            b.addEventListener("click", () => selectGame(g));
            tabs.appendChild(b);
        });
        selectGame("ssa");

        document.getElementById("randomPick").addEventListener("click", () => {
            if (!VISIBLE.length) return;
            showcase(Math.floor(Math.random() * VISIBLE.length), true);
        });
    });

    function selectGame(g) {
        GAME = g;
        document.querySelectorAll("#gameTabs button").forEach(b =>
            b.setAttribute("aria-pressed", b.dataset.game === g ? "true" : "false"));

        const game = DATA.games[g];
        VISIBLE = [];
        const host = document.getElementById("elements");
        host.innerHTML = "";

        ORDER.filter(el => game.roster[el]).forEach(el => {
            const colour = ELEMENT_COLOUR[el] || "#888";
            const group = document.createElement("section");
            group.className = "el-group";
            group.style.setProperty("--el", colour);
            group.innerHTML =
                `<div class="el-row"></div>` +
                `<div class="el-mark">` +
                `<img src="images/elements/${ELEMENT_FILE[el] || "magic"}.webp" alt="">` +
                `<span>${el}</span></div>`;
            const row = group.querySelector(".el-row");

            /* Only figures actually introduced in this game. The wiki groups
               carry-overs under "Returning Skylanders", which is why Bouncer
               was showing under Swap Force -- he is a Giants figure. */
            let members = game.roster[el].filter(c => c.category !== "Returning");

            /* SuperChargers splits into drivers and vehicles. Keep them in the
               same element row, drivers first, with a diamond between. */
            const vehicles = members.filter(c => c.category === "Vehicle");
            const others   = members.filter(c => c.category !== "Vehicle");
            members = vehicles.length ? others.concat(vehicles) : members;
            const splitAt = vehicles.length ? others.length : -1;

            members.forEach((c, i) => {
                if (i === splitAt) {
                    const sep = document.createElement("span");
                    sep.className = "el-split";
                    sep.title = "Vehicles";
                    row.appendChild(sep);
                }
                c.element = c.element || el;
                const idx = VISIBLE.push(c) - 1;
                const b = document.createElement("button");
                b.className = "chip reveal";
                b.style.animationDelay = Math.min(i * 0.04, 0.4) + "s";
                b.innerHTML =
                    `<img src="images/roster/${c.icon}.png" alt="" loading="lazy">` +
                    `<span class="${c.audio ? "has-audio" : ""}">${c.name}</span>`;
                b.dataset.cat = c.category || "Core";
                if (c.category && c.category !== "Core") b.classList.add("special");
                b.addEventListener("click", () => showcase(idx, true));
                row.appendChild(b);
            });
            host.appendChild(group);
        });

        showcase(0);
        updateNote();
        watchReveal();
    }

    /* How many of the Skylanders currently on screen have their catchphrase. */
    function updateNote() {
        const withAudio = VISIBLE.filter(c => c.audio).length;
        const detail = VISIBLE.filter(c => c.detail).length;
        document.getElementById("voiceNote").textContent =
            GAME === "ssa"
                ? withAudio + " of " + VISIBLE.length + " have their catchphrase — " +
                  VISIBLE.filter(c => c.voTier === "reduced").length +
                  " others shipped combat barks only."
                : VISIBLE.length + " Skylanders — " + detail +
                  " carried over from Spyro’s Adventure, which is the game we have data for.";
    }

    /* --- the showcase carousel ----------------------------------------
       Hero centre stage with the loadout cards flying in from the sides,
       the Fortnite battle-pass treatment. */
    function showcase(i, autoplay) {
        if (!VISIBLE.length) return;
        scIndex = (i + VISIBLE.length) % VISIBLE.length;
        const c = VISIBLE[scIndex];
        const colour = ELEMENT_COLOUR[c.element] || "#888";
        const crest = "images/elements/" + (ELEMENT_FILE[c.element] || "magic") + ".webp";

        SC.hidden = false;
        SC.style.setProperty("--el", colour);

        /* Re-trigger the fly-in on every change. Reading offsetWidth flushes
           the "from" state, so the class can go straight back on -- doing this
           in rAF would never fire while the tab is in the background. */
        SC.classList.remove("ready");
        void SC.offsetWidth;
        SC.classList.add("ready");

        /* Only Spyro's Adventure has the big promotional renders; everyone
           else falls back to their roster portrait. */
        const hero = document.getElementById("s-hero");
        hero.classList.add("swap");
        const next = new Image();
        /* transparent render first, then the Spyro's Adventure promo art,
           then the roster portrait */
        const wanted = c.render ? "images/renders/" + c.render + ".png"
                     : c.detail ? "images/characters/" + c.slug + ".png"
                                : "images/roster/" + c.icon + ".png";
        next.onload  = () => { hero.src = next.src; hero.alt = c.name; hero.classList.remove("swap"); };
        next.onerror = () => { hero.src = "images/roster/" + c.icon + ".png";
                               hero.classList.remove("swap"); };
        next.src = wanted;
        hero.classList.toggle("portrait-only", !c.render && !c.detail);

        document.getElementById("s-emblem").src = crest;
        document.getElementById("s-emblem").alt = c.element + " emblem";
        document.getElementById("s-face").src = "images/roster/" + c.icon + ".png";
        document.getElementById("s-face").alt = c.name;
        document.getElementById("s-el").textContent = c.element;
        document.getElementById("s-name").textContent = c.name;
        document.getElementById("s-catch").textContent =
            c.catchphrase ? "“" + c.catchphrase + "”" : "—";

        /* Play the catchphrase on arrival, but only when the move came from a
           click or key -- autoplay before any interaction is blocked, and it
           would be rude on first paint. */
        if (autoplay && c.audio) play(c);

        const facts = document.getElementById("s-facts");
        facts.innerHTML = "";
        [["Species", c.species], ["Gender", c.gender], ["Role", c.role]]
            .filter(([, v]) => v)
            .forEach(([k, v]) => facts.insertAdjacentHTML("beforeend",
                `<dt>${k}</dt><dd>${v}</dd>`));
        if (!c.detail) facts.innerHTML = "";
        if (c.category) facts.insertAdjacentHTML("afterbegin",
            `<dt>Type</dt><dd>${c.category}</dd>`);
        if (c.variantOf) facts.insertAdjacentHTML("beforeend",
            `<dt>Variant of</dt><dd>${c.variantOf}</dd>`);
        if (!c.detail && !facts.querySelector("dd"))
            facts.innerHTML = `<dt>Debut</dt><dd>${DATA.games[GAME].title}</dd>`;

        /* Attacks, soul gem and Wow Pow, straight off the character's
           ability box. Variants inherit their base character's moveset. */
        const mv = document.getElementById("s-moves");
        const mvCard = document.getElementById("s-moves-card");
        mv.innerHTML = "";
        if (c.moves && c.moves.length) {
            mvCard.hidden = false;
            c.moves.forEach(m => {
                const li = document.createElement("li");
                li.innerHTML = `<b>${m.name}</b><i>${m.kind}</i>` +
                               (m.desc ? `<span>${m.desc}</span>` : "");
                mv.appendChild(li);
            });
        } else { mvCard.hidden = true; }

        const pb = document.getElementById("s-play");
        pb.disabled = !c.audio;
        /* 20 of the 32 ship combat barks only (27-44 clips vs 78-113 for the
           full-voice cast); their catchphrase was never in the Wii data, so
           say that rather than implying a recording is merely pending. */
        pb.textContent = c.audio ? "▶ Play"
            : (c.voTier === "reduced" ? "Not in the Wii data"
               : c.detail ? "No recording yet" : "No audio ripped yet");
        pb.title = c.audio ? "" : (c.voTier === "reduced"
            ? `Only ${c.voClips} combat barks shipped for this Skylander — no catchphrase recording exists on the disc.`
            : "");
        pb.onclick = () => play(c);
    }

    SC.querySelector(".prev").addEventListener("click", () => showcase(scIndex - 1, true));
    SC.querySelector(".next").addEventListener("click", () => showcase(scIndex + 1, true));
    document.addEventListener("keydown", e => {
        if (SC.hidden) return;
        if (e.key === "ArrowLeft")  showcase(scIndex - 1, true);
        if (e.key === "ArrowRight") showcase(scIndex + 1, true);
    });


    /* --- contributors ---------------------------------------------------
       Built from CONTRIBUTORS.csv (exported to contributors.json). The rail
       duplicates the list once so the marquee loops without a seam. */
    fetch("contributors.json" + DATA_V).then(r => r.json()).then(list => {
        const grid = document.getElementById("contribGrid");
        const lede = document.getElementById("contribLede");
        if (!list.length) { grid.innerHTML = ""; return; }

        const core = list.filter(c => c.section !== "special-thanks");
        const thanks = list.filter(c => c.section === "special-thanks");
        lede.textContent = list.length + " people have put work into Arkchemy" +
            (thanks.length ? ", including " + thanks.length +
             " whose reverse-engineering of the Alchemy engine the port leans on." : ".");

        /* A plain card: avatar left with an element-coloured ring, name and
           role right, element symbol badged on the avatar. The supplied frame
           art is 317x188 in teal and does not compose against this palette --
           the pieces overlapped the nameplate and buried the name. */
        const card = c => {
            const el = c.github ? document.createElement("a") : document.createElement("div");
            el.className = "contrib-card reveal";
            if (c.github) { el.href = c.github; el.target = "_blank"; el.rel = "noopener"; }
            el.style.setProperty("--el", ELEMENT_COLOUR[c.element] || "#b9a9c6");
            const elFile = ELEMENT_FILE[c.element];
            el.innerHTML =
                `<span class="face">` +
                  `<img class="pfp" src="images/contributors/${c.slug}.png" alt="" loading="lazy">` +
                  (elFile ? `<img class="elicon" src="images/elements/${elFile}.webp" alt="${c.element}">` : "") +
                `</span>` +
                `<span class="body">` +
                  `<span class="cname">${c.name}</span>` +
                  `<span class="crole">${c.role}</span>` +
                  (c.section === "special-thanks" ? `<span class="tag">Special thanks</span>` : "") +
                `</span>`;
            return el;
        };

        const track = document.createElement("div");
        track.className = "contrib-track";
        /* twice through: the animation translates by -50%, so the second copy
           is exactly where the first was when it wraps */
        [...core, ...thanks, ...core, ...thanks].forEach(c => track.appendChild(card(c)));
        grid.appendChild(track);
    }).catch(() => {});


    /* "0 messages" has three causes and they look identical on the page, so
       say which one it is instead of a generic empty state. */
    const feedEmpty = d => {
        if (d && d.needsMessageContentIntent) return '<p class="feed-empty"><b>Message Content Intent is off.</b> ' +
            'Discord returned ' + d.fetched + ' message' + (d.fetched === 1 ? '' : 's') +
            ' but blanked the text. Enable it on the bot at ' +
            '<a href="https://discord.com/developers/applications" target="_blank" rel="noopener">' +
            'discord.com/developers/applications</a> \u2192 Bot \u2192 Privileged Gateway Intents \u2192 ' +
            'Message Content Intent.</p>';
        if (d && d.fetched === 0) return '<p class="feed-empty">Nothing posted in that channel yet.</p>';
        return '<p class="feed-empty">Nothing to show right now.</p>';
    };

    /* --- live from Discord ------------------------------------------------
       Both come through /api/discord-channel, which holds the bot token
       server-side and only accepts the two channel names. */
    const timeAgo = iso => {
        const secs = (Date.now() - new Date(iso)) / 1000;
        const steps = [[31536000,"y"],[2592000,"mo"],[604800,"w"],[86400,"d"],[3600,"h"],[60,"m"]];
        for (const [n, unit] of steps) if (secs >= n) return Math.floor(secs / n) + unit + " ago";
        return "just now";
    };
    const esc = t => { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; };
    /* Discord markdown, only the parts that actually appear in these channels. */
    const mdLite = t => esc(t)
        .replace(/```([\s\S]*?)```/g, (_, c) => `<pre>${c.trim()}</pre>`)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
        .replace(/^&gt; ?(.*)$/gm, "<blockquote>$1</blockquote>")
        .replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)
        .replace(/\n/g, "<br>");

    fetch("/api/discord-channel?channel=progress").then(r => r.json()).then(d => {
        const host = document.getElementById("progressFeed");
        if (!d.messages || !d.messages.length) { host.innerHTML = feedEmpty(d); return; }
        d.messages.slice().reverse().forEach((m, i) => {
            const el = document.createElement("article");
            el.className = "post reveal";
            el.style.setProperty("--i", i);
            el.innerHTML =
                `<header>` +
                  (m.author.avatar ? `<img src="${m.author.avatar}" alt="" loading="lazy">` : `<span class="noav"></span>`) +
                  `<b>${esc(m.author.name)}</b><time datetime="${m.timestamp}">${timeAgo(m.timestamp)}</time>` +
                `</header><div class="body">${mdLite(m.content)}</div>` +
                m.attachments.map(a => `<img class="shot" src="${a.url}" alt="" loading="lazy">`).join("");
            host.appendChild(el);
        });
        watchReveal();
    }).catch(() => { document.getElementById("progressFeed").innerHTML =
        '<p class="feed-empty">Progress feed is unavailable.</p>'; });

    fetch("/api/discord-channel?channel=faq").then(r => r.json()).then(d => {
        const host = document.getElementById("faqList");
        if (!d.messages || !d.messages.length) { host.innerHTML = feedEmpty(d); return; }
        d.messages.forEach((m, i) => {
            /* "**Question?** answer" is how these are written in the channel;
               fall back to the first line when they are not. */
            const bold = m.content.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
            const q = bold ? bold[1] : m.content.split("\n")[0];
            const a = bold ? bold[2] : m.content.split("\n").slice(1).join("\n");
            const el = document.createElement("details");
            el.className = "qa reveal";
            el.style.setProperty("--i", i);
            el.innerHTML = `<summary>${esc(q)}</summary><div class="qa-body">${mdLite(a || "")}</div>`;
            host.appendChild(el);
        });
        watchReveal();
    }).catch(() => { document.getElementById("faqList").innerHTML =
        '<p class="feed-empty">FAQ is unavailable.</p>'; });

    /* --- licence, straight from the repository --------------------------- */
    const LIC_REPOS = ["woodburrow", "conquertron", "jouster", "blaster", "armory"];
    {
        const tabs = document.getElementById("licTabs");
        const body = document.getElementById("licBody");
        const load = repo => {
            tabs.querySelectorAll("button").forEach(b =>
                b.setAttribute("aria-pressed", b.dataset.repo === repo ? "true" : "false"));
            body.textContent = "Loading\u2026";
            fetch(`/api/license?repo=${repo}`).then(r => r.json())
                .then(d => { body.textContent = d.text || "Unavailable."; })
                .catch(() => { body.textContent = "Licence is unavailable right now."; });
        };
        LIC_REPOS.forEach(repo => {
            const b = document.createElement("button");
            b.type = "button"; b.dataset.repo = repo; b.textContent = repo;
            b.addEventListener("click", () => load(repo));
            tabs.appendChild(b);
        });
        load("woodburrow");
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("main > h2, main > .lede").forEach((el, i) => {
            el.classList.add("reveal"); el.style.setProperty("--i", i % 4);
        });
        watchReveal();
    });

    /* --- reveal-on-scroll -------------------------------------------------
       One observer for everything marked .reveal. Anything already on screen
       is revealed immediately, so nothing is invisible without scrolling, and
       it is a no-op when the visitor has asked for reduced motion. */
    let revealObserver = null;
    /* The hidden state only applies once this class is on <html>, so with no
       JavaScript -- or if this file fails to load -- everything is simply
       visible rather than an empty page. */
    document.documentElement.classList.add("js-reveal");

    /* Failsafe: anything still unrevealed shortly after load is shown
       regardless. IntersectionObserver does not fire while a tab is in the
       background, and a page that renders blank until it happens to be
       observed is worse than one that simply does not animate. */
    function revealAllNow() {
        /* Remove the class rather than adding .shown: .shown still depends on a
           transition completing, and a transition that never advances (a
           background tab, a throttled compositor) would leave the content at
           opacity 0. Dropping .reveal makes the element plainly visible with no
           animation involved. */
        document.querySelectorAll(".reveal").forEach(el => el.classList.remove("reveal"));
    }
    addEventListener("load", () => setTimeout(revealAllNow, 1500));
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") watchReveal();
    });

    function watchReveal() {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            document.querySelectorAll(".reveal").forEach(el => el.classList.add("shown"));
            return;
        }
        if (!revealObserver) {
            revealObserver = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) { e.target.classList.add("shown"); revealObserver.unobserve(e.target); }
                });
            }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
        }
        document.querySelectorAll(".reveal:not(.shown)").forEach(el => revealObserver.observe(el));
    }

    function play(c) {
        if (!c.audio) return;
        audioEl.src = c.audio;
        audioEl.play().catch(() => {});   /* autoplay policies: fail quietly */
    }
