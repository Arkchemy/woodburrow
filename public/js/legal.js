/* The legal page: the privacy and takedown notice, plus the licence of every
   repository, fetched from GitHub through /api/license so the page cannot
   drift from what the code actually ships under.
   Depends on js/common.js for esc() and the reveal system. */

const LIC_DOCS = [
    { id: "legal",       label: "Legal & privacy", note: "Privacy, trademarks, takedown" },
    { id: "woodburrow",  label: "woodburrow",      note: "This website" },
    { id: "conquertron", label: "conquertron",     note: "The recompiler" },
    { id: "jouster",     label: "jouster",         note: "The Switch runtime" },
    { id: "blaster",     label: "blaster",         note: "Asset tooling" },
    { id: "armory",      label: "armory",          note: "Shared data" }
];

/* --- markdown, rendered as a document ---------------------------------
   Deliberately not the Discord renderer in common.js: these are documents,
   not chat messages. They need tables and real paragraphs, and they must not
   turn a bare newline into a <br> -- these files are hard-wrapped at 78
   columns, so line breaks are an artefact of the source, not the meaning. */
function renderDoc(src) {
    const lines = src.replace(/\r\n/g, "\n").split("\n");
    const out = [];
    const heads = [];
    let i = 0;
    let slugN = 0;

    const inline = (t) => {
        let h = esc(t);
        h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
        h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
            (_, txt, url) => /^https?:\/\//.test(url)
                ? `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`
                : `<a href="${esc(url)}">${txt}</a>`);
        h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        h = h.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
        /* Bare URLs, but not ones already inside the href of a link above. */
        h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
            (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
        return h;
    };

    const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                         .replace(/^-|-$/g, "") || ("s" + (++slugN));

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) { i++; continue; }

        /* Fenced code. */
        let m = line.match(/^```/);
        if (m) {
            const buf = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
            i++;
            out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
            continue;
        }

        /* Headings. h1 is the document title and is rendered once, larger. */
        if ((m = line.match(/^(#{1,4}) +(.*)$/))) {
            const depth = m[1].length;
            const text = m[2].replace(/:$/, "");
            const id = "d-" + slug(text);
            if (depth === 1) {
                out.push(`<h2 class="doc-title" id="${id}">${inline(text)}</h2>`);
            } else {
                out.push(`<h${depth} id="${id}">${inline(text)}</h${depth}>`);
                if (depth === 2) heads.push({ id, text });
            }
            i++;
            continue;
        }

        /* Horizontal rule. */
        if (/^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

        /* Tables: a header row, a delimiter row of dashes, then body rows. */
        if (line.trim().startsWith("|") && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")) {
            const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
            const head = cells(line);
            i += 2;
            const body = [];
            while (i < lines.length && lines[i].trim().startsWith("|")) body.push(cells(lines[i++]));
            out.push(
                '<div class="doc-table"><table><thead><tr>' +
                head.map(c => `<th>${inline(c)}</th>`).join("") +
                "</tr></thead><tbody>" +
                body.map(r => "<tr>" + r.map((c, n) =>
                    /* The first column is the row's subject; label the rest on
                       narrow screens, where the table stacks into cards. */
                    `<td data-label="${esc(head[n] || "")}">${inline(c)}</td>`).join("") + "</tr>").join("") +
                "</tbody></table></div>");
            continue;
        }

        /* Lists, including the loose ones these documents use, where an item
           runs across several hard-wrapped lines. */
        if ((m = line.match(/^ {0,3}([-*+]|\d+\.) +(.*)$/))) {
            const ordered = /\d/.test(m[1]);
            const items = [];
            while (i < lines.length) {
                const im = lines[i].match(/^ {0,3}([-*+]|\d+\.) +(.*)$/);
                if (!im) {
                    /* A continuation line: indented, and not a blank. */
                    if (items.length && /^\s+\S/.test(lines[i])) { items[items.length - 1] += " " + lines[i].trim(); i++; continue; }
                    break;
                }
                items.push(im[2]);
                i++;
            }
            const tag = ordered ? "ol" : "ul";
            out.push(`<${tag}>` + items.map(t => `<li>${inline(t)}</li>`).join("") + `</${tag}>`);
            continue;
        }

        /* Blockquote. */
        if (line.startsWith(">")) {
            const buf = [];
            while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^> ?/, ""));
            out.push("<blockquote>" + inline(buf.join(" ")) + "</blockquote>");
            continue;
        }

        /* Paragraph: join the hard-wrapped lines back into one. */
        const buf = [];
        while (i < lines.length && lines[i].trim() &&
               !/^ {0,3}([-*+]|\d+\.) +/.test(lines[i]) &&
               !/^#{1,4} /.test(lines[i]) &&
               !lines[i].trim().startsWith("|") &&
               !lines[i].startsWith(">")) buf.push(lines[i++]);
        out.push("<p>" + inline(buf.join(" ")) + "</p>");
    }

    return { html: out.join("\n"), heads };
}

/* A plain LICENSE file is not markdown. Rendering it as prose would reflow
   the numbered clauses into a wall of text, so it keeps its own layout. */
function renderPlain(src) {
    return { html: '<pre class="lic-plain">' + esc(src) + "</pre>", heads: [] };
}

{
    const tabs = document.getElementById("licTabs");
    const body = document.getElementById("licBody");
    const toc = document.getElementById("docToc");
    const meta = document.getElementById("docMeta");

    const buildToc = heads => {
        if (!toc) return;
        if (!heads.length) { toc.innerHTML = ""; toc.hidden = true; return; }
        toc.hidden = false;
        toc.innerHTML = '<p class="toc-h">On this page</p>' +
            heads.map(h => `<a href="#${h.id}">${esc(h.text)}</a>`).join("");
        spyToc();
    };

    /* Highlight the section currently in view. rootMargin pulls the trigger
       line to just under the sticky nav -- measured, because the nav wraps to
       a second row on narrower windows -- so the highlight changes when a
       heading reaches the top of the readable area, not the viewport. */
    const navClearance = () => {
        const v = getComputedStyle(document.documentElement).getPropertyValue("--nav-h");
        return -(parseInt(v, 10) || 66) - 16;
    };
    let spy = null;
    function spyToc() {
        if (spy) spy.disconnect();
        const links = [...toc.querySelectorAll("a")];
        if (!links.length) return;
        spy = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                links.forEach(a => a.classList.toggle(
                    "here", a.getAttribute("href") === "#" + e.target.id));
            });
        }, { rootMargin: navClearance() + "px 0px -70% 0px" });
        links.forEach(a => {
            const el = document.getElementById(a.getAttribute("href").slice(1));
            if (el) spy.observe(el);
        });
    }

    const load = id => {
        tabs.querySelectorAll("button").forEach(b =>
            b.setAttribute("aria-pressed", b.dataset.repo === id ? "true" : "false"));
        body.innerHTML = '<p class="doc-loading">Fetching from GitHub…</p>';
        if (toc) toc.hidden = true;
        history.replaceState(null, "", id === "legal" ? location.pathname : "?doc=" + id);

        fetch(`/api/license?repo=${id}`).then(r => r.json()).then(d => {
            if (!d.text) throw new Error("empty");
            const isMd = id === "legal";
            const { html, heads } = isMd ? renderDoc(d.text) : renderPlain(d.text);
            body.innerHTML = html;
            body.className = "doc-body" + (isMd ? "" : " is-plain");
            buildToc(heads);
            if (meta) {
                const file = isMd ? "LEGAL.md" : "LICENSE";
                const repo = isMd ? "woodburrow" : id;
                meta.innerHTML = "Served from <a href=\"https://github.com/Arkchemy/" +
                    repo + "/blob/main/" + file + "\" target=\"_blank\" rel=\"noopener\">" +
                    "Arkchemy/" + repo + "/" + file + "</a>, live.";
            }
        }).catch(() => {
            body.innerHTML = '<p class="doc-loading">This document is unavailable ' +
                'right now. It can be read directly at <a href="https://github.com/Arkchemy" ' +
                'target="_blank" rel="noopener">github.com/Arkchemy</a>.</p>';
        });
    };

    LIC_DOCS.forEach(doc => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.repo = doc.id;
        b.innerHTML = `<span class="t-name">${doc.label}</span>` +
                      `<span class="t-note">${doc.note}</span>`;
        b.addEventListener("click", () => load(doc.id));
        tabs.appendChild(b);
    });

    const want = new URLSearchParams(location.search).get("doc");
    load(LIC_DOCS.some(d => d.id === want) ? want : "legal");
}
