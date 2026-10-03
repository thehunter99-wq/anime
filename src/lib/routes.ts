/**
 * Canonical URL builders — the single source of truth for every path on the site.
 *
 * WHY THIS EXISTS
 * The project previously scattered `/media/...` template literals across ten
 * components. That made it possible for two URLs to serve the same entity, which
 * is duplicate content: Google picks one, splits link equity between them, and
 * both rank lower. Centralising the paths means a route can be renamed in one
 * place and every link, canonical tag, sitemap entry and redirect agrees.
 *
 * CANONICAL PATHS
 *   /movie/[id]     TMDB movie detail      (canonical)
 *   /anime/[id]     AniList anime detail   (canonical)
 *   /manga/[id]     AniList manga detail   (canonical)
 *   /tv/[id]        TMDB series detail     (canonical)
 *   /view/[type]    player                 (canonical, not indexed)
 *
 * Numeric ids, not slugs: a slug forces a redirect whenever a title is
 * re-translated or romanised, and those redirects leak link equity.
 */

/** TMDB movie detail page. `id` is the TMDB movie id. */
export const moviePath = (id: number | string): string => `/movie/${id}`;

/** AniList anime detail page. `id` is the AniList id. */
export const animePath = (id: number | string): string => `/anime/${id}`;

/** AniList manga detail page. */
export const mangaPath = (id: number | string): string => `/manga/${id}`;

/** TMDB series detail page. */
export const tvPath = (id: number | string): string => `/tv/${id}`;

/**
 * Season landing page for a TV series: `/tv/[id]/season-[n]`.
 *
 * ── Why this is its own route ────────────────────────────────────────────────
 * "breaking bad season 2" and "money heist season 3 watch online" are head terms
 * in their own right, distinct from both the series page (which sells the whole
 * show) and the episode page (which sells one episode). Without this route the
 * query has no page with matching title, heading and canonical, so it either
 * lands on the series page and competes for the wrong intent, or does not rank.
 *
 * The segment is `season-N`, matching the episode routes, so the two families
 * read the same way in a URL and in a server log.
 */
export const tvSeasonPath = (id: number | string, seasonNumber: number | string): string =>
  `/tv/${id}/season-${seasonNumber}`;

/**
 * Dubbed / subbed landing pages: `/dub`, `/dub/[lang]` and `/sub`.
 *
 * `/sub` is a real page rather than a redirect to `/anime`, because "english sub
 * anime" is a query with its own intent and a hub of subbed titles answers it
 * without the visitor having to work out which of the listed titles are subbed.
 */
export const dubPath = (language?: string): string =>
  language ? `/dub/${language}` : '/dub';

export const subPath = (): string => '/sub';

/**
 * Player route. Kept out of the sitemap and marked `noindex` because it is a
 * thin wrapper around a third-party embed, and indexing it competes with the
 * detail page for the same keywords.
 *
 * ── Corrected prefix ────────────────────────────────────────────────────────
 * This previously returned `/watch/${kind}/${id}`, but **no `/watch` route has
 * ever existed**. The player is served by `app/view/[type]/[id-slug]`, so every
 * caller was building a URL that 404s — including the primary "Watch" button on
 * all three detail pages. Verified: `/watch/anime/21` returns 404 while
 * `/view/anime/21` returns 200.
 *
 * The bare-id form is used rather than `id-slug` because this helper only
 * receives an id, and `app/view/[type]/[id-slug]` parses the id from the first
 * `-`-separated segment, so a bare id resolves correctly (verified for movie,
 * tv and anime). Callers that have a title available — `viewer.tsx` and
 * `json-ld.tsx` — build the slugs themselves.
 */
export const watchPath = (
  kind: 'movie' | 'tv' | 'anime' | 'manga',
  id: number | string
): string => `/view/${kind}/${id}`;

/**
 * Long-tail download routes. These map to the `/download/[type]/[id]/[...slug]`
 * pages which are indexed and serve download-focused SEO content.
 */
export const downloadPath = (
  kind: 'movie' | 'tv' | 'anime' | 'manga',
  id: number | string
): string => `/download/${kind}/${id}`;

/**
 * Legacy `/media/...` routes are superseded by the canonical paths above.
 * Kept here so the redirect handlers and any legacy inbound link share one
 * definition of what the old path meant.
 */
export const legacyMediaPath = (
  type: string,
  id: number | string,
  slug: string
): string => `/media/${type}/${id}-${slug}`;

/** Detail path for an AniList entry, which may be anime or manga. */
export function animeOrMangaPath(
  anilistType: string,
  id: number | string
): string {
  return anilistType.toUpperCase() === 'MANGA' ? mangaPath(id) : animePath(id);
}

/** Absolute URL for a path, used by canonical tags, OG and the sitemap. */
export function absoluteUrl(path: string, siteUrl: string): string {
  if (path.startsWith('http')) return path;
  return `${siteUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Parses an id from either a bare (`/movie/550`) or slugged
 * (`/media/movie/550-fight-club`) path segment.
 */
export function parseIdFromSegment(segment: string): number {
  return Number.parseInt(segment.split('-')[0], 10);
}