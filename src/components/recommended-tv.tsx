import { fetchFromTMDB } from '@/lib/tmdb';
import { type TVShow } from '@/lib/types';
import TvCarousel from '@/components/tv-carousel';
import { getTvSeoAnchorByIndex } from '@/components/tv-seo-anchors';

type RecommendedTvProps = {
  show: TVShow;
  limit?: number;
  title?: string;
};

export default async function RecommendedTv({
  show,
  limit = 12,
  title = 'More Like This',
}: RecommendedTvProps) {
  if (!show?.id) return null;

  const [recommended, similar, genreFallback] = await Promise.all([
    fetchFromTMDB(`/tv/${show.id}/recommendations`),
    fetchFromTMDB(`/tv/${show.id}/similar`),
    show.genres?.length
      ? fetchFromTMDB('/discover/tv', {
          with_genres: String(show.genres[0].id),
          sort_by: 'popularity.desc',
        })
      : Promise.resolve([]),
  ]);

  const seen = new Set<number>([show.id]);
  const merged: TVShow[] = [];

  for (const source of [recommended, similar, genreFallback]) {
    if (merged.length >= limit) break;

    for (const item of source as TVShow[]) {
      if (merged.length >= limit) break;
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }

  if (merged.length === 0) return null;

  const enhancedItems = merged.map((item, index) => ({
    ...item,
    seoAnchors: [getTvSeoAnchorByIndex(item.name, index, item.first_air_date)],
  }));

  return <TvCarousel title={title} items={enhancedItems} />;
}