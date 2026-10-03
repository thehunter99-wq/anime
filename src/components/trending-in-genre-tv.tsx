import { fetchFromTMDB } from '@/lib/tmdb';
import { type TVShow } from '@/lib/types';
import TvCarousel from '@/components/tv-carousel';
import { getTvSeoAnchorByIndex } from '@/components/tv-seo-anchors';

type TrendingInGenreTvProps = {
  genre: { id: number; name: string };
  excludeId?: number;
};

export default async function TrendingInGenreTv({
  genre,
  excludeId,
}: TrendingInGenreTvProps) {
  if (!genre?.id || !genre.name) return null;

  const trending = await fetchFromTMDB('/discover/tv', {
    with_genres: String(genre.id),
    sort_by: 'popularity.desc',
    'vote_count.gte': '200',
  });

  const items: (TVShow & { seoAnchors?: string[] })[] = trending
    .filter((item) => item && item.id !== excludeId)
    .slice(0, 20)
    .map((item, index) => ({
      ...item,
      seoAnchors: [getTvSeoAnchorByIndex(item.name, index, item.first_air_date)],
    }));

  if (items.length === 0) return null;

  return <TvCarousel title={`Trending in ${genre.name}`} items={items} />;
}