
import { type Movie, type TMDBResponse, type TVShow } from './types';
import { fetchWithRetry, getTMDBKey } from './health';

const TMDB_API_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = getTMDBKey();
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

export const isTMDBConfigured = Boolean(TMDB_API_KEY);

let hasWarned = false;
function warnMissingKey() {
  if (hasWarned) return;
  hasWarned = true;
  console.warn(
    '[TMDB] NEXT_PUBLIC_TMDB_API_KEY is missing. Add it to .env.local (restart dev server) to enable movie/TV data.'
  );
}

export function getTMDBImageUrl(path: string | null, size: 'w500' | 'original' = 'w500') {
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

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}) {
    if (!TMDB_API_KEY) {
        warnMissingKey();
        return { results: [] };
    }

    // Host already proven unreachable on this process; skip straight to fallback.
    if (breakerTripped) return { results: [] };

    const url = new URL(`${TMDB_API_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    try {
        const response = await fetchWithRetry(
            url.toString(),
            {},
            TMDB_ATTEMPTS,
            TMDB_BACKOFF_MS,
            TMDB_TIMEOUT_MS
        );
        if (!response.ok) {
            console.warn(`[TMDB] ${endpoint} failed with HTTP ${response.status}`);
            return { results: [] };
        }
        consecutiveTransportFailures = 0;
        return await response.json();
    } catch {
        consecutiveTransportFailures += 1;
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
