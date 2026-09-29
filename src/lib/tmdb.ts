
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

async function tmdbFetch(endpoint: string, params: Record<string, string> = {}) {
    if (!TMDB_API_KEY) {
        warnMissingKey();
        return { results: [] };
    }
    const url = new URL(`${TMDB_API_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    try {
        const response = await fetchWithRetry(url.toString());
        if (!response.ok) {
            console.warn(`[TMDB] ${endpoint} failed with HTTP ${response.status}`);
            return { results: [] };
        }
        return await response.json();
    } catch {
        console.warn(`[TMDB] ${endpoint} unreachable. Check /diagnostics for network status.`);
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
