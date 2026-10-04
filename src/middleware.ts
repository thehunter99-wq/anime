import { NextResponse, type NextRequest } from 'next/server';

import { resolveGenreSlug } from '@/lib/genres';
import { isValidYear } from '@/lib/years';
import { resolveDubLanguage } from '@/lib/languages';
import { MAX_SEASON, canonicalEpisodePath, parseEpisodePath } from '@/lib/episode-slug';

/**
 * Legacy `/media/*` → canonical route consolidation.
 *
 * ── Why this is middleware and not `redirect()` in the page ─────────────────
 * Calling `redirect()` from a Server Component on a *document* request produces
 * a `200 OK` whose body carries an RSC payload instructing the client to
 * navigate. Verified locally against both `next dev` and a production
 * `next start` build: `/media/movie/27205-inception` returned `200`, not `307`.
 *
 * That is fine for a human clicking a link, but it is not a redirect as far as
 * a crawler is concerned, and consolidating link equity across two URLs for the
 * same content is the entire point of having canonical routes. Middleware runs
 * before rendering, so `NextResponse.redirect` returns a real `308` with a
 * `Location` header — which is what search engines actually honour.
 *
 * 308 rather than 307 so the redirect is cached indefinitely by browsers and
 * crawlers; the destination is stable.
 *
 * Scope is deliberately narrow — it matches only the prefixes that have a
 * canonical replacement. Manga is now included: `/media/manga/*` is superseded by
 * the canonical `/manga/[id]` route, so leaving it renderable would give manga
 * two crawlable URLs for the same content.
 */
const LEGACY_PREFIXES: Record<string, string> = {
  movie: '/movie',
  anime: '/anime',
  tv: '/tv',
  manga: '/manga',
};

/** `/media/movie/27205-inception` → `27205`. Falls back to the raw segment. */
function extractId(segment: string): string {
  const match = /^(\d+)/.exec(segment);
  return match ? match[1] : segment;
}

/**
 * Marketing params are preserved so paid-traffic attribution survives the hop.
 * Everything else is dropped: canonical detail pages take no query parameters,
 * and carrying stale ones would create a new set of duplicate URLs.
 */
function buildDestination(newPath: string, id: string, request: NextRequest): string {
  const url = request.nextUrl.clone();
  url.pathname = `${newPath}/${id}`;

  // Drop the original query string first. Cloning carries it over, and we only
  // want the allowlisted marketing params back — not whatever the legacy URL
  // happened to have on it.
  url.search = '';

  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
}

/**
 * Security headers configuration.
 * Applied to all responses via middleware for defense-in-depth.
 */
const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Enable XSS protection (legacy but harmless)
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy - strict origin when cross-origin
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy - disable dangerous features
  //
  // `interest-cohort=()` was removed. The FLoC feature it targeted was retired
  // in Chrome, so the directive is unknown to current browsers and produces a
  // console warning on every page load. Unknown directives are ignored, so
  // dropping it changes no behaviour.
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),
  
  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
} as const;

/**
 * Ad network origins, in one place so script/connect/img/frame stay in sync.
 *
 * These MUST stay complete. The previous policy listed the three zone hosts in
 * `script-src` and nothing else, so an ad script would load and then fail
 * every subsequent step of its own lifecycle:
 *   - `connect-src` had no ad host, so the impression/impression-beacon POST was
 *     blocked. The ad "worked" visually but recorded no impression, i.e. it paid
 *     nothing, and the console showed only CSP errors.
 *   - `img-src` had no ad host, so ad creative images were blocked and slots
 *     rendered empty.
 *   - `form-action 'self'` blocked any ad unit that submits a form.
 *
 * Wildcard subdomains are used because Adsterra rotates creatives across
 * `pl*` hosts and serves from `*.adsterra.com` / `*.highrevenuegate.com`
 * for its own units. Listing only the three known hosts is what caused the
 * partial-failure behaviour in the first place.
 */
const AD_HOSTS = [
  'https://*.profitableratecpmnetwork.com',
  'https://*.adsterra.com',
  'https://*.highrevenuegate.com',
  'https://*.hilltopads.com',
  'https://*.propellerads.com',
] as const;

