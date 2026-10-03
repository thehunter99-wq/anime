import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';

import { fetchMovieById, getTMDBImageUrl, isTMDBUnavailable } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { moviePath, watchPath, absoluteUrl } from '@/lib/routes';
import {
  buildDetailMetadata,
  buildMediaJsonLd,
  buildVideoObject,
  buildBreadcrumbList,
  buildFAQSchema,
} from '@/lib/seo';
import DetailJsonLd from '@/components/detail-json-ld';
import { RatingBadge } from '@/components/rating-badge';
import Header from '@/components/header';
import RecommendedMovies from '@/components/recommended-movies-enhanced';
import TrendingInGenre from '@/components/trending-in-genre';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { AdSlot } from '@/components/ads';
import DownloadButtons from '@/components/download-buttons';
import SmartlinkCta from '@/components/smartlink-cta';
import { getDownloadUrl } from '@/lib/embed';
import { pingIndexNowForContent } from '@/lib/indexnow';

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

/**
 * `true` is the default, but it is stated explicitly because this route is
 * deliberately additive to what the build knows about.
 *
 * A film only becomes reachable here if a rail, a search result, or the sitemap
 * happened to link it. Without this flag a `generateStaticParams`-less route is
 * still fine, but stating the intent guards against anyone later adding a
 * restrictive `generateStaticParams` and unknowingly 404-ing the long tail.
 */
export const dynamicParams = true;

/**
 * Guards against caching a false 404 while TMDB is down.
 *
 * `fetchMovieById` returns `null` both for "no such movie" and for "TMDB did not
 * answer". Under ISR those must diverge: `notFound()` is cached, so a transient
 * outage would otherwise mark real movies as gone for up to an hour — the exact
 * way a catalog gets deindexed. A thrown error surfaces as a 5xx, which Next
 * does not persist, so the next request re-attempts the fetch.
 */
async function resolveMovie(id: number) {
  if (!Number.isFinite(id)) notFound();

  const movie = await fetchMovieById(id);
  if (movie) return movie;

  if (isTMDBUnavailable()) {
    throw new Error(`TMDB unavailable while resolving movie ${id}`);
  }
  notFound();
}

const toId = (raw: string): number => Number.parseInt(raw, 10);
const yearOf = (date: string | null | undefined): number | null =>
  date ? Number.parseInt(date.slice(0, 4), 10) || null : null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: raw } = await params;
  const id = toId(raw);
  if (!Number.isFinite(id)) return { title: 'Not Found' };

  const movie = await resolveMovie(id);

  // Trigger IndexNow ping for fast indexing during ISR revalidation (fire-and-forget)
  pingIndexNowForContent('movie', movie.id).catch(console.error);

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

  const movie = await resolveMovie(id);

  // Trigger IndexNow ping for fast indexing (fire-and-forget)
  pingIndexNowForContent('movie', movie.id).catch(console.error);

  const title = movie.title;
  const year = yearOf(movie.release_date);
  const image = getTMDBImageUrl(movie.backdrop_path ?? movie.poster_path, 'original');
  const poster = getTMDBImageUrl(movie.poster_path, 'w500');
  const watchHref = watchPath('movie', movie.id);

  const jsonLdNodes = [
    buildMediaJsonLd({
      type: 'Movie',
      title,
      description: movie.overview,
      image: image ?? undefined,
      url: absoluteUrl(moviePath(movie.id), SITE_URL),
      datePublished: movie.release_date || null,
      genres: movie.genres?.map((g) => g.name),
      // Safe to emit now because `<RatingBadge>` renders these exact numbers
      // directly below. Emitting a rating the page does not display is a
      // structured-data policy violation, so the two are always wired together.
      rating: {
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count ?? null,
      },
    }),
    buildVideoObject({
      name: `Watch ${title}${year ? ` (${year})` : ''} full movie online`,
      description: movie.overview,
      thumbnailUrl: poster ?? image,
      uploadDate: movie.release_date || null,
      embedUrl: absoluteUrl(watchPath('movie', movie.id), SITE_URL),
    }),
    buildBreadcrumbList({
      siteUrl: SITE_URL,
      // No `/movies` index exists; movies live in a home-page tab, which is the
      // same URL the header navigation links to.
      sectionName: 'Movies',
      sectionUrl: `${SITE_URL}/?tab=movies`,
      title,
    }),
    buildFAQSchema({
      title,
      year,
      isSeries: false,
      isAnime: false,
    }),
  ];

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
                loading="lazy"
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
                {/* Required for the `aggregateRating` in the page JSON-LD: the
                    visible number must be the same number the markup declares. */}
                <RatingBadge
                  average={movie.vote_average}
                  votes={movie.vote_count}
                  label="TMDB"
                />
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

            {/* Second Smartlink entry point on a detail page. `DownloadButtons`
                already carries one inside its red button; this is the wider,
                labelled variant for a visitor who does not act on the first. */}
            <SmartlinkCta label={`Fast HD Download — ${title}`} hint="Sponsored offer" className="mt-1" />

            {/* Reserved height is declared on the slot, so a blocked ad script
                cannot shift the recommended rail below it. */}
            <AdSlot className="mt-2" />
          </div>
        </div>

                {/* Crawl paths: the similarity rail links out from this title's own
            cluster, the genre rail reaches titles with no other connection. */}
        <RecommendedMovies movie={movie} />
        {movie.genres?.[0] && (
          <TrendingInGenre genre={movie.genres[0]} excludeId={movie.id} />
        )}
      </main>

      <DetailJsonLd nodes={jsonLdNodes} />
    </div>
  );
}