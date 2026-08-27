// Vercel serverless function: fetches an avatar image server-side and
// streams the bytes back through this same origin. Used for both GitHub
// (avatars.githubusercontent.com / github.com/{u}.png) and Discord
// (cdn.discordapp.com) avatars so the visitor's browser never makes a
// direct request to either third party -- it only ever talks to
// arkchemy.vercel.app, for the JSON lookups (see github-user.js and
// discord-avatar.js) and now the images too.
//
// Only a fixed allowlist of real avatar-hosting domains is fetchable
// here -- this is a public route with no auth, so without the allowlist
// it'd be an open image-fetching proxy for literally any URL (a real
// SSRF risk), not just a narrow avatar helper.
//
// Hardened 2026-08-27 after an audit found three real gaps in the
// original version, all of the same shape: the host was checked, and
// then everything that came back was trusted.
//
//  1. The upstream's own Content-Type was passed straight through.
//     cdn.discordapp.com is on the allowlist and serves arbitrary
//     user-uploaded files, so anything a Discord user could upload
//     could be served *as this origin* -- an HTML page on
//     arkchemy.vercel.app is a convincing fake announcement or fake
//     download page, which is the actual risk here rather than
//     anything to do with images. Now: a raster-only response-type
//     allowlist, and the response is labelled with the allowlisted
//     type rather than the upstream's own string. SVG is deliberately
//     excluded -- a top-level SVG document can carry script, so it is
//     an HTML-equivalent in this context, not an image.
//  2. fetch() follows redirects by default and only the *initial* URL
//     was checked, so an allowlisted host could bounce the request
//     anywhere. Now redirects are followed manually, with the same
//     allowlist re-checked at every hop.
//  3. arrayBuffer() buffered the whole response with no size cap. Now
//     capped, both by the declared Content-Length and by what actually
//     arrives.
//
// Nothing here needs auth to exercise, and there are no accounts,
// cookies or sessions on this origin today, so none of the above was
// urgent -- but account linking (see the armory repo) is planned for
// this same origin, and this is much cheaper to fix before that than
// after.
const ALLOWED_HOSTS = new Set([
  'avatars.githubusercontent.com',
  'github.com',
  'cdn.discordapp.com',
]);

// Raster image types only. Anything not on this list is refused rather
// than relabelled -- guessing at a type for content the upstream called
// something else is how sniffing bugs get reintroduced.
const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
]);

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB -- avatars are tens of KB; this is a ceiling, not a target
const MAX_REDIRECTS = 3;           // github.com/{u}.png -> avatars.githubusercontent.com needs one

function hostAllowed(url) {
  return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname);
}

export default async function handler(req, res) {
  const src = req.query.src;
  if (!src) {
    res.status(400).json({ error: 'missing src' });
    return;
  }

  let url;
  try {
    url = new URL(src);
  } catch (err) {
    res.status(400).json({ error: 'invalid src' });
    return;
  }

  if (!hostAllowed(url)) {
    res.status(400).json({ error: 'host not allowed' });
    return;
  }

  try {
    // Manual redirect following: every hop is re-checked against the
    // same allowlist the caller-supplied URL was checked against.
    let upstream;
    for (let hop = 0; ; hop++) {
      upstream = await fetch(url.toString(), { redirect: 'manual' });

      const isRedirect = upstream.status >= 300 && upstream.status < 400;
      if (!isRedirect) break;

      if (hop >= MAX_REDIRECTS) {
        res.status(502).json({ error: 'too many redirects' });
        return;
      }

      const location = upstream.headers.get('location');
      if (!location) {
        res.status(502).json({ error: 'redirect without location' });
        return;
      }

      let next;
      try {
        next = new URL(location, url); // relative Location headers are legal
      } catch (err) {
        res.status(502).json({ error: 'invalid redirect target' });
        return;
      }

      if (!hostAllowed(next)) {
        res.status(400).json({ error: 'redirect host not allowed' });
        return;
      }
      url = next;
    }

    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }

    // Content-Type carries parameters (`image/png; charset=...`), so
    // compare on the bare type.
    const declaredType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(declaredType)) {
      res.status(415).json({ error: 'upstream content type not allowed' });
      return;
    }

    const declaredLength = Number(upstream.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
      res.status(413).json({ error: 'upstream image too large' });
      return;
    }

    // Read with a real cap rather than trusting Content-Length, which
    // an upstream is free to understate or omit entirely.
    const chunks = [];
    let total = 0;
    for await (const chunk of upstream.body) {
      const buf = Buffer.from(chunk);
      total += buf.length;
      if (total > MAX_BYTES) {
        res.status(413).json({ error: 'upstream image too large' });
        return;
      }
      chunks.push(buf);
    }
    const buf = Buffer.concat(chunks, total);

    res.setHeader('Content-Type', declaredType);
    // Belt and braces on top of the type allowlist above: never let a
    // browser sniff its way to a different type, and give the response
    // no capabilities of its own if one ever is loaded top-level.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    // Same 5-minute edge cache as the JSON lookups -- there's only a
    // handful of distinct avatar URLs in play (one per contributor), so
    // this keeps real upstream traffic low without serving a stale
    // image for long if someone updates their profile picture.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).send(buf);
  } catch (err) {
    res.status(502).end();
  }
}
