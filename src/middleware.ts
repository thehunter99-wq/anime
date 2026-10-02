import { NextResponse, type NextRequest } from 'next/server';

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
 * Scope is deliberately narrow — it matches only the three prefixes that have a
 * canonical replacement. `/media/manga/*` is intentionally absent: manga has no
 * `/manga/[id]` route yet, so redirecting it would 404 real content.
 */
const LEGACY_PREFIXES: Record<string, string> = {
  movie: '/movie',
  anime: '/anime',
  tv: '/tv',
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);

  // ['media', '<type>', '<id-slug>']
  if (segments.length !== 3 || segments[0] !== 'media') return NextResponse.next();

  const basePath = LEGACY_PREFIXES[segments[1]];
  if (!basePath) return NextResponse.next();

  return NextResponse.redirect(buildDestination(basePath, extractId(segments[2]), request), 308);
}

export const config = {
  /**
   * Matched only on the three legacy prefixes, so the middleware never runs for
   * normal traffic. Running it on every request would add Edge latency to the
   * hot path for no benefit.
   */
  matcher: ['/media/movie/:path*', '/media/anime/:path*', '/media/tv/:path*'],
};
