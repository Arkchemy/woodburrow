/* The front page: the two live Discord feeds and a glance at the people.
   The games, the roster, the contributors and the legal documents are each
   their own page. Depends on js/common.js. */

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
            /* withEmoji, not bare esc: the question is where the custom emoji
               usually is, and esc alone leaves &lt;:name:id&gt; as text. */
            el.innerHTML = `<summary>${withEmoji(esc(q))}</summary>` +
                           `<div class="qa-body">${mdLite(a || "")}</div>`;
            host.appendChild(el);
        });
        watchReveal();
    }).catch(() => { document.getElementById("faqList").innerHTML =
        '<p class="feed-empty">FAQ is unavailable.</p>'; });


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
