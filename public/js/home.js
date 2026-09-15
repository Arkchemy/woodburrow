/* The front page: a glance at the newest progress and at the people.

   Everything here is a pointer somewhere else. The full build log is
   /progress, the questions are /faq, the roster is /skylanders, the people
   are /contributors -- the front page's job is to say what this is and show
   enough that the rest is worth a click, not to be a worse copy of four other
   pages. Depends on js/common.js. */

    /* --- live from Discord ------------------------------------------------
       Both come through /api/discord-channel, which holds the bot token
       server-side and only accepts the two channel names. */

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
                  `<b>${withEmoji(esc(m.author.name))}</b><time datetime="${m.timestamp}">${timeAgo(m.timestamp)}</time>` +
                `</header><div class="body">${mdLite(m.content)}</div>` +
                m.attachments.map(a => `<img class="shot" src="${a.url}" alt="" loading="lazy">`).join("");
            host.appendChild(el);
        });
        capProgress(host);
        watchReveal();
    }).catch(() => { document.getElementById("progressFeed").innerHTML =
        '<p class="feed-empty">Progress feed is unavailable.</p>'; });

    /* Two posts, then a fade you can scroll past -- the older ones are still
       worth having, they are just not what someone landing here came for.
       The height is measured from the second post rather than guessed, since
       a post with a screenshot in it is several times taller than one line
       of text. "Show everything" drops the cap for people who would rather
       not scroll inside a box, and for anyone printing the page. */
    function capProgress(host) {
        const clip = document.getElementById("progressClip");
        const more = document.getElementById("progressMore");
        const posts = host.querySelectorAll(".post");
        if (!clip || posts.length <= 2) return;

        const measure = () => {
            if (clip.classList.contains("open")) return;
            const top = host.getBoundingClientRect().top;
            const second = posts[1].getBoundingClientRect();
            /* the gap after the second post, so the third peeks under the fade
               and it is obvious there is more rather than looking cut off */
            clip.style.setProperty("--cap", Math.round(second.bottom - top + 46) + "px");
        };
        measure();
        addEventListener("resize", measure);
        /* posts contain lazy images, which change the height as they arrive */
        host.querySelectorAll("img").forEach(img => {
            if (!img.complete) img.addEventListener("load", measure, { once: true });
        });

        clip.classList.add("capped");
        more.hidden = false;

        /* Drop the fade once you have scrolled to the bottom -- there is
           nothing left to hint at, so it would just be haze over the text. */
        const atEnd = () => clip.classList.toggle(
            "at-end", clip.scrollTop + clip.clientHeight >= clip.scrollHeight - 4);
        clip.addEventListener("scroll", atEnd, { passive: true });
        atEnd();
        document.getElementById("progressExpand").addEventListener("click", () => {
            clip.classList.remove("capped");
            clip.classList.add("open");
            clip.style.removeProperty("--cap");
            more.hidden = true;
        });
    }


/* --- the people, in brief ---------------------------------------------
   The contributors only. Special thanks and the beta-tester list are their
   own sections on /contributors, and putting all three here made the front
   page a worse version of that page rather than a pointer to it. */
fetch("contributors.json" + DATA_V).then(r => r.json()).then(list => {
    const host = document.getElementById("peopleGrid");
    if (!host) return;
    const core = list.filter(c => c.section !== "special-thanks");
    const lede = document.querySelector("#people + .lede");
    if (lede) lede.textContent = core.length === 1
        ? "One person writes the code. A lot of others have put research, direction and patience into it."
        : core.length + " people build Arkchemy directly, with a lot of others behind them.";

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
              `<span class="p-role fit">${esc(c.role.replace(/ -- /g, " \u2014 "))}</span>` +
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
