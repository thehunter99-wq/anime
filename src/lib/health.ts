
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

export function getAdsterraSocialBarUrl() {
  return (
    process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_URL ??
    'https://pl31576647.profitableratecpmnetwork.com/ac/65/79/ac65794ec051ffa9b7ab68ab5027f1d2.js'
  );
}

export function getAdsterraPopunderUrl() {
  return (
    process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_URL ??
    'https://pl31576876.profitableratecpmnetwork.com/fa/79/81/fa7981af9d98b11f335221786bc8b090.js'
  );
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
      label: 'Adsterra In-Content Ads',
      detail: 'NEXT_PUBLIC_ADSTERRA_KEY is not set — inline banner slots render nothing',
      status: 'pending',
      hint: 'Paste the zone key from adsterra.com dashboard into .env.local. The social bar works without it.',
    };
  }
  return {
    id: 'adsterra',
    label: 'Adsterra In-Content Ads',
    detail: `Zone key set — loader will request ssat.pro/cdn/client.js?key=${key.slice(0, 6)}…`,
    status: 'ok',
  };
}

export function getAdsterraSmartlinkUrl() {
  return (
    process.env.NEXT_PUBLIC_ADSTERRA_SMARTLINK_URL ??
    'https://www.profitableratecpmnetwork.com/ycpdk6c8c?key=1c287bda01e09dd493a8627eae5e8ead'
  );
}

export function getAdsterraNativeBannerUrl() {
  return (
    process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL ??
    'https://pl31577360.profitableratecpmnetwork.com/ebab695606cac21b468c0fe20067b7f6/invoke.js'
  );
}

async function checkAdsterraScript(
  url: string,
  label: string,
  timing: string,
  devDisabled = false
) {
  try {
    const response = await timedFetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    });
    const id = label.toLowerCase().replace(/\s+/g, '-');
    if (!response.ok) {
      return {
        id,
        label,
        detail: `Script responded with HTTP ${response.status}`,
        status: 'error' as const,
        value: url.slice(0, 60),
      };
    }
    const body = await response.text();
    const disabled = devDisabled && process.env.NODE_ENV !== 'production';
    return {
      id,
      label,
      detail: disabled
        ? `Script reachable (${body.length} bytes) — but intentionally suppressed on this dev build; it activates on the deployed domain`
        : `Script reachable (${body.length} bytes) — ${timing}`,
      status: (disabled ? 'warn' : 'ok') as 'warn' | 'ok',
      value: url.slice(0, 60),
    };
  } catch (error) {
    return {
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      detail: `Could not load the script — ${describeError(error)}`,
      status: 'error' as const,
      value: url.slice(0, 60),
    };
  }
}

export const checkAdsterraSocialBar = () =>
  checkAdsterraScript(
    getAdsterraSocialBarUrl(),
    'Adsterra Social Bar',
    'loads ~1.2s after each page renders'
  );

export const checkAdsterraPopunder = () =>
  checkAdsterraScript(
    getAdsterraPopunderUrl(),
    'Adsterra Popunder',
    'loads ~4.5s after each page renders',
    true
  );

export const checkAdsterraNativeBanner = () =>
  checkAdsterraScript(
    getAdsterraNativeBannerUrl(),
    'Adsterra Native Banner',
    'injected below the video player ~2.5s after load'
  );

export async function checkAdsterraSmartlink(): Promise<CheckResult> {
  const url = getAdsterraSmartlinkUrl();
  try {
    const response = await timedFetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
    });
    const body = await response.text();
    return {
      id: 'adsterra-smartlink',
      label: 'Adsterra Smartlink',
      detail:
        response.status < 400
          ? `Reachable (HTTP ${response.status}, ${body.length} bytes) — primary Download button target`
          : `Responded with HTTP ${response.status} — clicks may not monetise`,
      status: response.status < 400 ? 'ok' : 'error',
      value: url.slice(0, 60),
      hint: 'Used by "Fast HD Download". "Direct Server" bypasses it, so both paths stay usable.',
    };
  } catch (error) {
    return {
      id: 'adsterra-smartlink',
      label: 'Adsterra Smartlink',
      detail: `Could not reach the smartlink — ${describeError(error)}`,
      status: 'error',
      value: url.slice(0, 60),
    };
  }
}

export async function checkEmbedHosts(): Promise<CheckResult> {
  const targets = [
    { label: 'movie (vidsrc.pm)', url: 'https://vidsrc.pm/embed/movie/550' },
    { label: 'tv (vidsrc.pm)', url: 'https://vidsrc.pm/embed/tv/1399/1/1' },
    { label: 'anime (vidsrc.pm)', url: 'https://vidsrc.pm/embed/anime/21/1/0' },
    { label: 'movie (vidsrc.sbs)', url: 'https://vidsrc.sbs/embed/movie/550' },
  ];

  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        const response = await timedFetch(target.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          },
        });
        return { label: target.label, code: response.status };
      } catch (error) {
        return { label: target.label, code: describeError(error) };
      }
    })
  );

  const failures = results.filter((r) => typeof r.code !== 'number' || r.code >= 400);

  return {
    id: 'embed-hosts',
    label: 'Video Embed Hosts',
    detail: results.map((r) => `${r.label}: ${r.code}`).join(' · '),
    status: failures.length === 0 ? 'ok' : failures.length < results.length ? 'warn' : 'error',
    hint:
      failures.length > 0
        ? 'A mirror is down. The viewer falls back to the next server automatically.'
        : 'The player loads in a client-side iframe, so playback still depends on the browser reaching these hosts.',
  };
}

export async function runAllChecks(): Promise<CheckResult[]> {
  const [tmdb, anilist, images, socialBar, popunder, smartlink, nativeBanner, embeds] =
    await Promise.all([
      checkTMDBKey(),
      checkAniList(),
      checkTMDBImages(),
      checkAdsterraSocialBar(),
      checkAdsterraPopunder(),
      checkAdsterraSmartlink(),
      checkAdsterraNativeBanner(),
      checkEmbedHosts(),
    ]);
  return [
    tmdb,
    anilist,
    images,
    checkAdsterra(),
    socialBar,
    popunder,
    smartlink,
    nativeBanner,
    embeds,
  ];
}

export function summarize(results: CheckResult[]) {
  return {
    ok: results.filter((r) => r.status === 'ok').length,
    warn: results.filter((r) => r.status === 'warn').length,
    error: results.filter((r) => r.status === 'error').length,
    pending: results.filter((r) => r.status === 'pending').length,
  };
}
