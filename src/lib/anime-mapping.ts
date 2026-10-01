import { fetchWithRetry } from './health';

/**
 * AniList -> external id mapping via the free AniZip API.
 *
 *   GET https://api.ani.zip/mappings?anilist_id={anilistId}
 *
 * This is far more reliable than resolving by title, because AniZip already
 * holds the curated cross-database mapping and answers with a single authoritative
 * TMDB id. It is also independent of TMDB's availability, so anime keeps working
 * on networks where `api.themoviedb.org` is blocked.
 *
 * NOTE ON THE RESPONSE SHAPE — the field is `themoviedb_id`, not `tmdb_id`.
 * `tmdb_id` does not appear in the payload at all; reading it would silently
 * yield undefined and put the AniList id back into the embed URL. `tmdb_id` is
 * accepted below purely as a defensive alias.
 *
 * The response embeds the full episode table (~35KB for a long series) alongside
 * the mappings, so results are cached per id and only `mappings` is read.
 */

const ANIZIP_API = 'https://api.ani.zip/mappings';
const ANIZIP_TIMEOUT_MS = 4000;
const ANIZIP_ATTEMPTS = 2;

export interface AnimeIdMapping {
  /** TMDB TV id, the id every embed mirror understands. */
  tmdbId: number | null;
  /** MyAnimeList id, kept for the mirrors that serve MAL ids natively. */
  malId: number | null;
  /** IMDb id, occasionally useful as a last-resort lookup key. */
  imdbId: string | null;
}

const cache = new Map<number, AnimeIdMapping | null>();

let hasWarnedUnavailable = false;

function toPositiveInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Resolves an AniList anime id to the ids the embed mirrors can use.
 *
 * Returns null when AniZip has no entry for the title (long-running or very
 * obscure series) or when the host is unreachable. Callers must treat null as
 * "no stream available" rather than substituting a guessed id, because a wrong
 * id renders the provider's "Video Not Found" page inside the player.
 */
export async function resolveAnimeIds(anilistId: number): Promise<AnimeIdMapping | null> {
  if (!Number.isFinite(anilistId) || anilistId <= 0) return null;

  if (cache.has(anilistId)) return cache.get(anilistId) ?? null;

  let mapping: AnimeIdMapping | null = null;

  try {
    const response = await fetchWithRetry(
      `${ANIZIP_API}?anilist_id=${encodeURIComponent(String(anilistId))}`,
      {},
      ANIZIP_ATTEMPTS,
      300,
      ANIZIP_TIMEOUT_MS
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        mappings?: Record<string, unknown>;
      };
      const raw = payload?.mappings;

      if (raw && typeof raw === 'object') {
        const tmdbId = toPositiveInt(raw.themoviedb_id ?? raw.tmdb_id);
        const malId = toPositiveInt(raw.mal_id);
        const imdbId = typeof raw.imdb_id === 'string' && raw.imdb_id ? raw.imdb_id : null;

        if (tmdbId || malId) {
          mapping = { tmdbId, malId, imdbId };
        }
      }
    } else if (!hasWarnedUnavailable) {
      hasWarnedUnavailable = true;
      console.warn(
        `[anime] AniZip responded with HTTP ${response.status}; falling back to title search.`
      );
    }
  } catch {
    if (!hasWarnedUnavailable) {
      hasWarnedUnavailable = true;
      console.warn(
        '[anime] AniZip unreachable; falling back to TMDB title search for anime id mapping.'
      );
    }
    mapping = null;
  }

  cache.set(anilistId, mapping);
  return mapping;
}