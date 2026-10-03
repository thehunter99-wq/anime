import { fetchFromTMDB } from '@/lib/tmdb';
import { type Movie } from '@/lib/types';
import MovieCarousel from '@/components/movie-carousel';

type RecommendedMoviesProps = {
  movie: Movie;
};

/**
 * "More Like This" rail — the item-similarity link cluster on a detail page.
 *
 * ── Why three sources instead of one ─────────────────────────────────────────
 * The previous version only called `/discover/movie` with the first genre and
 * sorted by popularity. That is a *category* list wearing the label "More Like
 * This": it surfaced whatever else was popular in the genre, which says nothing
 * about this particular film and gave the crawler the same links on every page of
 * that genre.
 *
 * The split now used is:
 *  1. `/movie/{id}/recommendations` — TMDB's own editorial + vector similarity.
 *  2. `/movie/{id}/similar` — same era, tone and shape, from the same data.
 *  3. `/discover/movie` on the primary genre — the fallback, and the only source
 *     that still produces links on an obscure title where both other calls come
 *     back empty.
 *
 * All three are capped before merging so one source cannot crowd out the others
 * and leave the rail looking like a single list twice over.
 */
export default async function RecommendedMovies({ movie }: RecommendedMoviesProps) {
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

  /** Ids already emitted, so the same title never appears twice in one rail. */
  const seen = new Set<number>([movie.id]);
  const merged: Movie[] = [];

  for (const source of [recommended, similar, genreFallback]) {
    if (merged.length >= 20) break;

    for (const item of source as Movie[]) {
      if (merged.length >= 20) break;
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }

  if (merged.length === 0) return null;

  return <MovieCarousel title="More Like This" items={merged} />;
}