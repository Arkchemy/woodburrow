/* /progress -- the build log, live from the Discord progress channel.

   The same feed the front page shows the newest two of, uncapped. capProgress
   deliberately does not come with it: a cap exists so a landing page is not
   one long scroll of someone else's work notes, and on the page whose entire
   purpose is that scroll it would be in the way.

   Depends on js/common.js. */

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
        watchReveal();
    }).catch(() => { document.getElementById("progressFeed").innerHTML =
        '<p class="feed-empty">Progress feed is unavailable.</p>'; });

    /* Two posts, then a fade you can scroll past -- the older ones are still
       worth having, they are just not what someone landing here came for.
       The height is measured from the second post rather than guessed, since
       a post with a screenshot in it is several times taller than one line
       of text. "Show everything" drops the cap for people who would rather
       not scroll inside a box, and for anyone printing the page. */