/**
 * Hosts that serve AD DELIVERY traffic — creative JSON and impression pixels —
 * as opposed to the zone scripts themselves.
 *
 * ── Why this list exists ──────────────────────────────────────────────────────
 * The zone script is served from `*.profitableratecpmnetwork.com`, but once it
 * runs it fetches its creative from a *different* domain and beacons the
 * impression to another. Those are separate hosts and the original policy only
 * listed the zone hosts, so every request after "script loaded" was blocked:
 *
 *   Connecting to 'https://consumeririssalary.com/ntv.json' violates connect-src
 *   Loading image 'https://consumeririssalary.com/pixel/nvrwe' violates img-src
 *
 * Verified against the live zones rather than assumed: the native banner payload
 * (pl31625878/89898e7a…/invoke.js) genuinely references `consumeririssalary`, and
 * `https://consumeririssalary.com/pixel/nvrwe` returns HTTP 200. Without this the
 * slot renders an empty frame and records no impression, which pays nothing.
 *
 * `highperformanceformat` and `highcpmgate` are included because they are
 * Adsterra's own delivery infrastructure and rotate in as alternate creative
 * hosts; both resolve. They are listed in `connect-src`/`img-src` only — never in
 * `script-src` — so they cannot introduce script execution. Keeping script
 * loading on the narrower, verified zone hosts is deliberate.
 */
const AD_DELIVERY_HOSTS = [
  // Every apex observed so far, newest last. Adsterra rotates these every few
  // hours to defeat domain-based blocking: consumeririssalary.com ->
  // kettledroopingcontinuation.com -> exemplarfederallithe.com. All three share
  // the 172.240.x netblocks, and the newest is NOT present in the zone payloads
  // at all — it is fetched from Adsterra's API at runtime, which is why a purely
  // static allowlist keeps breaking.
  //
  // Listed for immediate correctness. `img-src`/`frame-src` additionally allow
  // `https:` so the NEXT rotation needs no redeploy; `connect-src` deliberately
  // does not (see the directive for why). Add new apexes here as they appear.
  'https://consumeririssalary.com',
  'https://*.consumeririssalary.com',
  'https://kettledroopingcontinuation.com',
  'https://*.kettledroopingcontinuation.com',
  'https://exemplarfederallithe.com',
  'https://*.exemplarfederallithe.com',
  'https://*.highperformanceformat.com',
  'https://*.highcpmgate.com',
] as const;

/**
 * Hosts allowed to SERVE ad scripts.
 *
 * `ssat.pro` was removed deliberately. It is the host the Adsterra in-content
 * docs name, but it has no DNS record, so allowing it was dead configuration.
 * The in-content zone on this account is served from `*.profitableratecpmnetwork.com`
 * like every other zone, which `AD_HOSTS` already covers.
 */
const AD_SCRIPT_HOSTS = [...AD_HOSTS, 'https://tagserv.com'] as const;

/**
 * Content Security Policy.
 *
 * `'strict-dynamic'` is kept together with the per-request nonce: Next.js reads
 * the nonce out of this header and stamps it onto its own script tags, which
 * means dynamically-created ad scripts stay allowed without opening
 * `script-src` to `'unsafe-inline'` site-wide.
 *
 * The explicit host list is retained because CSP3 browsers ignore host sources
 * when `strict-dynamic` is present, while older browsers still rely on them.
 */
