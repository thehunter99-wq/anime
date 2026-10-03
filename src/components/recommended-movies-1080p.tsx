import { fetchFromTMDB } from '@/lib/tmdb';
import { type Movie } from '@/lib/types';
import MediaCarousel from '@/components/media-carousel';
import { getSeoAnchorByIndex } from '@/components/recommended-movies-enhanced';

/**
 * Fetches movies with high-quality 1080p/4K sources available.
 * Creates a "Recommended Movies in 1080p" section with SEO-rich anchor texts.
 *
 * Strategy:
 * 1. Get popular/high-rated movies
 * 2. Filter for movies likely to have 1080p sources (popular, recent, high budget)
 * 3. Return enhanced items with "1080p" quality badges in anchor texts
 */
export async function getRecommendedMovies1080p(limit = 10): Promise<
  Array<Movie & { seoAnchors: string[]; quality: string }>
> {
  try {
    // Fetch from multiple sources for diversity
    const [popular, topRated, nowPlaying] = await Promise.all([
      fetchFromTMDB('/movie/popular', { 'vote_count.gte': '500' }),
      fetchFromTMDB('/movie/top_rated', { 'vote_count.gte': '1000' }),
      fetchFromTMDB('/movie/now_playing', { 'vote_count.gte': '100' }),
    ]);

    // Combine and deduplicate
    const seen = new Set<number>();
    const combined: Movie[] = [];

    for (const source of [popular, topRated, nowPlaying]) {
      for (const movie of source) {
        if (movie?.id && !seen.has(movie.id) && movie.vote_average >= 6.5) {
          seen.add(movie.id);
          combined.push(movie);
        }
      }
    }

    // Sort by a quality score: vote_average * log(vote_count) * recency boost
    const scoreMovie = (movie: Movie) => {
      const recency = movie.release_date
        ? Math.max(0, 1 - (Date.now() - new Date(movie.release_date).getTime()) / (365 * 24 * 60 * 60 * 1000))
        : 0;
      const popularity = Math.log10(Math.max(1, movie.vote_count || 1));
      return (movie.vote_average || 0) * popularity * (1 + recency * 0.5);
    };

    combined.sort((a, b) => scoreMovie(b) - scoreMovie(a));

    // Enhance with SEO anchors emphasizing 1080p/4K quality
    return combined.slice(0, limit).map((movie, index) => ({
      ...movie,
      seoAnchors: generate1080pAnchors(movie, index),
      quality: movie.vote_average >= 8 ? '4K UHD' : '1080p HD',
    }));
  } catch (error) {
    console.warn('[RecommendedMovies1080p] Failed to fetch:', error);
    return [];
  }
}

/**
 * Generate SEO-optimized anchor texts emphasizing 1080p/4K quality.
 * These target high-intent queries like "Watch Inception 1080p free HD"
 */
function generate1080pAnchors(movie: Movie, index: number): string[] {
  const title = movie.title;
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const baseTitle = year ? `${title} (${year})` : title;
  const quality = movie.vote_average >= 8 ? '4K' : '1080p';
  const qualityLabel = movie.vote_average >= 8 ? '4K UHD' : '1080p HD';

  return [
    // Primary watch variations with quality
    `Watch ${baseTitle} ${quality} Free Online`,
    `Watch ${baseTitle} ${qualityLabel} HD Streaming`,
    `Watch ${title} ${quality} English Sub Free`,
    `Stream ${baseTitle} ${quality} No Sign Up`,
    `Stream ${title} ${qualityLabel} Online Free`,

    // Download variations
    `${baseTitle} ${quality} Download Free`,
    `${title} ${qualityLabel} Direct Download`,
    `${baseTitle} ${quality} Fast Download HD`,

    // Long-tail with quality emphasis
    `${baseTitle} Full Movie ${quality} Online`,
    `${title} ${qualityLabel} Free Streaming`,
    `${baseTitle} Watch Now ${quality}`,
    `${title} ${quality} No Buffer`,

    // Quality-specific long-tail
    `Best Quality ${baseTitle} ${quality} Watch Free`,
    `${baseTitle} HD ${quality} English Dubbed`,
  ];
}

/**
 * RecommendedMovies1080p - Server Component for watch pages.
 * Displays high-quality movies with 1080p/4K emphasis in anchor texts.
 */
export default async function RecommendedMovies1080p({ limit = 8 }: { limit?: number }) {
  const movies = await getRecommendedMovies1080p(limit);

  if (movies.length === 0) return null;

  // Transform to MediaCarousel compatible format
  const items = movies.map((movie, index) => ({
    ...movie,
    seoAnchors: movie.seoAnchors,
    quality: movie.quality,
  }));

  return (
    <section className="mt-16" aria-labelledby="recommended-1080p-heading">
      <h2 id="recommended-1080p-heading" className="mb-4 text-2xl font-bold tracking-tight text-foreground">
        Recommended Movies in 1080p
      </h2>
      <p className="mb-6 text-sm text-muted-foreground max-w-2xl">
        Hand-picked movies available in Full HD 1080p and 4K UHD. Free streaming, no registration.
      </p>
      <MediaCarousel
        title=""
        items={items as any[]}
      />
    </section>
  );
}