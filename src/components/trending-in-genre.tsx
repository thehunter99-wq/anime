import { fetchFromTMDB } from '@/lib/tmdb';
import { type Movie } from '@/lib/types';
import MovieCarousel from '@/components/movie-carousel';
import { getSeoAnchorByIndex } from '@/components/recommended-movies-enhanced';

type TrendingInGenreProps = {
  /** The genre to discover, e.g. `{ id: 28, name: 'Action' }`. */
  genre: { id: number; name: string };
  /** Excluded from the results — the page's own title. */
  excludeId?: number;
};

export default async function TrendingInGenre({
  genre,
  excludeId,
}: TrendingInGenreProps) {
  if (!genre?.id || !genre.name) return null;

  const trending = await fetchFromTMDB('/discover/movie', {
    with_genres: String(genre.id),
    sort_by: 'popularity.desc',
    'vote_count.gte': '200',
  });

  const items: (Movie & { seoAnchors?: string[] })[] = trending
    .filter((item) => item && item.id !== excludeId)
    .slice(0, 20)
    .map((item, index) => ({
      ...item,
      seoAnchors: [getSeoAnchorByIndex(item.title, index, item.release_date)],
    }));

  if (items.length === 0) return null;

  return <MovieCarousel title={`Trending in ${genre.name}`} items={items} />;
}