import { fetchFromTMDB } from '@/lib/tmdb';
import { type Movie } from '@/lib/types';
import MovieCarousel from '@/components/movie-carousel';
import { slugify } from '@/lib/utils';

type RecommendedMoviesProps = {
  movie: Movie;
  /** Maximum number of recommendations to show */
  limit?: number;
  /** Custom title for the rail */
  title?: string;
};

/**
 * Enhanced "More Like This" rail with SEO-optimized keyword-rich anchor texts
 *
 * Generates long-tail keyword variations for each recommendation:
 * - "Watch [Title] Online Free"
 * - "Watch [Title] English Sub HD"
 * - "Watch [Title] 1080p Free Streaming"
 * - "[Title] Download 1080p"
 * - "[Title] Full Movie Online"
 *
 * This creates a massive web of interlinked pages with diverse anchor text
 * so Googlebot crawls the entire site in a single pass and captures
 * long-tail search queries.
 */
export default async function RecommendedMovies({
  movie,
  limit = 12,
  title = 'More Like This',
}: RecommendedMoviesProps) {
  if (!movie?.id) return null;

  const [recommended, similar, genreFallback] = await Promise.all([
    fetchFromTMDB(`/movie/${movie.id}/recommendations`),
    fetchFromTMDB(`/movie/${movie.id}/similar`),
    movie.genres?.length
      ? fetchFromTMDB('/discover/movie', {
          with_genres: String(movie.genres[0].id),
          sort_by: 'popularity.desc',
        })
      : Promise.resolve([]),
  ]);

  const seen = new Set<number>([movie.id]);
  const merged: Movie[] = [];

  for (const source of [recommended, similar, genreFallback]) {
    if (merged.length >= limit) break;

    for (const item of source as Movie[]) {
      if (merged.length >= limit) break;
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }

  if (merged.length === 0) return null;

  // Enhance each movie with SEO-optimized anchor text variations
  const enhancedItems = merged.map(item => ({
    ...item,
    seoAnchors: generateSeoAnchors(item.title, item.release_date),
  }));

  return <MovieCarousel title={title} items={enhancedItems as any[]} />;
}

/**
 * Generate SEO-optimized anchor text variations for a movie title
 * These anchor texts target long-tail search queries
 */
function generateSeoAnchors(title: string, releaseDate?: string): string[] {
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const baseTitle = year ? `${title} (${year})` : title;

  const anchors = [
    // Watch variations
    `Watch ${baseTitle} Online Free`,
    `Watch ${baseTitle} Full Movie`,
    `Watch ${baseTitle} English Sub`,
    `Watch ${baseTitle} HD Free`,
    `Watch ${baseTitle} 1080p`,
    `Watch ${baseTitle} 4K`,
    `Watch ${baseTitle} Dubbed`,
    `Stream ${baseTitle} Online`,
    `Stream ${baseTitle} Free HD`,
    `Stream ${baseTitle} English Subbed`,

    // Download variations
    `${baseTitle} Download 1080p`,
    `${baseTitle} Download 4K`,
    `${baseTitle} Free Download`,
    `${baseTitle} Direct Download`,
    `${baseTitle} Fast Download`,

    // Generic long-tail
    `${baseTitle} Full Movie Online`,
    `${baseTitle} Free Streaming`,
    `${baseTitle} No Sign Up`,
    `${baseTitle} Watch Now`,
  ];

  return anchors;
}

/**
 * Get a random SEO anchor for a movie (used in MovieCard)
 * Rotates through variations to create natural anchor text diversity
 */
export function getRandomSeoAnchor(title: string, releaseDate?: string): string {
  const anchors = generateSeoAnchors(title, releaseDate);
  return anchors[Math.floor(Math.random() * anchors.length)];
}

/**
 * Get SEO anchor by index (for deterministic rotation)
 */
export function getSeoAnchorByIndex(title: string, index: number, releaseDate?: string): string {
  const anchors = generateSeoAnchors(title, releaseDate);
  return anchors[index % anchors.length];
}