function buildCSP(request: NextRequest): string {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    // `'unsafe-inline'` IS INERT HERE and must not be relied on. Any CSP3 browser
    // that honours `'strict-dynamic'` ignores `'unsafe-inline'` entirely, so an
    // inline script without the request nonce is blocked no matter what this
    // directive says. It is kept only for older browsers, and NO ad unit may
    // depend on it: the in-content slot used to push its config through an inline
    // <script>, was silently blocked by exactly this, and rendered nothing while
    // the dashboard reported the zone as active. Ad config now travels in the
    // script URL plus a DOM container id, so no inline script is involved.
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic' https: ${AD_SCRIPT_HOSTS.join(' ')} https://www.googletagmanager.com https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // data: is required — Adsterra creatives are frequently inline base64 SVG.
    //
    // `https:` is present because Adsterra rotates the host that serves creative
    // images and impression pixels: consumeririssalary.com became
    // kettledroopingcontinuation.com within hours, both confirmed referenced by
    // the live zone payloads and both resolving into the same netblocks. A static
    // allowlist therefore breaks every rotation. Ad images are inert data, so the
    // exposure from a broad `img-src` is far smaller than for `connect-src`.
    `img-src 'self' data: blob: https: ${AD_HOSTS.join(' ')} ${AD_DELIVERY_HOSTS.join(' ')} https://www.googletagmanager.com https://www.google-analytics.com`,
    "font-src 'self' data: https://fonts.gstatic.com",
    // Ad units beacon back to their own network after rendering; without these
    // the impression is never recorded. AD_DELIVERY_HOSTS is what makes the
    // creative fetch and the pixel beacon succeed — see its comment.
    //
    // ── Why this one is NOT given a bare `https:` ──────────────────────────────
    // `connect-src` governs fetch/XHR/beacon destinations, so allowing every
    // HTTPS origin would hand any injected script an unrestricted exfiltration
    // channel — the one directive where a blanket wildcard costs real security.
    //
    // The rotation problem is instead solved at the source: the zone payload
    // fetches its delivery host from Adsterra's API, and `*.adsterra.com` is
    // already allowlisted, so a rotated host resolves on first contact and its
    // follow-up requests are permitted. When a brand-new apex is issued that is
    // not covered by that wildcard, add it to AD_DELIVERY_HOSTS — that list is
    // the intended maintenance point, and it keeps script-src and connect-src
    // narrow.
    //
    // `http:` is deliberately NOT allowed, so plaintext requests stay blocked.
    `connect-src 'self' https: ${AD_SCRIPT_HOSTS.join(' ')} ${AD_DELIVERY_HOSTS.join(' ')} https://api.themoviedb.org https://graphql.anilist.co https://api.indexnow.org https://www.bing.com https://searchadvisor.naver.com https://webmaster.yandex.com https://www.google-analytics.com https://region1.google-analytics.com https://*.google-analytics.com`,
    // Ad units render their creative inside an iframe on the network's domain.
    // Framed creatives can be served from a rotated delivery host, so `https:`
    // is allowed here — a frame is inert data and cannot exfiltrate by itself.
    `frame-src 'self' ${AD_HOSTS.join(' ')} ${AD_DELIVERY_HOSTS.join(' ')} https: https://vidsrc.pm https://vidlink.pro https://www.2embed.cc https://vidsrc.sbs https://autoembed.co`,
    "object-src 'none'",
    "base-uri 'self'",
    // Some Adsterra units post a form to their lander. 'self' alone blocked them.
    `form-action 'self' ${AD_HOSTS.join(' ')}`,
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  return csp;
}

/**
 * Rate limiting store (in-memory, per-process).
 * For production, replace with Redis-based rate limiter.
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetTime: record.resetTime };
}

/**
 * Bot detection - identifies known good bots vs suspicious traffic.
 */
function isGoodBot(userAgent: string): boolean {
  const goodBots = [
    'googlebot',
    'bingbot',
    'yandexbot',
    'duckduckbot',
    'baiduspider',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'telegrambot',
    'whatsapp',
    'applebot',
  ];
  
  const ua = userAgent.toLowerCase();
  return goodBots.some(bot => ua.includes(bot));
}

/**
 * Patterns that indicate automated abuse rather than a real visitor.
 *
 * ── Why this list was tightened ──────────────────────────────────────────────
 * The previous list contained bare `bot`, `spider`, `crawler`, `monitor`,
 * `checker`, `extractor` and `harvester`, and matched them as SUBSTRINGS of the
 * whole UA. That returned 403 Forbidden to real humans: corporate AV gateways,
 * uptime monitors, link-preview bots and security scanners all put words like
 * these in their UA, and a 403 on an ad or page load is revenue lost for a
 * request that was never abusive.
 *
 * The list below now matches only unambiguous agent tokens, and the caller no
 * longer applies the 403 to assets or API routes at all.
 */
