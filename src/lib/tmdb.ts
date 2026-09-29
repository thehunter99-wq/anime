
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
