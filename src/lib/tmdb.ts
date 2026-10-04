
import { type Episode, type Movie, type Season, type TMDBResponse, type TVShow } from './types';
import { fetchWithRetry, getTMDBKey } from './health';
import { DATA_REVALIDATE_SECONDS } from './cache-constants';

const TMDB_API_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = getTMDBKey();
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

export const isTMDBConfigured = Boolean(TMDB_API_KEY);

let hasWarned = false;
function warnMissingKey() {
  if (hasWarned) return;
  hasWarned = true;
  console.warn(
    '[TMDB] NEXT_PUBLIC_TMDB_API_KEY is missing or empty. Add a valid TMDB API key to .env.local and restart the dev server. Until then, all TMDB-dependent rails (movies, TV, anime, search) will return empty results.'
  );
}

/**
 * TMDB image renditions this site links to.
 *
 * `w780` is not decoration: it is the only size TMDB offers in a 16:9 ratio,
 * so it is what episode stills and OpenGraph video thumbnails must use. The
 * poster sizes are 2:3 and would be letterboxed by every social preview if they
 * were substituted for a still frame.
 */
export type TMDBImageSize = 'w300' | 'w342' | 'w500' | 'w780' | 'original';

export function getTMDBImageUrl(path: string | null | undefined, size: TMDBImageSize = 'w500') {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}${size}${path}`;
}

/**
 * TMDB is unreachable on some networks (blocked DNS, sinkholed IP, firewall).
 *
 * Without a tight budget every rail pays the full retry timeout, so one page
 * render stalls for well over a minute across a dozen sequential calls. Two
 * guards prevent that:
 *
 *  1. Each call is capped at 3s per attempt and fails fast to empty results.
 *  2. A breaker stops probing entirely once the host looks unreachable, so the
 *     remaining rails on the same render return instantly. It resets on the
 *     next successful call, and a dev-server restart re-probes.
 *
 * Deliberately not tripped by HTTP error statuses: a 401 or 404 means TMDB
 * answered, which is fast and does not warrant blocking later calls.
 */
const TMDB_TIMEOUT_MS = 3000;
const TMDB_ATTEMPTS = 2;
const TMDB_BACKOFF_MS = 300;
const TMDB_BREAKER_THRESHOLD = 3;

let consecutiveTransportFailures = 0;
let breakerTripped = false;
let hasWarnedBreaker = false;

/**
 * Whether TMDB is currently failing to *answer* rather than genuinely reporting
 * "no such title".
 *
 * ── Why this flag exists ─────────────────────────────────────────────────────
 * `tmdbFetch` deliberately fails soft and returns `{ results: [] }` for every
 * error so that a rail never breaks a page. But `fetchMovieById` then maps that
 * to `null`, and a detail page maps `null` to `notFound()` — which means a TMDB
 * outage is indistinguishable from a real 404.
 *
 * Under ISR that is not a cosmetic problem: `notFound()` output **is cached**,
 * so a 30-second TMDB blip during a revalidation window would serve HTTP 404
 * for a genuinely existing movie for up to `revalidate` seconds. Googlebot would
 * record real pages as gone, which is precisely how a catalog gets deindexed.
 *
 * So every failure path records *why* it failed here. Detail pages call
 * `isTMDBUnavailable()` and refuse to 404 when this is true, letting them fail
 * loudly (a 5xx, which Next does not cache) instead of caching a false 404.
 *
 * 4xx is treated as a genuine answer: TMDB replying "404" is a real, fast,
 * authoritative "this id does not exist", which is exactly what should 404.
 */
let upstreamUnavailable = false;

/**
 * True when TMDB could not be reached or is misconfigured, i.e. an empty result
 * is *not* evidence that the requested title does not exist.
 *
 * Per-process state, not per-request: on a serverless deploy each cold start
 * re-evaluates it, and on a long-lived server a successful call resets it.
 */
export function isTMDBUnavailable(): boolean {
  return upstreamUnavailable;
}

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}) {
    if (!TMDB_API_KEY) {
        warnMissingKey();
        // No key means every id would look "missing". Treat it as an outage so
        // detail pages never conclude the title does not exist.
        upstreamUnavailable = true;
        return { results: [] };
    }

    // Host already proven unreachable on this process; skip straight to fallback.
    if (breakerTripped) {
        upstreamUnavailable = true;
        return { results: [] };
    }

    const url = new URL(`${TMDB_API_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    try {
        const response = await fetchWithRetry(
            url.toString(),
            /**
             * Explicit cache opt-in. Without `next.revalidate` this fetch is
             * uncached in Next 15, which makes every detail route permanently
             * dynamic and silently disables the ISR `revalidate` those routes
             * export — one upstream request per page view.
             *
             * Failed requests still throw (see `fetchWithRetry`), so an outage
             * is never written into the cache; only successful payloads are.
             */
            { next: { revalidate: DATA_REVALIDATE_SECONDS } },
            TMDB_ATTEMPTS,
            TMDB_BACKOFF_MS,
            TMDB_TIMEOUT_MS
        );
        if (!response.ok) {
            console.warn(`[TMDB] ${endpoint} failed with HTTP ${response.status}`);
            // 4xx = TMDB answered and this resource does not exist. 5xx and 429
            // = TMDB is broken or rate-limiting us; the id may well be real.
            upstreamUnavailable = response.status >= 500 || response.status === 429;
            return { results: [] };
        }
        consecutiveTransportFailures = 0;
        upstreamUnavailable = false;
        return await response.json();
    } catch {
        consecutiveTransportFailures += 1;
        upstreamUnavailable = true;
        if (consecutiveTransportFailures >= TMDB_BREAKER_THRESHOLD && !breakerTripped) {
            breakerTripped = true;
            if (!hasWarnedBreaker) {
                hasWarnedBreaker = true;
                console.warn(
                    '[TMDB] Host unreachable — pausing TMDB calls for this server process and serving fallback rails. Restart the dev server to retry.'
                );
            }
        }
        return { results: [] };
    }
}

