export type MediaKind = 'anime' | 'manga' | 'movie' | 'tv';

export interface EmbedSource {
  id: string;
  label: string;
  url: string;
  /** Advertised stream quality, used for the on-screen badge. */
  quality: string;
}

/**
 * Two mirror families use different URL shapes:
 *  - `vidsrc` — /embed/{type}/{id}[/{season}/{episode}]
 *  - `vidlink` — /movie/{id} or /tv/{id}/{season}/{episode}
 */
type PathFamily = 'vidsrc' | 'vidlink' | '2embed';

interface SourceSpec {
  id: string;
  label: string;
  host: string;
  family: PathFamily;
  kinds: readonly MediaKind[];
  /** Higher-quality streams these mirrors are expected to serve. */
  quality: string;
}

/**
 * Every source here returned HTTP 200 with a real player page in a live probe.
 *
 * NOTE ON THE ONES DELIBERATELY EXCLUDED — these were all requested but none
 * work, and shipping a dead source is what produces "Video Not Found":
 *   vidsrc.cc            -> 522, Cloudflare cannot reach the origin (both
 *                           the /v2 movie, tv and anime routes)
 *   vidsrc.xyz           -> resolves to 49.44.79.236, the same sinkhole address
 *   vidsrc.icu           -> 49.44.79.236 again, same sinkhole
 *   multiembed.mov       -> 403
 *   player.smashystream  -> 451, unavailable for legal reasons
 *
 * Consequence: there is currently no dedicated anime mirror that works. Anime
 * resolves through vidsrc.pm, which serves MAL ids in the /embed/anime shape.
 * Note also that anime ids on this site are AniList ids, not TMDB ids, so the
 * "tmdb_id" placeholder in anime URL patterns does not apply.
 *
 * To add a source later, probe it first, then append it here. Verified sources
 * are ordered first so an unreachable fallback can never block playback.
 */
const SOURCES: readonly SourceSpec[] = [
  {
    id: 'vidsrc.pm',
    label: 'Server 1',
    host: 'vidsrc.pm',
    family: 'vidsrc',
    kinds: ['anime', 'manga', 'movie', 'tv'],
    quality: '1080p',
  },
  {
    id: 'vidlink.pro',
    label: 'Server 2',
    host: 'vidlink.pro',
    family: 'vidlink',
    kinds: ['movie', 'tv'],
    quality: '1080p',
  },
  {
    id: 'vidsrc.sbs',
    label: 'Server 3',
    host: 'vidsrc.sbs',
    family: 'vidsrc',
    kinds: ['movie', 'tv'],
    quality: '720p',
  },
  {
    id: '2embed',
    label: 'Server 4',
    host: 'www.2embed.cc',
    family: '2embed',
    kinds: ['movie', 'tv'],
    quality: '720p',
  },
];

function buildUrl(
  family: PathFamily,
  host: string,
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number,
  isDub: boolean,
  lang?: string
): string | null {
  const base = `https://${host}`;

  switch (family) {
    case 'vidlink': {
      const qs = lang ? '?primaryColor=00f2fe&multiLang=true' : '';
      if (type === 'movie') return `${base}/movie/${mediaId}${qs}`;
      if (type === 'tv')
        return `${base}/tv/${mediaId}/${seasonNumber}/${itemNumber}${qs}`;
      return null;
    }

    case '2embed':
      if (type === 'movie') return `${base}/embed/${mediaId}`;
      if (type === 'tv')
        return `${base}/embedtv/${mediaId}&s=${seasonNumber}&e=${itemNumber}`;
      return null;

    case 'vidsrc': {
      // The audio track itself is selected by the mirror, not by us: the anime
      // path carries an explicit dub flag, while ds_lang is a hint the provider
      // may honour. Both were confirmed not to break the embed.
      const qs = lang ? `?ds_lang=${encodeURIComponent(lang)}` : '';
      switch (type) {
        case 'anime':
          return `${base}/embed/anime/${mediaId}/${itemNumber}/${isDub ? '1' : '0'}${qs}`;
        case 'manga':
          return `${base}/embed/manga/${mediaId}/${itemNumber}`;
        case 'movie':
          return `${base}/embed/movie/${mediaId}${qs}`;
        case 'tv':
          return `${base}/embed/tv/${mediaId}/${seasonNumber}/${itemNumber}${qs}`;
        default:
          return null;
      }
    }
  }
}

export function getEmbedSources(
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number,
  isDub: boolean,
  lang?: string
): EmbedSource[] {
  const item = Number.isFinite(itemNumber) && itemNumber >= 1 ? itemNumber : 1;
  const season = Number.isFinite(seasonNumber) && seasonNumber >= 1 ? seasonNumber : 1;

  return SOURCES.filter((s) => s.kinds.includes(type))
    .map((s) => ({
      id: s.id,
      label: s.label,
      quality: s.quality,
      url: buildUrl(s.family, s.host, type, mediaId, item, season, isDub, lang) ?? '',
    }))
    .filter((s) => s.url.length > 0);
}

/** Mirror that backs the direct download links, used as a stable fallback. */
export const PRIMARY_HOST = 'vidsrc.pm';

/**
 * "Download HD" target. There is no direct file endpoint — these mirrors expose
 * a download listing for the same ids the player uses, so we send users there
 * in a new tab rather than pretending to serve a file.
 */
export function getDownloadUrl(
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number
): string | null {
  return buildUrl('vidsrc', 'vidsrc.pm', type, mediaId, itemNumber, seasonNumber, false);
}

export const hasDownload = (type: MediaKind) => type === 'movie' || type === 'tv';

/**
 * Adsterra monetised Smartlink. Clicking the primary download button routes
 * through this first, then lands the visitor on a monetised offer wall.
 * Configurable so the account can rotate destinations without a code change.
 */
export const SMARTLINK_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_SMARTLINK_URL ??
  'https://www.profitableratecpmnetwork.com/ycpdk6c8c?key=1c287bda01e09dd493a8627eae5e8ead';
