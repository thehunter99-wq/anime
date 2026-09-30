export type MediaKind = 'anime' | 'manga' | 'movie' | 'tv';

export interface EmbedSource {
  id: string;
  label: string;
  url: string;
  /** True when the host returned a real page in a live probe. */
  verified: boolean;
}

/**
 * Two mirror families use different URL shapes:
 *  - `vidsrc` — /embed/{type}/{id}[/{season}/{episode}]
 *  - `vidlink` — /movie/{id} or /tv/{id}/{season}/{episode}
 */
type PathFamily = 'vidsrc' | 'vidlink';

interface SourceSpec {
  id: string;
  label: string;
  host: string;
  family: PathFamily;
  kinds: readonly MediaKind[];
  verified: boolean;
}

/**
 * Ordered by trust: verified hosts first, unverified last.
 *
 * Verified by a live probe returning HTTP 200 with a real page body:
 *   vidsrc.pm  -> movie, tv, anime, manga
 *   vidsrc.sbs -> movie, tv (anime/manga 404)
 *   vidlink.pro-> movie, and tv with season/episode
 *
 * Not reachable from the build network, so shipped last and never depended on.
 * Both resolve to 49.44.79.236 — the same sinkhole address that
 * api.themoviedb.org resolves to there — so they are almost certainly alive on
 * an unblocked connection, but that could not be confirmed:
 *   vidsrc.to, player.autoembed.cc
 *
 * embed.su is deliberately excluded: it has no DNS A or AAAA record at all.
 */
const SOURCES: readonly SourceSpec[] = [
  { id: 'vidsrc.pm', label: 'Server 1', host: 'vidsrc.pm', family: 'vidsrc', kinds: ['anime', 'manga', 'movie', 'tv'], verified: true },
  { id: 'vidsrc.sbs', label: 'Server 2', host: 'vidsrc.sbs', family: 'vidsrc', kinds: ['movie', 'tv'], verified: true },
  { id: 'vidlink.pro', label: 'Server 3', host: 'vidlink.pro', family: 'vidlink', kinds: ['movie', 'tv'], verified: true },
  { id: 'vidsrc.to', label: 'Server 4', host: 'vidsrc.to', family: 'vidsrc', kinds: ['anime', 'movie', 'tv'], verified: false },
  { id: 'autoembed', label: 'Server 5', host: 'player.autoembed.cc', family: 'vidsrc', kinds: ['movie', 'tv'], verified: false },
];

function buildUrl(
  family: PathFamily,
  host: string,
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number,
  isDub: boolean
): string | null {
  if (family === 'vidlink') {
    if (type === 'movie') return `https://${host}/movie/${mediaId}`;
    if (type === 'tv') return `https://${host}/tv/${mediaId}/${seasonNumber}/${itemNumber}`;
    return null;
  }

  switch (type) {
    case 'anime':
      return `https://${host}/embed/anime/${mediaId}/${itemNumber}/${isDub ? '1' : '0'}`;
    case 'manga':
      return `https://${host}/embed/manga/${mediaId}/${itemNumber}`;
    case 'movie':
      return `https://${host}/embed/movie/${mediaId}`;
    case 'tv':
      return `https://${host}/embed/tv/${mediaId}/${seasonNumber}/${itemNumber}`;
    default:
      return null;
  }
}

export function getEmbedSources(
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number,
  isDub: boolean
): EmbedSource[] {
  return SOURCES.filter((s) => s.kinds.includes(type))
    .map((s) => ({
      id: s.id,
      label: s.label,
      verified: s.verified,
      url: buildUrl(s.family, s.host, type, mediaId, itemNumber, seasonNumber, isDub) ?? '',
    }))
    .filter((s) => s.url.length > 0);
}

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
