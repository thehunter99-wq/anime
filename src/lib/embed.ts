export type MediaKind = 'anime' | 'manga' | 'movie' | 'tv';

export interface EmbedSource {
  id: string;
  label: string;
  url: string;
}

/**
 * Verified working mirror families (probed against live hosts):
 *   vidsrc.pm  -> movie, tv, anime, manga all return 200
 *   vidsrc.sbs -> movie and tv return 200, but anime/manga 404
 *
 * vidsrc.xyz / vidsrc.icu / vidsrc.net / vidsrc.to do not resolve to a live
 * server any more, so they are deliberately not used.
 */
const HOSTS = {
  universal: { host: 'vidsrc.pm', label: 'Server 1' },
  tmdbOnly: { host: 'vidsrc.sbs', label: 'Server 2' },
} as const;

function buildPath(
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number,
  isDub: boolean
): string {
  switch (type) {
    case 'anime':
      return `/embed/anime/${mediaId}/${itemNumber}/${isDub ? '1' : '0'}`;
    case 'manga':
      return `/embed/manga/${mediaId}/${itemNumber}`;
    case 'movie':
      return `/embed/movie/${mediaId}`;
    case 'tv':
      return `/embed/tv/${mediaId}/${seasonNumber}/${itemNumber}`;
    default:
      return '';
  }
}

export function getEmbedSources(
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number,
  isDub: boolean
): EmbedSource[] {
  const path = buildPath(type, mediaId, itemNumber, seasonNumber, isDub);
  if (!path) return [];

  const sources: EmbedSource[] = [
    { id: HOSTS.universal.host, label: HOSTS.universal.label, url: `https://${HOSTS.universal.host}${path}` },
  ];

  // vidsrc.sbs only carries TMDB-backed content, never anime or manga.
  if (type === 'movie' || type === 'tv') {
    sources.push({
      id: HOSTS.tmdbOnly.host,
      label: HOSTS.tmdbOnly.label,
      url: `https://${HOSTS.tmdbOnly.host}${path}`,
    });
  }

  return sources;
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
  const path = buildPath(type, mediaId, itemNumber, seasonNumber, false);
  if (!path) return null;
  return `https://${HOSTS.universal.host}${path}`;
}

export const hasDownload = (type: MediaKind) => type === 'movie' || type === 'tv';