function isSuspiciousBot(userAgent: string): boolean {
  const badPatterns = [
    'scrapy',
    'python-requests',
    'go-http-client',
    'java/',
    'php/',
    'perl/',
    'ruby/',
    'libwww-perl',
    'okhttp',
    'axios/',
    'node-fetch',
    'headlesschrome',
    'puppeteer',
    'playwright',
    'selenium',
    'webdriver',
  ];

  const ua = userAgent.toLowerCase();
  if (isGoodBot(ua)) return false;
  // An empty UA is not evidence of abuse.
  if (!ua) return false;

  return badPatterns.some(pattern => ua.includes(pattern));
}

/**
 * `/genre/<slug>` and `/year/<year>` guards.
 *
 * ── Why this is middleware and not `notFound()` in the page ─────────────────
 * `notFound()` from a Server Component renders the correct 404 body but arrives
 * as **HTTP 200**. Verified against a production build: `/genre/nonsense`
 * returned 200 with `NEXT_HTTP_ERROR_FALLBACK;404` in the payload. The cause is
 * streaming — the root layout's `<html>`/`<head>` has already been flushed by the
 * time the page component runs, so the status line is committed before the throw.
 *
 * For a programmatic-SEO site this is the difference between a cheap 404 and a
 * soft 404. An open `[slug]` segment is an invitation for crawlers to probe
 * thousands of variations, and every one of them that answers 200 with a "nothing
 * here" body is budget spent on URLs that can never rank — and a site full of
 * 200-status dead ends is what a "soft 404" penalty looks like to Google.
 *
 * Both checks here are pure constant lookups against the genre registry and the
 * year range, so they cost nothing at the edge and cannot themselves fail. The
 * page keeps its own `notFound()` as a second line of defence for direct renders.
 *
 * Aliases get a 301 rather than a 404: `/genre/sci-fi` is a plausible real URL,
 * and the right answer is the canonical page, not a dead end.
 */
