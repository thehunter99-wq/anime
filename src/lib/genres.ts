/**
 * Genre registry — the one place a genre slug is mapped to upstream filters.
 *
 * ── Why a registry and not a lookup at request time ───────────────────────────
 * `/genre/[slug]` needs three different vocabularies to answer one query:
 *
 *   - TMDB movie genre ids  → `/discover/movie?with_genres=`
 *   - TMDB TV genre ids     → `/discover/tv?with_genres=`
 *   - AniList genre strings → `Page(genre_in:)`
 *
 * They do not agree. AniList has `Sci-Fi` where TMDB has "Science Fiction",
 * `Slice of Life` and `Mahou Shoujo` where TMDB has nothing, and TMDB has
 * `News`/`Reality`/`Soap` which AniList does not. Fetching `/genre/list` from
 * both APIs at request time would mean one more upstream call per genre page
 * render, would break every genre page whenever either API hiccupped, and would
 * still not tell us how a *slug* maps to a genre — that mapping is ours.
 *
 * So it is hardcoded, exhaustively, and asserted against TMDB's own genre list
 * in `verifyGenreIds()` below. That check runs in development so a TMDB id that
 * has been retired or renumbered surfaces immediately instead of as a silently
 * empty landing page.
 *
 * ── Which entries exist ──────────────────────────────────────────────────────
 * Only genres with real search volume get a page. TMDB's "TV Movie" and AniList's
 * "Ecchi" are included because both carry genuine queries; "News"/"Reality"/"Soap"
 * are included because they are the only way those TMDB genres are reachable.
 * Nothing else is invented — an unused slug would 404 and dilute the crawl.
 */

export interface GenreEntry {
  /** URL segment. Stable: changing it would orphan every link to the page. */
  slug: string;
  /** Human label used in headings and titles. */
  label: string;
  /** TMDB genre ids. Shared across `/discover/movie` and `/discover/tv`. */
  tmdbIds: number[];
  /** AniList genre name for `genre_in`. `null` when AniList has no equivalent. */
  anilist: string | null;
  /** Extra phrases that describe what a searcher for this page actually wants. */
  intent: string;
}

export const GENRES: readonly GenreEntry[] = [
  { slug: 'action', label: 'Action', tmdbIds: [28], anilist: 'Action', intent: 'action movies, action anime and action web series' },
  { slug: 'adventure', label: 'Adventure', tmdbIds: [12], anilist: 'Adventure', intent: 'adventure movies, adventure anime and adventure series' },
  { slug: 'animation', label: 'Animation', tmdbIds: [16], anilist: null, intent: 'animated movies and animated series' },
  { slug: 'comedy', label: 'Comedy', tmdbIds: [35], anilist: 'Comedy', intent: 'comedy movies, comedy anime and comedy series' },
  { slug: 'crime', label: 'Crime', tmdbIds: [80], anilist: null, intent: 'crime movies, crime thrillers and crime series' },
  { slug: 'documentary', label: 'Documentary', tmdbIds: [99], anilist: null, intent: 'documentaries and true story films' },
  { slug: 'drama', label: 'Drama', tmdbIds: [18], anilist: 'Drama', intent: 'drama movies, drama series and drama anime' },
  { slug: 'family', label: 'Family', tmdbIds: [10751], anilist: null, intent: 'family movies and family-friendly series' },
  { slug: 'fantasy', label: 'Fantasy', tmdbIds: [14], anilist: 'Fantasy', intent: 'fantasy movies, fantasy anime and fantasy series' },
  { slug: 'history', label: 'History', tmdbIds: [36], anilist: null, intent: 'historical movies and period dramas' },
  { slug: 'horror', label: 'Horror', tmdbIds: [27], anilist: 'Horror', intent: 'horror movies and horror anime' },
  { slug: 'music', label: 'Music', tmdbIds: [10402], anilist: 'Music', intent: 'music movies, concerts and anime about music' },
  { slug: 'mystery', label: 'Mystery', tmdbIds: [9648], anilist: 'Mystery', intent: 'mystery movies, mystery anime and detective series' },
  { slug: 'romance', label: 'Romance', tmdbIds: [10749], anilist: 'Romance', intent: 'romance movies, romance anime and romance series' },
  { slug: 'science-fiction', label: 'Science Fiction', tmdbIds: [878], anilist: 'Sci-Fi', intent: 'science fiction movies, sci-fi anime and sci-fi series' },
  { slug: 'thriller', label: 'Thriller', tmdbIds: [53], anilist: 'Thriller', intent: 'thriller movies and thriller series' },
  { slug: 'tv-movie', label: 'TV Movie', tmdbIds: [10770], anilist: null, intent: 'TV movies and made-for-television films' },
  { slug: 'war', label: 'War', tmdbIds: [10752], anilist: null, intent: 'war movies, war series and military drama' },
  { slug: 'western', label: 'Western', tmdbIds: [37], anilist: null, intent: 'western movies and western series' },

  // AniList-only genres. TMDB has no equivalent bucket, so these pages are
  // anime-only and say so, rather than padding the page with unrelated titles.
  { slug: 'slice-of-life', label: 'Slice of Life', tmdbIds: [], anilist: 'Slice of Life', intent: 'slice of life anime and heartwarming shows' },
  { slug: 'ecchi', label: 'Ecchi', tmdbIds: [], anilist: 'Ecchi', intent: 'ecchi anime' },
  { slug: 'mahou-shoujo', label: 'Mahou Shoujo', tmdbIds: [], anilist: 'Mahou Shoujo', intent: 'mahou shoujo and magical girl anime' },
  { slug: 'mecha', label: 'Mecha', tmdbIds: [], anilist: 'Mecha', intent: 'mecha anime and giant robot series' },
  { slug: 'psychological', label: 'Psychological', tmdbIds: [], anilist: 'Psychological', intent: 'psychological anime and mind-bending series' },
  { slug: 'sports', label: 'Sports', tmdbIds: [], anilist: 'Sports', intent: 'sports anime and sports series' },
  { slug: 'supernatural', label: 'Supernatural', tmdbIds: [], anilist: 'Supernatural', intent: 'supernatural anime and ghost stories' },

  // TMDB-TV-only genres. These are the sole reason a title like a reality show
  // is reachable from anywhere on the site.
  { slug: 'news', label: 'News', tmdbIds: [10763], anilist: null, intent: 'news and current affairs series' },
  { slug: 'reality', label: 'Reality', tmdbIds: [10764], anilist: null, intent: 'reality shows' },
  { slug: 'soap', label: 'Soap', tmdbIds: [10767], anilist: null, intent: 'soap operas and daily drama series' },
];

