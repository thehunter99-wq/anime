
export type CheckStatus = 'ok' | 'warn' | 'error' | 'pending';

export interface CheckResult {
  id: string;
  label: string;
  detail: string;
  status: CheckStatus;
  value?: string | null;
  hint?: string | null;
}

const FETCH_TIMEOUT_MS = 8000;

export async function timedFetch(
  input: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'Request timed out after 8s (host unreachable or blocked)';
  }
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  if (cause?.code) return `Network error: ${cause.code}`;
  return error instanceof Error ? error.message : String(error);
}

export function getTMDBKey() {
  return process.env.NEXT_PUBLIC_TMDB_API_KEY ?? '';
}

export function getAdsterraKey() {
  return process.env.NEXT_PUBLIC_ADSTERRA_KEY ?? '';
}

/**
 * AniList rate-limits bursts, and TMDB occasionally drops concurrent connections.
 * One short-backoff retry turns most of those into a silent success.
 */
export async function fetchWithRetry(
  input: string,
  init: RequestInit = {},
  attempts = 2,
  backoffMs = 400
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await timedFetch(input, init);
      if (response.status !== 429 && response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function checkTMDBKey(): Promise<CheckResult> {
  const key = getTMDBKey();
  if (!key) {
    return {
      id: 'tmdb-key',
      label: 'TMDB API Key',
      detail: 'NEXT_PUBLIC_TMDB_API_KEY is not set',
      status: 'error',
      hint: 'Add the key to .env.local and restart the dev server.',
    };
  }

  const masked = `${key.slice(0, 4)}…${key.slice(-4)}`;
  const url = `https://api.themoviedb.org/3/movie/550?api_key=${encodeURIComponent(key)}`;

  try {
    const response = await timedFetch(url);
    if (response.status === 401) {
      return {
        id: 'tmdb-key',
        label: 'TMDB API Key',
        detail: 'Key was rejected by TMDB (401 Unauthorized)',
        status: 'error',
        value: masked,
        hint: 'Double-check the key value in .env.local.',
      };
    }
    if (!response.ok) {
      return {
        id: 'tmdb-key',
        label: 'TMDB API Key',
        detail: `TMDB responded with HTTP ${response.status}`,
        status: 'error',
        value: masked,
      };
    }
    const json = (await response.json()) as { title?: string };
    return {
      id: 'tmdb-key',
      label: 'TMDB API Key',
      detail: `Key is valid — sample lookup returned "${json.title ?? 'ok'}"`,
      status: 'ok',
      value: masked,
    };
  } catch (error) {
    return {
      id: 'tmdb-key',
      label: 'TMDB API Key',
      detail: `Could not reach api.themoviedb.org — ${describeError(error)}`,
      status: 'error',
      value: masked,
      hint: 'Host is blocked or unreachable on this machine/network. It works fine from Vercel servers.',
    };
  }
}

export async function checkAniList(): Promise<CheckResult> {
  try {
    const response = await timedFetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: '{ Page(perPage: 1) { media { id } } }' }),
    });
    if (!response.ok) {
      return {
        id: 'anilist',
        label: 'AniList GraphQL',
        detail: `AniList responded with HTTP ${response.status}`,
        status: 'error',
      };
    }
    const json = (await response.json()) as { data?: { Page?: { media?: unknown[] } } };
    const count = json.data?.Page?.media?.length ?? 0;
    return {
      id: 'anilist',
      label: 'AniList GraphQL',
      detail: count > 0 ? 'Reachable — anime & manga queries work' : 'Reachable but returned no data',
      status: count > 0 ? 'ok' : 'warn',
    };
  } catch (error) {
    return {
      id: 'anilist',
      label: 'AniList GraphQL',
      detail: `Could not reach graphql.anilist.co — ${describeError(error)}`,
      status: 'error',
    };
  }
}

export async function checkTMDBImages(): Promise<CheckResult> {
  try {
    const response = await timedFetch(
      'https://image.tmdb.org/t/p/w500/pFlaoHTZeyNkG83vxsAJiGzfSsa.jpg',
      { method: 'HEAD' }
    );
    return {
      id: 'tmdb-images',
      label: 'TMDB Image CDN',
      detail: response.ok
        ? 'Posters and backdrops will load'
        : `Image CDN responded with HTTP ${response.status}`,
      status: response.ok ? 'ok' : 'warn',
    };
  } catch (error) {
    return {
      id: 'tmdb-images',
      label: 'TMDB Image CDN',
      detail: `Could not reach image.tmdb.org — ${describeError(error)}`,
      status: 'error',
    };
  }
}

export function checkAdsterra(): CheckResult {
  const key = getAdsterraKey();
  if (!key) {
    return {
      id: 'adsterra',
      label: 'Adsterra Ads',
      detail: 'NEXT_PUBLIC_ADSTERRA_KEY is not set — ad slots render nothing',
      status: 'pending',
      hint: 'Paste the zone key from adsterra.com dashboard into .env.local.',
    };
  }
  return {
    id: 'adsterra',
    label: 'Adsterra Ads',
    detail: `Zone key set — loader will request ssat.pro/cdn/client.js?key=${key.slice(0, 6)}…`,
    status: 'ok',
  };
}

export function checkEmbedHosts(): CheckResult {
  return {
    id: 'embed-hosts',
    label: 'Video Embed Hosts',
    detail: 'Player uses vidsrc.icu (anime/manga) and vidsrc.sbs (movie/TV), loaded client-side in an iframe',
    status: 'ok',
    hint: 'Only the browser talks to these hosts, so this check cannot run server-side.',
  };
}

export async function runAllChecks(): Promise<CheckResult[]> {
  const [tmdb, anilist, images] = await Promise.all([
    checkTMDBKey(),
    checkAniList(),
    checkTMDBImages(),
  ]);
  return [tmdb, anilist, images, checkAdsterra(), checkEmbedHosts()];
}

export function summarize(results: CheckResult[]) {
  return {
    ok: results.filter((r) => r.status === 'ok').length,
    warn: results.filter((r) => r.status === 'warn').length,
    error: results.filter((r) => r.status === 'error').length,
    pending: results.filter((r) => r.status === 'pending').length,
  };
}