export async function fetchFromTMDB(endpoint: string, params: Record<string, string> = {}): Promise<any[]> {
  const data: TMDBResponse<any> = await tmdbFetch(endpoint, params);
  return data.results || [];
}

/**
 * Original-language codes TMDB supports for Indian cinema. Bolly/Hindi covers
 * `hi` plus the Hindi-dubbed catalogue; the four southern languages cover
 * Tamil, Telugu, Malayalam and Kannada releases.
 */
export const INDIAN_LANGUAGES = {
  hindi: 'hi',
  tamil: 'ta',
  telugu: 'te',
  malayalam: 'ml',
  kannada: 'kn',
} as const;

export type IndianLanguageKey = keyof typeof INDIAN_LANGUAGES;

export const INDIAN_MOVIE_LANGUAGES =
  `${INDIAN_LANGUAGES.hindi}|${INDIAN_LANGUAGES.tamil}|${INDIAN_LANGUAGES.telugu}|${INDIAN_LANGUAGES.malayalam}|${INDIAN_LANGUAGES.kannada}`;

export async function fetchIndianMovies(
  languageKey: IndianLanguageKey = 'hindi',
  page = 1
): Promise<Movie[]> {
  const items = await fetchFromTMDB('/discover/movie', {
    with_original_language: INDIAN_LANGUAGES[languageKey],
    region: 'IN',
    sort_by: 'popularity.desc',
    include_adult: 'false',
    page: page.toString(),
  });
  return items as Movie[];
}

export async function fetchIndianTrendingMovies(page = 1): Promise<Movie[]> {
  const items = await fetchFromTMDB('/trending/movie/week', {
    region: 'IN',
    page: page.toString(),
  });
  // Trending with region=IN is unreliable, so keep only genuinely Indian titles.
  return (items as Movie[]).filter((item) => item.original_language && INDIAN_MOVIE_LANGUAGES.includes(item.original_language));
}

