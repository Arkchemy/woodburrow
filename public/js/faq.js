/* /faq -- questions, live from the Discord faq channel.

   Written in the channel as "**Question?** answer", so that is what is parsed,
   with a fall back to the first line when someone has not used the bold.

   Depends on js/common.js. */

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
