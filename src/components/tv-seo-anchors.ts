import { fetchFromTMDB } from '@/lib/tmdb';
import { type TVShow } from '@/lib/types';

/**
 * Generate SEO-optimized anchor text variations for a TV show title
 * Targets long-tail search queries for series
 */
export function generateTvSeoAnchors(title: string, firstAirDate?: string): string[] {
  const year = firstAirDate ? new Date(firstAirDate).getFullYear() : null;
  const baseTitle = year ? `${title} (${year})` : title;

  const anchors = [
    // Watch variations
    `Watch ${baseTitle} Online Free`,
    `Watch ${baseTitle} All Seasons`,
    `Watch ${baseTitle} English Sub`,
    `Watch ${baseTitle} HD Free`,
    `Watch ${baseTitle} 1080p`,
    `Watch ${baseTitle} 4K`,
    `Watch ${baseTitle} Dubbed`,
    `Stream ${baseTitle} Online`,
    `Stream ${baseTitle} Free HD`,
    `Stream ${baseTitle} English Subbed`,
    `Watch ${baseTitle} Season 1`,
    `${baseTitle} All Episodes Free`,

    // Download variations
    `${baseTitle} Download 1080p`,
    `${baseTitle} Download 4K`,
    `${baseTitle} Free Download`,
    `${baseTitle} Direct Download`,
    `${baseTitle} Season 1 Download`,

    // Generic long-tail
    `${baseTitle} Full Series Online`,
    `${baseTitle} Free Streaming`,
    `${baseTitle} No Sign Up`,
    `${baseTitle} Watch Now`,
  ];

  return anchors;
}

export function getRandomTvSeoAnchor(title: string, firstAirDate?: string): string {
  const anchors = generateTvSeoAnchors(title, firstAirDate);
  return anchors[Math.floor(Math.random() * anchors.length)];
}

export function getTvSeoAnchorByIndex(title: string, index: number, firstAirDate?: string): string {
  const anchors = generateTvSeoAnchors(title, firstAirDate);
  return anchors[index % anchors.length];
}