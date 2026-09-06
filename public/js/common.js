/* Shared by every page: cache stamp, element palette, the Discord markdown
   renderer, the reveal-on-scroll system, the mobile menu and the header
   measurement. Loaded before the page-specific file, which reuses these --
   these files share one global scope, so nothing here is redeclared there. */

/* Data files change more often than the page; without a version the
       browser serves a stale copy and new fields silently go missing. The
       stamp is the newest data-file mtime -- a date alone does not bust the
       cache when the data is regenerated the same day. Refresh it with
       tools/stamp.py after changing any .json here. */
    const DATA_V = "?v=1788710906";

/* --- element palette, used by the roster and the contributor cards --- */
    const ELEMENT_COLOUR = {
        Magic:"#a763d8", Tech:"#e8942e", Fire:"#e34a2c", Water:"#2b9fd8",
        Earth:"#b07b3e", Air:"#7fc9e8", Life:"#63b64a", Undead:"#8d8ab8",
        Light:"#f0d264", Dark:"#5b5470"
    };
    const ELEMENT_FILE = { Magic:"magic", Tech:"tech", Fire:"fire", Water:"water",
                           Earth:"earth", Air:"air", Life:"life", Undead:"undead",
                           Light:"light", Dark:"dark" };

/* --- text helpers ---------------------------------------------------- */
    const timeAgo = iso => {
        const secs = (Date.now() - new Date(iso)) / 1000;
        const steps = [[31536000,"y"],[2592000,"mo"],[604800,"w"],[86400,"d"],[3600,"h"],[60,"m"]];
        for (const [n, unit] of steps) if (secs >= n) return Math.floor(secs / n) + unit + " ago";
        return "just now";
    };
    const esc = t => { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; };
    /* Discord custom emoji: <:name:id> and animated <a:name:id>. Served from
       cdn.discordapp.com/emojis/{id}, routed through the proxy like every other
       image because the CSP is img-src 'self'. Unicode emoji need no handling --
       they are just characters. Applied after escaping, so the angle brackets
       have already become &lt;/&gt;. */
    const emojiRe = /&lt;(a?):([A-Za-z0-9_]+):(\d+)&gt;/g;
    const withEmoji = h => h.replace(emojiRe, (_, anim, name, id) => {
        const url = `https://cdn.discordapp.com/emojis/${id}.${anim ? "gif" : "png"}?size=48`;
        return `<img class="demoji" src="/api/avatar-image?src=${encodeURIComponent(url)}"` +
               ` alt=":${name}:" title=":${name}:" loading="lazy">`;
    });

    /* Discord markdown. Order matters throughout: longer delimiters are
       consumed before their prefixes, so ***x*** is not eaten by ** and __x__
       is not eaten by _. Because each pass wraps its match in a tag and leaves
       the inner text alone, nesting composes on its own -- __**x**__ becomes
       <u><strong>x</strong></u> without needing a real parser. */
    const mdLite = (t) => {
        if (!t) return "";
        /* Code is pulled out first and put back last, so nothing inside a code
           span is ever treated as markup. */
        const stash = [];
        const keep = (html) => "@@MD" + (stash.push(html) - 1) + "@@";

        let h = t;
        h = h.replace(/```(?:([a-zA-Z0-9+#-]*)\n)?([\s\S]*?)```/g,
            (_, lang, code) => keep("<pre>" + esc(code.replace(/\n$/, "")) + "</pre>"));
        h = h.replace(/`([^`\n]+)`/g, (_, code) => keep("<code>" + esc(code) + "</code>"));

        h = esc(h);

        /* Block level, line by line. */
        const lines = h.split("\n");
        const out = [];
        let inList = null;
        const closeList = () => { if (inList) { out.push("</" + inList + ">"); inList = null; } };
        for (const line of lines) {
            let m;
            if ((m = line.match(/^&gt;&gt;&gt; ?([\s\S]*)$/))) { closeList(); out.push("<blockquote>" + m[1] + "</blockquote>"); continue; }
            if ((m = line.match(/^&gt; ?(.*)$/)))              { closeList(); out.push("<blockquote>" + m[1] + "</blockquote>"); continue; }
            if ((m = line.match(/^(#{1,3}) +(.*)$/)))          { closeList(); const n = m[1].length + 3; out.push("<h" + n + ">" + m[2] + "</h" + n + ">"); continue; }
            if ((m = line.match(/^-# +(.*)$/)))                { closeList(); out.push('<small class="subtext">' + m[1] + "</small>"); continue; }
            if ((m = line.match(/^ *[-*+] +(.*)$/)))           { if (inList !== "ul") { closeList(); out.push("<ul>"); inList = "ul"; } out.push("<li>" + m[1] + "</li>"); continue; }
            if ((m = line.match(/^ *\d+\. +(.*)$/)))           { if (inList !== "ol") { closeList(); out.push("<ol>"); inList = "ol"; } out.push("<li>" + m[1] + "</li>"); continue; }
            closeList();
            out.push(line);
        }
        closeList();
        h = out.join("\n");

        /* Masked links first, so their text can still carry formatting. */
        h = h.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
            (_, text, url) => '<a href="' + url + '" target="_blank" rel="noopener">' + text + "</a>");

        /* Inline, longest delimiter before its prefix. */
        h = h.replace(/\*\*\*([\s\S]+?)\*\*\*/g, "<strong><em>$1</em></strong>");
        h = h.replace(/\*\*([\s\S]+?)\*\*/g,     "<strong>$1</strong>");
        h = h.replace(/___([\s\S]+?)___/g,       "<u><em>$1</em></u>");
        h = h.replace(/__([\s\S]+?)__/g,         "<u>$1</u>");
        h = h.replace(/~~([\s\S]+?)~~/g,         "<s>$1</s>");
        h = h.replace(/\|\|([\s\S]+?)\|\|/g,     '<span class="spoiler" tabindex="0">$1</span>');
        h = h.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
        h = h.replace(/(^|[^_\w])_([^_\n]+)_/g,   "$1<em>$2</em>");

        /* Bare URLs that are not already inside an anchor. */
        h = h.replace(/(^|[\s>])(https?:\/\/[^\s<]+)/g,
            (_, pre, url) => pre + '<a href="' + url + '" target="_blank" rel="noopener">' + url + "</a>");

        h = withEmoji(h);
        h = h.replace(/\n/g, "<br>");
        h = h.replace(/@@MD(\d+)@@/g, (_, i) => stash[+i]);
        /* Block elements must not be separated by the <br> runs above. */
        h = h.replace(/<br>(\s*<(?:pre|blockquote|ul|ol|h[3-6]))/g, "$1");
        h = h.replace(/(<\/(?:pre|blockquote|ul|ol|h[3-6])>)\s*<br>/g, "$1");
        return h;
    };

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



    /* --- spoilers, and a fallback for avatars that fail to load ------- */
    document.addEventListener("click", e => {
        if (e.target.classList && e.target.classList.contains("spoiler"))
            e.target.classList.add("revealed");
    });

    /* An avatar lookup can fail (deleted account, rate limit); fall back to the
       local file rather than leaving a broken image. */
    document.addEventListener("error", e => {
        const el = e.target;
        if (el.tagName === "IMG" && el.dataset.fallback && el.src !== el.dataset.fallback) {
            el.src = el.dataset.fallback;
        }
    }, true);



    /* The mobile toggle rests under the cloud header so it never covers the

       logo, and pins to the top once the header has scrolled past. A class on
       <html> rather than inline styles, so CSS owns the two positions. */
    {
        const header = document.getElementById("cloud-header");
        /* Publish the header's real height so the toggle can sit in its
           bottom-right corner at any breakpoint instead of a fixed offset. */
        const nav = document.getElementById("site-nav");
        const measure = () => {
            const root = document.documentElement.style;
            if (header) root.setProperty(
                "--hdr-h", Math.round(header.getBoundingClientRect().height) + "px");
            /* The desktop nav is sticky and wraps to a second row on narrower
               windows, so anything that has to clear it -- the legal page's
               sticky sidebar, and every heading an anchor jumps to -- needs
               its measured height rather than a guessed constant. */
            if (nav) root.setProperty(
                "--nav-h", Math.round(nav.getBoundingClientRect().height) + "px");
        };
        measure();
        addEventListener("resize", measure);

    }

    /* --- mobile menu ------------------------------------------------------
       The nav is a plain list on desktop and a slide-in panel below 760px.
       Kept accessible: the toggle owns aria-expanded, Escape closes, focus
       returns to the button, and following a link closes the panel. */
    {
        const btn = document.getElementById("navToggle");
        const nav = document.getElementById("site-nav");
        const scrim = document.getElementById("navScrim");
        const setOpen = open => {
            document.documentElement.classList.toggle("nav-open", open);
            btn.setAttribute("aria-expanded", open ? "true" : "false");
            scrim.hidden = !open;
            /* stop the page scrolling behind the panel */
            document.body.style.overflow = open ? "hidden" : "";
        };
        btn.addEventListener("click", () => setOpen(!document.documentElement.classList.contains("nav-open")));
        scrim.addEventListener("click", () => { setOpen(false); btn.focus(); });
        nav.addEventListener("click", e => { if (e.target.tagName === "A") setOpen(false); });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && document.documentElement.classList.contains("nav-open")) {
                setOpen(false); btn.focus();
            }
        });
        /* Resizing past the breakpoint with the panel open would otherwise
           leave the body locked and the scrim covering a desktop layout. */
        addEventListener("resize", () => {
            if (innerWidth > 760) setOpen(false);
        });
    }

    /* Seed the reveal animation on whatever headings and ledes the page has.
       Page-specific files call watchReveal() again after they add content. */
    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("main > h2, main > .lede").forEach((el, i) => {
            el.classList.add("reveal"); el.style.setProperty("--i", i % 4);
        });
        watchReveal();
    });


/* --- Arkchemy's own emoji ----------------------------------------------
   emoji.json maps a name to the server's custom emoji id. Until an id is
   filled in the unicode fallback renders instead, so a page never shows a
   broken image while the emoji are still being uploaded. The same :name:
   works in Discord and here, which is the point of keeping one registry.

   Text is escaped before this runs, so nothing here can inject markup. */
let SITE_EMOJI = {};
const siteEmojiRe = /:([a-zA-Z][a-zA-Z0-9_]{1,30}):/g;

function withSiteEmoji(html) {
    return html.replace(siteEmojiRe, (whole, name) => {
        const e = SITE_EMOJI[name];
        if (!e) return whole;                 /* not ours -- leave it alone */
        if (!e.id) return `<span class="demoji-uni" title=":${name}:">${e.fallback}</span>`;
        const url = `https://cdn.discordapp.com/emojis/${e.id}.png?size=48`;
        return `<img class="demoji" src="/api/avatar-image?src=${encodeURIComponent(url)}"` +
               ` alt=":${name}:" title=":${name}:" loading="lazy">`;
    });
}

