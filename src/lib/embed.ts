export type MediaKind = 'anime' | 'manga' | 'movie' | 'tv';

export interface EmbedSource {
  id: string;
  label: string;
  url: string;
}

/**
 * Builds the stream URLs for a title, most-reliable first.
 * Several mirror families exist for the same provider, so every kind gets more
 * than one candidate and the viewer cycles through them when playback fails.
 */
export function getEmbedSources(
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number,
  isDub: boolean
): EmbedSource[] {
  switch (type) {
    case 'anime':
      return [
        {
          id: 'vidsrc-sbs',
          label: 'Server 1',
          url: `https://vidsrc.sbs/embed/anime/${mediaId}/${itemNumber}/${isDub ? '1' : '0'}`,
        },
        {
          id: 'vidsrc-xyz',
          label: 'Server 2',
          url: `https://vidsrc.xyz/embed/anime/${mediaId}/${itemNumber}/${isDub ? '1' : '0'}`,
        },
      ];
    case 'manga':
      return [
        { id: 'vidsrc-sbs', label: 'Server 1', url: `https://vidsrc.sbs/embed/manga/${mediaId}/${itemNumber}` },
        { id: 'vidsrc-xyz', label: 'Server 2', url: `https://vidsrc.xyz/embed/manga/${mediaId}/${itemNumber}` },
      ];
    case 'movie':
      return [
        { id: 'vidsrc-sbs', label: 'Server 1', url: `https://vidsrc.sbs/embed/movie/${mediaId}` },
        { id: 'vidsrc-xyz', label: 'Server 2', url: `https://vidsrc.xyz/embed/movie/${mediaId}` },
      ];
    case 'tv':
      return [
        {
          id: 'vidsrc-sbs',
          label: 'Server 1',
          url: `https://vidsrc.sbs/embed/tv/${mediaId}/${seasonNumber}/${itemNumber}`,
        },
        {
          id: 'vidsrc-xyz',
          label: 'Server 2',
          url: `https://vidsrc.xyz/embed/tv/${mediaId}/${seasonNumber}/${itemNumber}`,
        },
      ];
    default:
      return [];
  }
}

/**
 * Download / "open on source" target. These mirror families expose a direct
 * download listing for the same ids the player uses.
 */
export function getDownloadUrl(
  type: MediaKind,
  mediaId: number | string,
  itemNumber: number,
  seasonNumber: number
): string | null {
  switch (type) {
    case 'movie':
      return `https://vidsrc.xyz/embed/movie/${mediaId}`;
    case 'tv':
      return `https://vidsrc.xyz/embed/tv/${mediaId}/${seasonNumber}/${itemNumber}`;
    case 'anime':
      return `https://vidsrc.xyz/embed/anime/${mediaId}/${itemNumber}`;
    default:
      return null;
  }
}

export const hasDownload = (type: MediaKind) => type === 'movie' || type === 'tv';