export async function fetchIndianWebSeries(
  languageKey: IndianLanguageKey = 'hindi',
  page = 1
): Promise<TVShow[]> {
  const items = await fetchFromTMDB('/discover/tv', {
    with_original_language: INDIAN_LANGUAGES[languageKey],
    region: 'IN',
    sort_by: 'popularity.desc',
    include_adult: 'false',
    page: page.toString(),
  });
  return items as TVShow[];
}

export type UnifiedResult = {
  id: number;
  mediaType: 'movie' | 'tv' | 'anime' | 'manga' | 'person';
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  overview?: string;
  originalLanguage?: string | null;
};

/**
 * Single search across TMDB movies, TV and people. People are dropped — this
 * platform has no person pages, so surfacing them would be dead links.
 */
export async function searchTMDBMulti(query: string): Promise<UnifiedResult[]> {
  const items = await fetchFromTMDB('/search/multi', {
    query,
    include_adult: 'false',
  });

  return (items as Array<Record<string, unknown>>)
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item) => ({
      id: item.id as number,
      mediaType: item.media_type as 'movie' | 'tv',
      title: (item.title ?? item.name ?? '') as string,
      posterPath: (item.poster_path ?? null) as string | null,
      releaseDate: (item.release_date ?? item.first_air_date ?? null) as string | null,
      overview: (item.overview ?? '') as string,
      originalLanguage: (item.original_language ?? null) as string | null,
    }));
}

export async function fetchMovieById(id: number): Promise<Movie | null> {
    const data = await tmdbFetch(`/movie/${id}`, {});
    if (data && !Array.isArray(data) && data.id) {
        return data as Movie;
    }
    return null;
}

export async function fetchTVShowById(id: number): Promise<TVShow | null> {
    const data = await tmdbFetch(`/tv/${id}`, {});
    if (data && !Array.isArray(data) && data.id) {
        return data as TVShow;
    }
    return null;
}

/**
 * Fetch a specific season with its episodes
 */
export async function fetchSeasonById(tvId: number, seasonNumber: number): Promise<Season & { episodes: Episode[] } | null> {
    const data = await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, {});
    if (data && !Array.isArray(data) && data.id) {
        return data as Season & { episodes: Episode[] };
    }
    return null;
}

/**
 * Fetch a specific episode
 */