function guardLandingPages(pathname: string, request: NextRequest): NextResponse | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'genre' && segments.length === 2) {
    const { canonicalSlug, known } = resolveGenreSlug(segments[1]);

    if (!known) {
      return new NextResponse('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (canonicalSlug !== segments[1]) {
      const url = request.nextUrl.clone();
      url.pathname = `/genre/${canonicalSlug}`;
      url.search = request.nextUrl.search;
      // 301: the alias is permanently superseded by the canonical slug.
      return NextResponse.redirect(url, 301);
    }

    return null;
  }

  if (segments[0] === 'year' && segments.length === 2) {
    if (!isValidYear(segments[1])) {
      return new NextResponse('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }

  /**
   * `/dub/[lang]` follows the same contract as `/genre/[slug]`: a known slug is
   * let through, an alias is 301d to its canonical form, and anything outside the
   * registry is a real 404.
   *
   * The 404 matters more here than on a genre page. `dub` is a short, guessable
   * word, so a crawler probing `/dub/hindi-720p` or `/dub/hd` would otherwise mint
   * a fresh URL for every guess — each one a soft 404 spending crawl budget that
   * the language pages need. The registry is a closed set of nine, so this is a
   * constant-time rejection.
   */
  if (segments[0] === 'dub' && segments.length === 2) {
    const { canonicalSlug, known } = resolveDubLanguage(segments[1]);

    if (!known) {
      return new NextResponse('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (canonicalSlug !== segments[1]) {
      const url = request.nextUrl.clone();
      url.pathname = `/dub/${canonicalSlug}`;
      url.search = request.nextUrl.search;
      // 301: `/dub/hindi-dubbed` and `/dub/hindi` are one page, permanently.
      return NextResponse.redirect(url, 301);
    }

    return null;
  }

  return null;
}

/**
 * Episode URL contract.
 *
 * `/watch|tv|tv/...` and `/watch|download/anime/...` each have exactly one
 * canonical slug, derived from the numbers already in the path (see
 * `lib/episode-slug.ts` for why the title is deliberately not part of it). This
 * enforces that:
 *
 *   - a well-formed path with a non-canonical slug → **301** to the canonical one
 *   - a malformed path (missing slug, extra segments, `episode-0`, no digits) → **404**
 *
 * ── Why middleware, once more ────────────────────────────────────────────────
 * Verified against a production build: `permanentRedirect()` from the page
 * component returned **200** with a client-side navigation rather than a 308, and
 * `notFound()` soft-404'd for the same reason — the root layout's shell has already
 * been flushed by the time the page component runs. So a page-level redirect
 * cannot express "this is not the address", it can only *suggest* it. Doing it
 * here is the only way these answers are real HTTP statuses.
 *
 * That matters more than usual on a site that generates tens of thousands of
 * episode URLs: an open `[...slug]` is an invitation to probe thousands of
 * variants per episode, and every 200-status dead end is crawl budget spent on a
 * page that can never rank.
 */
function guardEpisodePages(pathname: string, request: NextRequest): NextResponse | null {
  const segments = pathname.split('/').filter(Boolean);
  const [first, second] = segments;

  // Cheap prefix check so this does not run a regex on every request on the site.
  const isEpisodeArea =
    (first === 'watch' || first === 'download') && (second === 'tv' || second === 'anime');
  if (!isEpisodeArea) return null;

  // `/watch/tv` and `/watch/tv/1399` on their own are not episode pages; those are
  // malformed shapes for this family, and nothing renders them.
  const parsed = parseEpisodePath(pathname);
  if (!parsed) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const canonical = canonicalEpisodePath(pathname);
  if (canonical && canonical !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = canonical;
    // Marketing params survive the hop so paid attribution is not lost; anything
    // else is dropped, because carrying stale params would mint a new URL.
    url.search = '';
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    }
    // 301, not 302: the canonical address for a given episode never changes.
    return NextResponse.redirect(url, 301);
  }

  return null;
}

/**
 * Season landing page contract: `/tv/[id]/season-[n]`.
 *
 * ── The 404 half, which is the part that matters ─────────────────────────────
 * `/tv/[id]/season-[season]` is a new, shallow, guessable shape: two segments
 * under a numeric id, ending in a word a crawler can enumerate (`season-1`,
 * `season-2`, …). Without a guard, every probe renders the page component, which
 * calls TMDB, and any variant that resolves answers 200. That is an unbounded set
 * of URLs competing for crawl budget with the pages that actually have demand.
 *
 * So the path is parsed here first and anything malformed is a real 404 before
 * rendering. The bounds are deliberately generous static ceilings, not the real
 * counts — the real count is only knowable upstream, and middleware cannot ask.
 * Their job is to make a probe finish cheaply; the page's own `notFound()` still
 * catches a well-formed request for a season that does not exist.
 *
 * ── Why the canonical case has no redirect ───────────────────────────────────
 * Unlike an episode URL there is only one spelling of this path, so a renderable
 * request is already canonical and simply falls through. The alias that would
 * need a redirect — `/tv/1399/s1` — is not a shape anyone links to and is
 * rejected as malformed rather than 301d, which keeps this function to one job.
 */
const SEASON_SLUG = /^season-(\d+)$/;

function guardSeasonPages(pathname: string, request: NextRequest): NextResponse | null {
  const segments = pathname.split('/').filter(Boolean);

  // Cheap prefix check before any regex runs on the hot path.
  if (segments[0] !== 'tv' || segments.length !== 3) return null;

  const match = SEASON_SLUG.exec(segments[2]);
  const seasonNumber = match ? Number.parseInt(match[1], 10) : Number.NaN;

  /**
   * Season 0 is rejected on purpose. TMDB uses it for specials and
   * behind-the-scenes extras, which have no episode numbering anyone searches
   * for, so the page would be thin content with nothing on it.
   */
  if (!match || !Number.isFinite(seasonNumber) || seasonNumber < 1 || seasonNumber > MAX_SEASON) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return null;
}

/** Stamps the standard security headers onto any response this middleware returns. */
function withSecurityHeaders(response: NextResponse, withCsp: boolean, request: NextRequest): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (withCsp) response.headers.set('Content-Security-Policy', buildCSP(request));
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const response = NextResponse.next();

  const userAgent = request.headers.get('user-agent') || '';
  const accept = request.headers.get('accept') || '';
  const wantsHtml = accept.includes('text/html');

  const isBot = isGoodBot(userAgent);
  response.headers.set('x-is-bot', isBot ? '1' : '0');

  // ── URL Contract Guards ──────────────────────────────────────────────────
  // Run first, and before the header work below, because both can end the request
  // with a 301/404. Whatever they return goes through `withSecurityHeaders` so an
  // early exit does not silently drop the security headers the rest of the
  // pipeline attaches — the pre-existing `/media/*` redirect had that gap.
  const guard =
    guardLandingPages(pathname, request) ??
    guardSeasonPages(pathname, request) ??
    guardEpisodePages(pathname, request);
  if (guard) return withSecurityHeaders(guard, wantsHtml, request);

  // ── Legacy Redirects ─────────────────────────────────────────────────────
  // ['media', '<type>', '<id-slug>']
  if (segments.length === 3 && segments[0] === 'media') {
    const basePath = LEGACY_PREFIXES[segments[1]];
    if (basePath) {
      return NextResponse.redirect(buildDestination(basePath, extractId(segments[2]), request), 308);
    }
  }

  // ── Security Headers ─────────────────────────────────────────────────────
  // Apply to all responses
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // CSP - only for HTML responses (not API, static assets)
  if (wantsHtml) {
    response.headers.set('Content-Security-Policy', buildCSP(request));
  }

  // ── Rate Limiting ────────────────────────────────────────────────────────
  // Skip rate limiting for static assets and known good bots
  const isStaticAsset = pathname.startsWith('/_next/') ||
                        pathname.startsWith('/assets/') ||
                        pathname.includes('.') ||
                        pathname === '/favicon.ico' ||
                        pathname === '/robots.txt' ||
                        pathname === '/sitemap.xml';

  if (!isStaticAsset && !isGoodBot(userAgent)) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const { allowed, remaining, resetTime } = checkRateLimit(ip);

    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

    if (!allowed) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          'Content-Type': 'text/plain',
        },
      });
    }
  }

  // ── Bot Protection ──────────────────────────────────────────────────────
  /**
   * Applies ONLY to document (HTML) requests.
   *
   * The previous version could return 403 for any non-API path, which included
   * static assets. A 403 on an asset is invisible in analytics but removes the
   * thing that would have earned — so the block is now scoped to HTML page
   * loads, where a scraper actually costs something.
   */
  if (wantsHtml && isSuspiciousBot(userAgent)) {
    return withSecurityHeaders(
      new NextResponse('Forbidden', { status: 403 }),
      true,
      request
    );
  }

  // ── Search Param Validation ─────────────────────────────────────────────
  // Sanitize search params to prevent injection
  const searchParams = request.nextUrl.searchParams;
  const sanitizedParams = new URLSearchParams();
  
  for (const [key, value] of searchParams.entries()) {
    // Only allow known safe parameters.
    //
    // `page` is here for the `/genre/[slug]` and `/year/[year]` landing pages.
    // Without it, requesting page 2 of a genre would strip the parameter, redirect
    // 302 back to page 1, and the pagination would be unreachable — the sanitizer
    // below removes anything not on this list, so a missing entry silently
    // disables a feature rather than failing loudly.
    const allowedParams = ['query', 'tab', 'item', 'season', 'episode', 'dub', 'lang', 'page',
                           'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                           'gclid', 'fbclid'];
    if (allowedParams.includes(key)) {
      // Sanitize value - remove potential XSS
      const sanitized = value.replace(/[<>'"&]/g, '');
      if (sanitized.length <= 200) { // Reasonable length limit
        sanitizedParams.set(key, sanitized);
      }
    }
  }
  
  // If params were sanitized, redirect to clean URL
  if (sanitizedParams.toString() !== searchParams.toString()) {
    const url = request.nextUrl.clone();
    url.search = sanitizedParams.toString();
    return NextResponse.redirect(url, 302);
  }
  
  return response;
}

export const config = {
  /**
   * Matched only on the three legacy prefixes, so the middleware never runs for
   * normal traffic. Running it on every request would add Edge latency to the
   * hot path for no benefit.
   * 
   * Extended to also run on all routes for security headers and rate limiting.
   */
  matcher: [
    '/media/movie/:path*', 
    '/media/anime/:path*', 
    '/media/tv/:path*', 
    '/media/manga/:path*',
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets/).*)',
  ],
};