/* Rewrite anything already on the page that opted in with data-emoji, then
   let later code call withSiteEmoji directly. */
fetch("emoji.json" + DATA_V).then(r => r.json()).then(d => {
    SITE_EMOJI = d.emoji || {};
    document.querySelectorAll("[data-emoji]").forEach(el => {
        const out = withSiteEmoji(esc(el.textContent));
        if (out !== esc(el.textContent)) el.innerHTML = out;
    });
}).catch(() => {});

/* --- Easter eggs --------------------------------------------------------
   Four of them. All optional, none load-bearing: every one is additive, so
   the page is identical for anyone who never finds them, and each respects
   prefers-reduced-motion. */
{
    let toastEl = null;
    const toast = (html, ms) => {
        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.className = "egg-toast";
            /* polite, not assertive: this is flavour, and it must never
               interrupt what a screen reader is already saying */
            toastEl.setAttribute("role", "status");
            document.body.appendChild(toastEl);
        }
        toastEl.innerHTML = html;
        toastEl.classList.add("on");
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toastEl.classList.remove("on"), ms || 4200);
    };

    /* 1. A note in the console. This is a reverse-engineering project, so
          the people who open devtools are exactly the audience worth
          talking to. */
    const brand = "color:#f3c34e;background:#3d1140;padding:9px 14px;" +
                  "border-radius:8px;font:bold 14px/1.4 system-ui";
    console.log("%c\u{1F388}  Arkchemy", brand);
    console.log(
        "%cSkylanders: Spyro's Adventure, statically recompiled from Wii U PowerPC to Switch ARM64.\n" +
        "Nothing on this page is minified and there is no analytics of any kind -- have a look around.\n" +
        "The code: https://github.com/Arkchemy\n" +
        "Curious how far the boot gets? /#progress",
        "color:#7a1f4e;font:13px/1.7 system-ui");

    /* 2. Konami code -> the whole page runs through the ten element colours,
          which is as close to a Portal of Power as a stylesheet gets. */
    const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft",
                    "ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let kIdx = 0;
    const ELEMENTS = Object.keys(ELEMENT_COLOUR);

    const portalOn = () => {
        const root = document.documentElement;
        if (root.classList.contains("portal")) return;
        root.classList.add("portal");
        toast("<b>Portal of Power</b><br>All ten elements, one page. " +
              "Press <kbd>Esc</kbd> to put it back.", 6000);
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            root.style.setProperty("--portal", ELEMENT_COLOUR.Magic);
            return;
        }
        let n = 0;
        portalOn._i = setInterval(() => {
            root.style.setProperty("--portal", ELEMENT_COLOUR[ELEMENTS[n++ % ELEMENTS.length]]);
        }, 1400);
        root.style.setProperty("--portal", ELEMENT_COLOUR.Magic);
    };
    const portalOff = () => {
        clearInterval(portalOn._i);
        document.documentElement.classList.remove("portal");
        document.documentElement.style.removeProperty("--portal");
    };

    /* 3. Type "kaos" anywhere. He would want it noted. */
    let typed = "";

    addEventListener("keydown", e => {
        /* never swallow keys meant for a field */
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

        kIdx = (e.key === KONAMI[kIdx] || e.key.toLowerCase() === KONAMI[kIdx]) ? kIdx + 1 : 0;
        if (kIdx === KONAMI.length) { kIdx = 0; portalOn(); }

        if (e.key === "Escape") portalOff();

        if (/^[a-z]$/i.test(e.key)) {
            typed = (typed + e.key.toLowerCase()).slice(-8);
            if (typed.endsWith("kaos")) {
                typed = "";
                toast("<b>KAOS WAS HERE</b><br>and he has done <i>nothing</i> to the recompiler. Probably.", 5000);
            }
            if (typed.endsWith("spyro")) {
                typed = "";
                toast("<b>Spyro's Adventure</b><br>The one being ported. The other five are on the roster for reference.", 5000);
            }
        }
    });

    /* 4. The footer mark. Five clicks gets the line that is actually true
          about this project, which felt worth hiding rather than stating. */
    const mark = document.getElementById("footMark");
    if (mark) {
        let hits = 0;
        mark.addEventListener("click", () => {
            hits++;
            if (hits < 5) {
                mark.animate(
                    [{ transform: "rotate(0)" }, { transform: "rotate(-12deg)" }, { transform: "rotate(0)" }],
                    { duration: 260, easing: "ease-in-out" });
                return;
            }
            const egg = document.getElementById("footEgg");
            if (!egg || !egg.hidden) return;
            egg.textContent = "Every function in this port was translated from a " +
                "PowerPC instruction stream nobody has the source for. " +
                "The hard part is not the graphics — it is the memory allocator.";
            egg.hidden = false;
            toast("You found the honest version. \u{1F388}", 4000);
        });
    }
}

