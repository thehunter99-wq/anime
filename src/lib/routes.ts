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
 *   /watch/...      player                 (canonical, not indexed)
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
 * Player route. Kept out of the sitemap and marked `noindex` because it is a
 * thin wrapper around a third-party embed, and indexing it competes with the
 * detail page for the same keywords.
 */
export const watchPath = (
  kind: 'movie' | 'tv' | 'anime' | 'manga',
  id: number | string
): string => `/watch/${kind}/${id}`;

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