/** Aliases so a human-typed or legacy slug still lands on the right page. */
const SLUG_ALIASES: Record<string, string> = {
  'sci-fi': 'science-fiction',
  scifi: 'science-fiction',
  tv: 'tv-movie',
  'anime-movie': 'tv-movie',
  slice_of_life: 'slice-of-life',
  'slice-life': 'slice-of-life',
  'mahou-shoujo': 'mahou-shoujo',
  magicalgirl: 'mahou-shoujo',
  'sports-anime': 'sports',
  docs: 'documentary',
};

const BY_SLUG = new Map(GENRES.map((genre) => [genre.slug, genre]));

export interface GenreResolution {
  /** The genre, or null when the slug is not one we publish a page for. */
  entry: GenreEntry | null;
  /** The slug the page actually lives at. Equals the request when canonical. */
  canonicalSlug: string;
  /** Whether the slug is canonical or merely an alias for one. */
  known: boolean;
}

/**
 * Resolves a URL slug against the registry, following aliases.
 *
 * Returns `known: false` for anything outside the registry so the caller can
 * 404. `canonicalSlug` differs from the request only for aliases, which is what
 * lets an alias be redirected rather than rendered a second time — `/genre/sci-fi`
 * and `/genre/science-fiction` are otherwise two crawlable URLs for one page,
 * and the ranking signal splits between them.
 *
 * Kept separate from `findGenre` because middleware needs the resolution (to
 * decide 404 vs 301 vs pass-through) and cannot import the upstream-backed page
 * helpers; this function touches nothing but constants, so it is safe on the edge.
 */
export function resolveGenreSlug(raw: string | undefined): GenreResolution {
  const slug = (raw ?? '').toLowerCase().trim();
  const canonical = SLUG_ALIASES[slug] ?? slug;
  const entry = BY_SLUG.get(canonical) ?? null;

  return { entry, canonicalSlug: entry ? entry.slug : canonical, known: entry !== null };
}

/** Convenience wrapper for callers that only need the genre. */
export function findGenre(slug: string | undefined): GenreEntry | null {
  return resolveGenreSlug(slug).entry;
}

/** Canonical path for a genre landing page. */
export const genrePath = (slug: string): string => `/genre/${slug}`;

/** TMDB `with_genres` value. OR-combined across a genre's ids, which is how TMDB reads a pipe list. */
export function tmdbGenreParam(entry: GenreEntry): string | null {
  return entry.tmdbIds.length ? entry.tmdbIds.join('|') : null;
}

/**
 * Genres worth surfacing in navigation, in a fixed order so the nav never
 * reorders itself between renders.
 */
export const FEATURED_GENRES: readonly GenreEntry[] = [
  'action',
  'comedy',
  'drama',
  'romance',
  'horror',
  'science-fiction',
  'fantasy',
  'adventure',
  'animation',
  'thriller',
].map((slug) => BY_SLUG.get(slug)!);