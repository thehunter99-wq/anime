import { fetchFromAniList } from '@/lib/anilist';
import { type Media } from '@/lib/types';

/**
 * Generate SEO-optimized anchor text variations for an anime/manga title
 * Targets long-tail search queries for anime/manga
 */
export function generateAnimeSeoAnchors(title: string, startDate?: { year: number } | null, type: 'ANIME' | 'MANGA' = 'ANIME'): string[] {
  const year = startDate?.year || null;
  const baseTitle = year ? `${title} (${year})` : title;
  const isAnime = type === 'ANIME';
  const noun = isAnime ? 'anime' : 'manga';
  const watchVerb = isAnime ? 'Watch' : 'Read';
  const episodeChapter = isAnime ? 'Episode' : 'Chapter';

  const anchors = [
    // Watch/Read variations
    `${watchVerb} ${baseTitle} Online Free`,
    `${watchVerb} ${baseTitle} Full ${noun.charAt(0).toUpperCase() + noun.slice(1)}`,
    `${watchVerb} ${baseTitle} English Sub`,
    `${watchVerb} ${baseTitle} HD Free`,
    `${watchVerb} ${baseTitle} 1080p`,
    `${watchVerb} ${baseTitle} 4K`,
    `${watchVerb} ${baseTitle} Dubbed`,
    `Stream ${baseTitle} Online`,
    `Stream ${baseTitle} Free HD`,
    `Stream ${baseTitle} English Subbed`,
    `${watchVerb} ${baseTitle} ${episodeChapter} 1`,
    `${baseTitle} All ${isAnime ? 'Episodes' : 'Chapters'} Free`,

    // Download variations
    `${baseTitle} Download 1080p`,
    `${baseTitle} Download 4K`,
    `${baseTitle} Free Download`,
    `${baseTitle} Direct Download`,
    `${baseTitle} Fast Download`,
    `${baseTitle} ${episodeChapter} 1 Download`,

    // Generic long-tail
    `${baseTitle} Full ${noun.charAt(0).toUpperCase() + noun.slice(1)} Online`,
    `${baseTitle} Free Streaming`,
    `${baseTitle} No Sign Up`,
    `${baseTitle} ${watchVerb} Now`,
  ];

  return anchors;
}

export function getRandomAnimeSeoAnchor(title: string, startDate?: { year: number } | null, type: 'ANIME' | 'MANGA' = 'ANIME'): string {
  const anchors = generateAnimeSeoAnchors(title, startDate, type);
  return anchors[Math.floor(Math.random() * anchors.length)];
}

export function getAnimeSeoAnchorByIndex(title: string, index: number, startDate?: { year: number } | null, type: 'ANIME' | 'MANGA' = 'ANIME'): string {
  const anchors = generateAnimeSeoAnchors(title, startDate, type);
  return anchors[index % anchors.length];
}

/**
 * Enhanced anime/manga recommendations with SEO anchors
 * Fetches from AniList and adds keyword-rich anchor texts
 */
export async function getEnhancedAnimeRecommendations(
  media: Media,
  limit = 12
): Promise<Array<Media & { seoAnchors?: string[] }>> {
  if (!media.genres?.length) return [];

  try {
    // Fetch same-genre recommendations
    const [sameGenre, trending] = await Promise.all([
      fetchFromAniList({
        type: media.type,
        genre_in: [media.genres[0]],
        sort: ['POPULARITY_DESC'],
        perPage: limit + 5,
      }).catch(() => []),
      fetchFromAniList({
        type: media.type,
        sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
        perPage: limit + 5,
      }).catch(() => []),
    ]);

    const seen = new Set<number>([media.id]);
    const merged: Media[] = [];

    for (const source of [sameGenre, trending]) {
      if (merged.length >= limit) break;

      for (const item of source as Media[]) {
        if (merged.length >= limit) break;
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
    }

    if (merged.length === 0) return [];

    // Enhance each item with SEO-optimized anchor text variations
    const enhancedItems = merged.map((item, index) => ({
      ...item,
      seoAnchors: [getAnimeSeoAnchorByIndex(
        item.title.english || item.title.romaji, 
        index, 
        item.startDate, 
        item.type
      )],
    }));

    return enhancedItems;
  } catch {
    return [];
  }
}

/**
 * Enhanced trending anime/manga by genre with SEO anchors
 */
export async function getEnhancedTrendingByGenre(
  genre: string,
  type: 'ANIME' | 'MANGA',
  excludeId?: number,
  limit = 20
): Promise<Array<Media & { seoAnchors?: string[] }>> {
  try {
    const trending = await fetchFromAniList({
      type,
      genre_in: [genre],
      sort: ['POPULARITY_DESC'],
      perPage: limit + 5,
    }).catch(() => []);

    const items = trending
      .filter((item) => item && item.id !== excludeId)
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        seoAnchors: [getAnimeSeoAnchorByIndex(
          item.title.english || item.title.romaji,
          index,
          item.startDate,
          item.type
        )],
      }));

    return items;
  } catch {
    return [];
  }
}