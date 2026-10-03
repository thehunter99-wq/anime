import { SITE_URL } from '@/lib/site';
import { animePath, dubPath, mangaPath, moviePath, subPath, tvPath } from '@/lib/routes';
import { FEATURED_GENRES } from '@/lib/genres';
import { DUB_LANGUAGES } from '@/lib/languages';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? 'your-indexnow-key-here';
const INDEXNOW_KEY_LOCATION = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/${INDEXNOW_KEY}.txt`
  : 'https://movanime.site/your-indexnow-key.txt';

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://searchadvisor.naver.com/indexnow',
  'https://webmaster.yandex.com/indexnow',
];

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

const REVALIDATION_PING_DELAY_MS = 5000;
const MAX_URLS_PER_PING = 1000;

/**
 * Internal function to ping IndexNow API
 */
async function pingIndexNowInternal(urls: string[], host?: string): Promise<boolean> {
  try {
    const targetHost = host ?? new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://movanime.site').host;
    const urlList = urls.map(url => url.startsWith('http') ? url : `https://${targetHost}${url.startsWith('/') ? url : `/${url}`}`);

    const payload: IndexNowPayload = {
      host: targetHost,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList,
    };

    // Fire to all endpoints concurrently, don't wait for all
    INDEXNOW_ENDPOINTS.forEach(endpoint => {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.error(`[IndexNow] ${endpoint} failed:`, err));
    });

    return true;
  } catch (error) {
    console.error('[IndexNow] pingIndexNow error:', error);
    return false;
  }
}

/**
 * Trigger IndexNow ping for a list of URLs
 * Used after ISR revalidation or content updates
 */
export async function triggerIndexNowPing(urls: string[]): Promise<void> {
  if (!urls.length) return;

  // Deduplicate and limit
  const uniqueUrls = [...new Set(urls)].slice(0, MAX_URLS_PER_PING);

  // Fire and forget - don't block the response
  setTimeout(() => {
    pingIndexNowInternal(uniqueUrls).catch(err => {
      console.error('[IndexNow] Background ping failed:', err);
    });
  }, REVALIDATION_PING_DELAY_MS);
}

/**
 * Generate all crawlable URLs for full-site IndexNow submission
 * Used during sitemap generation or manual full-site ping
 */
export function generateAllIndexNowUrls(): string[] {
  return [
    '/',
    '/movies',
    '/tv',
    '/anime',
    '/manga',
    '/trending',
    '/indian-movies',
    '/indian-series',
    '/genre',
    '/dub',
    subPath(),
    ...FEATURED_GENRES.map((genre) => `/genre/${genre.slug}`),
    ...DUB_LANGUAGES.map((language) => dubPath(language.slug)),
  ];
}

/**
 * Canonical paths to submit when a title changes.
 *
 * ── Corrected ────────────────────────────────────────────────────────────────
 * This previously built `/watch/${type}/${id}/${slug}` and
 * `/download/${type}/${id}/${slug}`. **Neither path has ever existed.** The watch
 * surface is `app/view/[type]/[id-slug]` (one segment, not two), and the
 * `/watch/...` and `/download/...` routes only exist under the explicit
 * `tv`/`anime` type segments. Every ping therefore submitted three URLs, two of
 * which were 404s — which is worse than not pinging at all, because IndexNow
 * counts a 404 as a failed submission and the engine can stop trusting the feed.
 *
 * The real per-title surfaces are the detail page plus, for episodic titles, the
 * episode landing pages whose slugs we generate rather than receive.
 */
export async function pingIndexNowForContent(
  contentType: 'movie' | 'tv' | 'anime' | 'manga',
  id: number
): Promise<void> {
  const detailPath =
    contentType === 'movie'
      ? moviePath(id)
      : contentType === 'tv'
        ? tvPath(id)
        : contentType === 'anime'
          ? animePath(id)
          : mangaPath(id);

  await triggerIndexNowPing([detailPath]);
}

/**
 * Batch ping for multiple content items (e.g. after bulk import)
 */
export async function pingIndexNowBatch(
  items: Array<{ type: 'movie' | 'tv' | 'anime' | 'manga'; id: number; title?: string | null }>
): Promise<void> {
  const urls = items.flatMap((item) => {
    const detail =
      item.type === 'movie'
        ? moviePath(item.id)
        : item.type === 'tv'
          ? tvPath(item.id)
          : item.type === 'anime'
            ? animePath(item.id)
            : mangaPath(item.id);

    return [detail];
  });

  await triggerIndexNowPing(urls);
}

/**
 * Generate IndexNow key file content for verification
 * Place this at /${INDEXNOW_KEY}.txt in your public folder
 */
export function generateIndexNowKeyFile(): string {
  return INDEXNOW_KEY;
}