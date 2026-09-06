/* The games page. Titles and rosters come from rosters.json so the counts
   cannot drift from the roster itself; everything else is here, because it is
   editorial and there is nowhere better to keep six sentences.

   Deliberately no per-game platform list: the series shipped across a lot of
   hardware over six years and getting one wrong on a public page is worse
   than not claiming it. Depends on js/common.js. */

const GAME_NOTES = {
    ssa: {
        year: 2011, logo: "Spyro-logo.png",
        hook: "The one being ported. It introduced the Portal of Power and the whole toys-to-life idea with it.",
        status: "porting"
    },
    giants: {
        year: 2012, logo: "Giants-logo.png",
        hook: "Added the oversized Giants, who could not fit through a door and mostly did not need to.",
        status: "reference"
    },
    swapforce: {
        year: 2013, logo: "SwapForce-logo.png",
        hook: "Figures split at the waist, so any top half could be stuck on any bottom half. Sixteen halves, 256 combinations.",
        status: "reference"
    },
    trapteam: {
        year: 2014, logo: "tt-logo.png",
        hook: "Villains were caught in crystals and played as. The largest roster in the series by a wide margin.",
        status: "reference"
    },
    superchargers: {
        year: 2015, logo: "Superchargers-logo.png",
        hook: "Land, sea and sky vehicles, each with its own upgrade tree alongside the Skylander driving it.",
        status: "reference"
    },
    imaginators: {
        year: 2016, logo: "Imaginators-logo.png",
        hook: "Build your own Skylander. The last game in the series — and the one that shipped with its debug symbols left in.",
        status: "reference"
    }
};

const STATUS_LABEL = {
    porting:   { text: "Being ported", cls: "st-now" },
    reference: { text: "Reference",    cls: "st-ref" }
};

fetch("rosters.json" + DATA_V).then(r => r.json()).then(d => {
    const host = document.getElementById("gameCards");
    if (!host) return;

    d.order.forEach((key, i) => {
        const g = d.games[key];
        const note = GAME_NOTES[key];
        if (!note) return;

        const elements = Object.keys(g.roster).length;
        const st = STATUS_LABEL[note.status];

        const card = document.createElement("a");
        card.className = "game-card reveal" + (note.status === "porting" ? " is-now" : "");
        card.href = "/skylanders?game=" + key;
        card.style.setProperty("--i", Math.min(i, 6));
        card.innerHTML =
            `<span class="gc-logo"><img src="images/games/${note.logo}" alt="" loading="lazy"></span>` +
            `<span class="gc-body">` +
                `<span class="gc-top">` +
                    `<h3>${esc(g.title)}</h3>` +
                    `<span class="gc-status ${st.cls}">${st.text}</span>` +
                `</span>` +
                `<p class="gc-hook">${esc(note.hook)}</p>` +
                /* each number and its label wrap as one unit, or a narrow
                   card drops "elements" onto a line of its own */
                `<span class="gc-stats">` +
                    `<span><b>${note.year}</b><i>released</i></span>` +
                    `<span><b>${g.count}</b><i>Skylanders</i></span>` +
                    `<span><b>${elements}</b><i>elements</i></span>` +
                `</span>` +
                `<span class="gc-go">See the roster` +
                    `<svg viewBox="0 0 24 24" aria-hidden="true" width="15" height="15"><path fill="currentColor" d="M12 4l-1.4 1.4L16.2 11H4v2h12.2l-5.6 5.6L12 20l8-8z"/></svg>` +
                `</span>` +
            `</span>`;
        host.appendChild(card);
    });

    watchReveal();
}).catch(() => {
    const host = document.getElementById("gameCards");
    if (host) host.innerHTML = '<p class="feed-empty">The game list is unavailable right now.</p>';
});
