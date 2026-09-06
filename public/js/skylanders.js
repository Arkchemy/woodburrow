/* The Skylanders page: the game tabs, the roster grid and the move showcase.
   Depends on js/common.js for the element palette and the reveal system.

   ?game=giants selects a game on load, so the games page can link straight
   into a roster rather than dropping you on Spyro's Adventure every time. */

/* --- the roster, per game ------------------------------------------- */
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
        /* ?game=giants from the games page, when it is a game we have. */
        const want = new URLSearchParams(location.search).get("game");
        selectGame(d.order.includes(want) ? want : "ssa");

        document.getElementById("randomPick").addEventListener("click", () => {
            if (!VISIBLE.length) return;
            showcase(Math.floor(Math.random() * VISIBLE.length), true);
        });
    });

    function selectGame(g) {
        /* replaceState, not pushState: the tabs are a filter, not navigation,
           and stacking six history entries would trap the back button. */
        history.replaceState(null, "", g === "ssa" ? location.pathname : "?game=" + g);
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

    function play(c) {
        if (!c.audio) return;
        audioEl.src = c.audio;
        audioEl.play().catch(() => {});   /* autoplay policies: fail quietly */
    }