export async function fetchEpisodeById(tvId: number, seasonNumber: number, episodeNumber: number): Promise<Episode | null> {
    const data = await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`, {});
    if (data && !Array.isArray(data) && data.id) {
        return data as Episode;
    }
    return null;
}

/* ─────────────────────── Discovery lists (sitemap) ─────────────────────── */

/**
 * Top-level discovery lists used to build the sitemap.
 *
 * These are deliberately distinct lists rather than one merged list: a title
 * that is popular, trending AND now-playing would otherwise appear three times,
 * which wastes crawl budget. The sitemap merges by id and de-duplicates.
 *
 * All return an empty array when TMDB is unreachable, so sitemap generation
 * degrades to static routes instead of failing the build.
 */
export async function fetchPopularMovies(page = 1): Promise<Movie[]> {
  return (await fetchFromTMDB('/movie/popular', { page: page.toString() })) as Movie[];
}

export async function fetchTrendingMovies(page = 1): Promise<Movie[]> {
  return (await fetchFromTMDB('/trending/movie/week', { page: page.toString() })) as Movie[];
}

export async function fetchNowPlayingMovies(page = 1): Promise<Movie[]> {
  return (await fetchFromTMDB('/movie/now_playing', { page: page.toString() })) as Movie[];
}

export async function fetchPopularTv(page = 1): Promise<TVShow[]> {
  return (await fetchFromTMDB('/tv/popular', { page: page.toString() })) as TVShow[];
}

export async function fetchTrendingTv(page = 1): Promise<TVShow[]> {
  return (await fetchFromTMDB('/trending/tv/week', { page: page.toString() })) as TVShow[];
}

/**
 * Discovery queries behind the genre and year landing pages.
 *
 * ── Sorting ──────────────────────────────────────────────────────────────────
 * `popularity.desc`, not `vote_average.desc`. TMDB's top-rated lists are dominated
 * by obscure entries with a handful of votes, so a landing page built from them
 * looks broken to a visitor and gets no engagement signals. Popularity is what
 * the underlying query ("best action movies to watch free") is actually asking for.
 *
 * ── Which year filter per media type ─────────────────────────────────────────
 * Films expose `primary_release_year`; series do not have a "release year" at
 * all and use `first_air_date_year`. Passing the movie filter to `/discover/tv`
 * returns an error, not an empty list, so the two cannot be shared.
 */
const DISCOVER_BASE = {
  include_adult: 'false',
  sort_by: 'popularity.desc',
};

export async function fetchMoviesByGenre(
  genreIds: number[],
  page = 1
): Promise<Movie[]> {
  if (!genreIds.length) return [];
  return (await fetchFromTMDB('/discover/movie', {
    ...DISCOVER_BASE,
    with_genres: genreIds.join('|'),
    page: page.toString(),
  })) as Movie[];
}

export async function fetchTvByGenre(genreIds: number[], page = 1): Promise<TVShow[]> {
  if (!genreIds.length) return [];
  return (await fetchFromTMDB('/discover/tv', {
    ...DISCOVER_BASE,
    with_genres: genreIds.join('|'),
    page: page.toString(),
  })) as TVShow[];
}

export async function fetchMoviesByYear(year: number, page = 1): Promise<Movie[]> {
  return (await fetchFromTMDB('/discover/movie', {
    ...DISCOVER_BASE,
    primary_release_year: String(year),
    page: page.toString(),
  })) as Movie[];
}

export async function fetchTvByYear(year: number, page = 1): Promise<TVShow[]> {
  return (await fetchFromTMDB('/discover/tv', {
    ...DISCOVER_BASE,
    first_air_date_year: String(year),
    page: page.toString(),
  })) as TVShow[];
}

/**
 * Dubbed discovery — the rail behind `/dub` and `/dub/[lang]`.
 *
 * ── Why `with_original_language` and not TMDB's `with_dub` ────────────────────
 * TMDB has no "has a dub" filter. The `with_original_language` parameter is not
 * exactly the same claim, but for the queries this page targets ("hindi dubbed
 * movies", "tamil dubbed movies download") it is the honest approximation: a
 * Hindi-original film on an English-facing site *is* the dubbed copy for that
 * audience, and it is the only signal that is both available and stable rather
 * than guessed per title.
 *
 * ── Why TMDB only, no AniList ─────────────────────────────────────────────────
 * AniList exposes no language or dub field at all, so an anime half here would
 * have to be invented. The page says "movies and series" and does not pad itself
 * with anime it cannot actually classify — a thin page with unrelated titles is
 * the shape Google penalises.
 *
 * `popularity.desc` for the same reason as the genre/year rails: sorted by what
 * people are actually watching, not by obscure high-average entries.
 */
export async function fetchMoviesByLanguage(language: string, page = 1): Promise<Movie[]> {
  return (await fetchFromTMDB('/discover/movie', {
    ...DISCOVER_BASE,
    with_original_language: language,
    page: page.toString(),
  })) as Movie[];
}

export async function fetchTvByLanguage(language: string, page = 1): Promise<TVShow[]> {
  return (await fetchFromTMDB('/discover/tv', {
    ...DISCOVER_BASE,
    with_original_language: language,
    page: page.toString(),
  })) as TVShow[];
}

/**
 * Latest-registered anime in TMDB. `with_genres=16` is the Animation genre and
 * `with_original_language=ja` restricts to Japanese-origin titles, which keeps
 * Western cartoons out of the anime rail.
 */
export async function fetchAnimeTv(page = 1): Promise<TVShow[]> {
  return (await fetchFromTMDB('/discover/tv', {
    with_genres: '16',
    with_original_language: 'ja',
    sort_by: 'popularity.desc',
    include_adult: 'false',
    page: page.toString(),
  })) as TVShow[];
}

/**
 * TMDB keyword id for "anime". Used as a soft signal; TMDB filters this keyword
 * inconsistently on /search/tv, so it narrows results but never gates them.
 */
const ANIME_KEYWORD_ID = 210024;

/**
 * AniList ids are not TMDB ids, and TMDB has no external-id route that accepts
 * an AniList or MyAnimeList id. The only reliable bridge is the title, resolved
 * against TMDB's TV catalogue and then confirmed to actually be anime.
 *
 * Returning null is normal and expected (TMDB simply does not carry every
 * series, and TMDB is unreachable on some networks). Callers must degrade to a
 * non-video state rather than embed a guessed id — a wrong id renders the
 * provider's "Video Not Found" page inside the player.
 */
const animeIdCache = new Map<string, number | null>();

function normalizeTitle(value: string): string {
    return value
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\b(tv|anime|series)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Confidence that a TMDB result is the same show as the AniList entry.
 * Exact and near-exact matches are trusted; anything looser is rejected rather
 * than risking a wrong-but-playable title.
 */
function titleScore(query: string, ...candidates: Array<string | null | undefined>): number {
    const target = normalizeTitle(query);
    if (!target) return 0;

    let best = 0;
    for (const candidate of candidates) {
        if (!candidate) continue;
        const value = normalizeTitle(candidate);
        if (!value) continue;
        if (value === target) return 100;
        if (value.startsWith(target) || target.startsWith(value)) best = Math.max(best, 85);
        else if (value.includes(target) || target.includes(value)) best = Math.max(best, 65);

        // Token overlap catches transliteration and punctuation drift.
        const targetTokens = target.split(' ').filter((t) => t.length > 2);
        const valueTokens = new Set(value.split(' '));
        if (targetTokens.length > 0) {
            const overlap = targetTokens.filter((t) => valueTokens.has(t)).length;
            const ratio = overlap / targetTokens.length;
            if (ratio === 1) best = Math.max(best, 80);
            else if (ratio >= 0.5) best = Math.max(best, 45);
        }
    }
    return best;
}

/** Accept only confident matches; a wrong id is worse than no id. */
const ANIME_MATCH_THRESHOLD = 60;

export async function resolveAnimeTmdbId(
    ...titles: Array<string | null | undefined>
): Promise<number | null> {
    // AniList frequently returns the same string for both romaji and english,
    // so dedupe before issuing a request for each.
    const queries = Array.from(
        new Set(
            titles
                .filter((t): t is string => Boolean(t && t.trim()))
                .map((t) => t.trim())
        )
    );
    if (queries.length === 0) return null;

    const cacheKey = queries.map(normalizeTitle).join('|');
    if (animeIdCache.has(cacheKey)) return animeIdCache.get(cacheKey) ?? null;

    let resolved: number | null = null;

    try {
        // Romaji first: TMDB's original_name for anime is usually the romaji
        // form, so it matches far better than the English marketing title.
        for (const query of queries) {
            const items = (await fetchFromTMDB('/search/tv', {
                query,
                with_original_language: 'ja',
                include_adult: 'false',
            })) as Array<Record<string, unknown>>;

            const candidate = items
                .filter((item) => item.original_language === 'ja')
                .map((item) => ({
                    id: item.id as number,
                    score: titleScore(query, item.name as string, item.original_name as string),
                }))
                .filter((item) => item.score >= ANIME_MATCH_THRESHOLD)
                .sort((a, b) => b.score - a.score)[0];

            if (candidate) {
                resolved = candidate.id;
                break;
            }
        }
    } catch {
        // Network failures are already logged by tmdbFetch; stay silent here so
        // a missing mapping never breaks the page render.
        resolved = null;
    }

    animeIdCache.set(cacheKey, resolved);
    return resolved;
}