/* --- has the cloud header scrolled away? -------------------------------
   Drives the small Arkchemy mark in the sticky nav, which only makes sense
   once the big one is off screen.

   A scroll listener rather than an IntersectionObserver on a sentinel: the
   observer fires nothing at all for an element inside #cloud-header, which
   is overflow:hidden with transformed children, and a compare against one
   number is cheaper than working out why. Reads are coalesced into a frame,
   so scrolling still only measures once per paint. */
{
    const header = document.getElementById("cloud-header");
    if (header) {
        let ticking = false;
        const update = () => {
            ticking = false;
            const past = header.getBoundingClientRect().bottom <= 0;
            document.documentElement.classList.toggle("scrolled", past);
        };
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        };
        addEventListener("scroll", onScroll, { passive: true });
        addEventListener("resize", onScroll);
        update();
    }
}

/* --- text that would be clipped shrinks instead -------------------------
   Names and roles come from a CSV and from Discord, so there is no length
   to design to. Rather than an ellipsis eating the end of a name, step the
   font down until it fits, to a floor where it is still readable -- below
   that, clipping is the honest outcome and the title attribute carries the
   whole string.

   Marked with .fit so it is opt-in: applying this to body copy would be a
   lot of layout reads for no benefit. */
function fitText(root) {
    const els = (root || document).querySelectorAll(".fit:not([data-fitted])");
    if (!els.length) return;

    els.forEach(el => {
        el.dataset.fitted = "1";
        const base = parseFloat(getComputedStyle(el).fontSize);
        const min = Math.max(10, base * 0.72);
        /* one line or several: overflowing sideways means it is a single
           line that is too long, overflowing down means it wraps too far */
        const over = () => el.scrollWidth > el.clientWidth + 1 ||
                           el.scrollHeight > el.clientHeight + 1;
        if (!over()) return;
        let size = base;
        while (size > min && over()) {
            size -= 0.5;
            el.style.fontSize = size + "px";
        }
        if (over() && !el.title) el.title = el.textContent.trim();
    });
}

/* Re-run on resize: a card that fits at 1280px may not at 380px, and a size
   set for the narrow case would stay needlessly small on the way back up. */
let fitTimer = null;
addEventListener("resize", () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
        document.querySelectorAll(".fit[data-fitted]").forEach(el => {
            el.style.fontSize = "";
            delete el.dataset.fitted;
        });
        fitText();
    }, 180);
});
/* webfonts land after first paint and change every measurement */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitText());

/* --- the footer's Discord link -----------------------------------------
   The invite comes from /api/discord-invite rather than being written into
   the markup: the widget hands out a temporary invite, so a hardcoded one
   goes dead within a day. The route falls back to a permanent invite when
   the widget cannot be read, and the link stays hidden in the one case where
   neither is available. */
{
    const link = document.getElementById("footDiscord");
    if (link) {
        fetch("/api/discord-invite").then(r => r.json()).then(d => {
            if (!d || !d.invite) return;
            link.href = d.invite;
            link.rel = "noopener";
            link.hidden = false;
        }).catch(() => {});
    }
}
