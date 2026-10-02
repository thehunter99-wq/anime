import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';

import { fetchMovieById, getTMDBImageUrl } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { moviePath, watchPath, absoluteUrl } from '@/lib/routes';
import { buildDetailMetadata, buildMediaJsonLd } from '@/lib/seo';
import JsonLd from '@/components/json-ld-script';
import Header from '@/components/header';
import RecommendedMovies from '@/components/recommended-movies';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { AdSlot } from '@/components/ads';
import DownloadButtons from '@/components/download-buttons';
import { getDownloadUrl } from '@/lib/embed';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Incremental Static Regeneration.
 *
 * A one-hour window is the right trade here: TMDB metadata for a released film
 * is effectively immutable, so revalidating hourly wastes build invocations,
 * while trending pages need to stay fresh enough to rank. `revalidate` makes the
 * first request after the window serve a cached page and regenerate in the
 * background, so users never pay the regeneration latency.
 */
export const revalidate = 3600;

const toId = (raw: string): number => Number.parseInt(raw, 10);
const yearOf = (date: string | null | undefined): number | null =>
  date ? Number.parseInt(date.slice(0, 4), 10) || null : null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: raw } = await params;
  const id = toId(raw);
  if (!Number.isFinite(id)) return { title: 'Not Found' };

  const movie = await fetchMovieById(id);
  if (!movie) return { title: 'Not Found' };

  // Backdrop first: it is 16:9 and fills the hero, so it produces a much better
  // OG card than the portrait poster.
  const image = getTMDBImageUrl(movie.backdrop_path ?? movie.poster_path, 'original');

  return buildDetailMetadata({
    title: movie.title,
    overview: movie.overview,
    year: yearOf(movie.release_date),
    genres: movie.genres?.map((g) => g.name),
    image,
    path: moviePath(movie.id),
    siteUrl: SITE_URL,
  });
}

export default async function MoviePage({ params }: Props) {
  const { id: raw } = await params;
  const id = toId(raw);
  if (!Number.isFinite(id)) notFound();

  const movie = await fetchMovieById(id);
  if (!movie) notFound();

  const title = movie.title;
  const year = yearOf(movie.release_date);
  const image = getTMDBImageUrl(movie.backdrop_path ?? movie.poster_path, 'original');
  const poster = getTMDBImageUrl(movie.poster_path, 'w500');
  const watchHref = watchPath('movie', movie.id);

  const jsonLd = buildMediaJsonLd({
    type: 'Movie',
    title,
    description: movie.overview,
    image: image ?? undefined,
    url: absoluteUrl(moviePath(movie.id), SITE_URL),
    datePublished: movie.release_date || null,
    genres: movie.genres?.map((g) => g.name),
    // Omitted on purpose: TMDB votes are not displayed on this page, and an
    // aggregateRating without visible ratings is a structured-data violation.
    rating: null,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* `priority` marks this the LCP element and skips lazy loading, which is
          what actually moves the LCP score; everything below stays lazy. */}
      <div className="relative h-[45vh] w-full overflow-hidden sm:h-[55vh]">
        {image && (
          <Image
            src={image}
            alt={`Backdrop for ${title}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
      </div>

      <main className="container relative z-10 mx-auto -mt-32 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          {poster && (
            <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg shadow-2xl sm:w-52">
              <Image
                src={poster}
                alt={`${title} poster`}
                fill
                sizes="(max-width: 640px) 160px, 208px"
                className="object-cover"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {year && <Badge variant="secondary">{year}</Badge>}
                <Badge variant="outline">HD</Badge>
                <Badge variant="outline">English Sub / Dub</Badge>
                <span>
                  {SITE_NAME} &middot; Free streaming
                </span>
              </div>
            </div>

            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.slice(0, 4).map((genre) => (
                  <Badge key={genre.id} variant="outline">
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}

            {movie.overview && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {movie.overview}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href={watchHref}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch {title} Full Movie
                </a>
              </Button>
            </div>

            <DownloadButtons
              directUrl={getDownloadUrl('movie', movie.id, 1, 1)}
              isManga={false}
            />

            {/* Reserved height is declared on the slot, so a blocked ad script
                cannot shift the recommended rail below it. */}
            <AdSlot className="mt-2" />
          </div>
        </div>

        <RecommendedMovies movie={movie} />
      </main>

      <JsonLd data={jsonLd} />
    </div>
  );
}