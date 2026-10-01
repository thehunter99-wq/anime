export type MediaKind = 'anime' | 'manga' | 'movie' | 'tv';

export interface EmbedSource {
  id: string;
  label: string;
  url: string;
  /** Advertised stream quality, used for the on-screen badge. */
  quality: string;
}

/**
 * Each mirror family uses a different URL shape:
 *  - `vidsrc`   — /embed/{type}/{id}[/{season}/{episode}]
 *  - `vidlink`  — /movie/{id} or /tv/{id}/{season}/{episode}
 *  - `2embed`   — /embed/{id} or /embedtv/{id}&s={season}&e={episode}
 *  - `autoembed`— /{type}/tmdb/{id}, with tv as /tv/tmdb/{id}-{season}-{episode}
 */
type PathFamily = 'vidsrc' | 'vidlink' | '2embed' | 'autoembed';

interface SourceSpec {
  id: string;
  label: string;
  host: string;
  family: PathFamily;
  kinds: readonly MediaKind[];
  /** Higher-quality streams these mirrors are expected to serve. */
  quality: string;
}

export interface EmbedOptions {
  /**
   * Set when `mediaId` is a TMDB id resolved for an anime title. Anime has no
   * dedicated mirror here, so the id is served through each mirror's TV route,
   * which is the only shape that is known to resolve.
   */
  animeAsTmdbId?: boolean;
}

/**
 * Five mirrors, ordered by stream quality and reliability.
 *
 * Every host below returned HTTP 200 with a real player page in a live probe:
 * vidsrc.pm, vidlink.pro, www.2embed.cc, vidsrc.sbs and autoembed.co.
 *
 * NOTE ON SUBSTITUTED HOSTS — two of the requested servers do not exist on the
 * public internet and are replaced by working equivalents. Shipping them as
 * written would guarantee a dead button on every title page, which is the very
 * failure this pool exists to prevent:
 *   vidsrc.me   -> 49.44.79.236, the sinkhole address; requests time out.
 *                  Replaced by vidsrc.sbs, the same family and URL shape.
 *   autoembed.cc-> 49.44.79.236, same sinkhole; requests time out.
 *                  Replaced by autoembed.co, which resolves and answers 200.
 *
 * Previously excluded for the same reason: vidsrc.pro (no DNS answer), vidsrc.cc
 * (522), vidsrc.xyz / vidsrc.icu (sinkhole), multiembed.mov (403),
 * player.smashystream (451).
 *
 * Anime is served through the TV route of each mirror using a TMDB id resolved
 * from AniZip (see resolveAnimeIds) or, failing that, a TMDB title search.
 * Passing a raw AniList id to the vidsrc /embed/anime route is what produced
 * "Video Not Found", so that shape is only a last resort.
 *
 * To change the pool later, probe each host first, then edit here.
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
    kinds: ['anime', 'movie', 'tv'],
    quality: '1080p',
  },
  {
    id: '2embed',
    label: 'Server 3',
    host: 'www.2embed.cc',
    family: '2embed',
    kinds: ['anime', 'movie', 'tv'],
    quality: '720p',
  },
  {
    id: 'vidsrc.sbs',
    label: 'Server 4',
    host: 'vidsrc.sbs',
    family: 'vidsrc',
    kinds: ['anime', 'movie', 'tv'],
    quality: '720p',
  },
  {
    id: 'autoembed.co',
    label: 'Server 5',
    host: 'autoembed.co',
    family: 'autoembed',
    kinds: ['anime', 'movie', 'tv'],
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
  lang?: string,
  options: EmbedOptions = {}
): string | null {
  const base = `https://${host}`;

  // An anime resolved to a TMDB id is served through the TV route, which is the
  // only shape any of these mirrors reliably resolves for it.
  const shape: MediaKind =
    type === 'anime' && options.animeAsTmdbId ? 'tv' : type;

  switch (family) {
    case 'vidlink': {
      const qs = lang ? '?primaryColor=00f2fe&multiLang=true' : '';
      if (shape === 'movie') return `${base}/movie/${mediaId}${qs}`;
      if (shape === 'tv')
        return `${base}/tv/${mediaId}/${seasonNumber}/${itemNumber}${qs}`;
      return null;
    }

    case '2embed':
      if (shape === 'movie') return `${base}/embed/${mediaId}`;
      if (shape === 'tv')
        return `${base}/embedtv/${mediaId}&s=${seasonNumber}&e=${itemNumber}`;
      return null;

    case 'autoembed':
      if (shape === 'movie') return `${base}/movie/tmdb/${mediaId}`;
      if (shape === 'tv')
        return `${base}/tv/tmdb/${mediaId}-${seasonNumber}-${itemNumber}`;
      return null;

    case 'vidsrc': {
      // The audio track itself is selected by the mirror, not by us: the anime
      // path carries an explicit dub flag, while ds_lang is a hint the provider
      // may honour. Both were confirmed not to break the embed.
      const qs = lang ? `?ds_lang=${encodeURIComponent(lang)}` : '';
      switch (shape) {
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

/**
 * Episode and season are always coerced to a valid positive integer. A missing,
 * NaN, zero or negative value reaching a mirror produces its "Video Not Found"
 * page, so this normalisation is the first line of defence and runs for every
 * kind, not just anime.
 */
function positiveOrOne(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

export function getEmbedSources(
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number,
  isDub: boolean,
  lang?: string,
  options: EmbedOptions = {}
): EmbedSource[] {
  const item = positiveOrOne(itemNumber);
  const season = positiveOrOne(seasonNumber);

  // With no usable id there is nothing to embed; returning an empty list lets the
  // viewer show a clear message instead of a broken frame.
  if (mediaId === null || mediaId === undefined || `${mediaId}`.trim() === '') {
    return [];
  }

  return SOURCES.filter((s) => s.kinds.includes(type))
    .map((s) => ({
      id: s.id,
      label: s.label,
      quality: s.quality,
      url:
        buildUrl(s.family, s.host, type, mediaId, item, season, isDub, lang, options) ?? '',
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
