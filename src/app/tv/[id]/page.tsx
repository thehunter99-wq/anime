import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

import { fetchTVShowById, fetchPopularTv, getTMDBImageUrl, isTMDBUnavailable } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { tvPath, tvSeasonPath, watchPath, absoluteUrl } from '@/lib/routes';
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
import TvCarousel from '@/components/tv-carousel';
import RecommendedTv from '@/components/recommended-tv';
import TrendingInGenreTv from '@/components/trending-in-genre-tv';
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

export const revalidate = 3600;

/** Additive generation: any id a rail or the sitemap links resolves on demand. */
export const dynamicParams = true;

/**
 * `fetchTVShowById` returns `null` both for "no such show" and for "TMDB did not
 * answer". Only the first may become `notFound()`: that response is cached by
 * ISR, so an outage must not be allowed to mark real shows as missing. Throwing
 * yields a 5xx, which Next does not cache, so the next request retries.
 */
async function resolveShow(id: number) {
  if (!Number.isFinite(id)) notFound();

  const show = await fetchTVShowById(id);
  if (show) return show;

  if (isTMDBUnavailable()) {
    throw new Error(`TMDB unavailable while resolving TV show ${id}`);
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

  const show = await resolveShow(id);

  // Trigger IndexNow ping for fast indexing during ISR revalidation (fire-and-forget)
  pingIndexNowForContent('tv', show.id).catch(console.error);

  return buildDetailMetadata({
    title: show.name,
    overview: show.overview,
    year: yearOf(show.first_air_date),
    genres: show.genres?.map((g) => g.name),
    image: getTMDBImageUrl(show.backdrop_path ?? show.poster_path, 'original'),
    path: tvPath(show.id),
    siteUrl: SITE_URL,
    isSeries: true,
  });
}

export default async function TvPage({ params }: Props) {
  const { id: raw } = await params;
  const id = toId(raw);

  const show = await resolveShow(id);

  // Trigger IndexNow ping for fast indexing (fire-and-forget)
  pingIndexNowForContent('tv', show.id).catch(console.error);

  const title = show.name;
  const year = yearOf(show.first_air_date);
  const backdrop = getTMDBImageUrl(show.backdrop_path ?? show.poster_path, 'original');
  const poster = getTMDBImageUrl(show.poster_path, 'w500');

  // Extra internal links out of this page. Fetched here rather than inside a
  // component so the rail is part of the server render and Googlebot sees the
  // anchors in the HTML, not after hydration.
  const [trendingTv] = await Promise.all([fetchPopularTv()]);

  /**
   * Seasons that get a landing page, from the payload already in hand.
   *
   * No extra request: `/tv/{id}` returns the full `seasons` array. Season 0 is
   * filtered out because TMDB uses it for specials and extras, which have no
   * numbering anyone searches for and no page to link to — the middleware guard
   * 404s `/tv/{id}/season-0` deliberately.
   *
   * These links are the only crawl path from the series page to the season pages,
   * and from there to the episode pages, so the whole cluster is reachable from
   * one fetch of `/tv/{id}`.
   */
  const seasons = (show.seasons ?? [])
    .filter((season) => Number.isFinite(season.season_number) && season.season_number >= 1)
    .sort((a, b) => a.season_number - b.season_number);

  const jsonLdNodes = [
    buildMediaJsonLd({
      type: 'TVSeries',
      title,
      description: show.overview,
      image: backdrop ?? undefined,
      url: absoluteUrl(tvPath(show.id), SITE_URL),
      datePublished: show.first_air_date || null,
      genres: show.genres?.map((g) => g.name),
      numberOfSeasons: show.number_of_seasons ?? null,
      numberOfEpisodes: show.number_of_episodes ?? null,
      // Emitted alongside the `<RatingBadge>` below, which shows the same numbers.
      rating: {
        voteAverage: show.vote_average,
        voteCount: show.vote_count ?? null,
      },
    }),
    buildVideoObject({
      name: `Watch ${title}${year ? ` (${year})` : ''} full series online`,
      description: show.overview,
      thumbnailUrl: poster ?? backdrop,
      uploadDate: show.first_air_date || null,
      embedUrl: absoluteUrl(watchPath('tv', show.id), SITE_URL),
    }),
    buildBreadcrumbList({
      siteUrl: SITE_URL,
      // `/tv` is a real, crawlable series index.
      sectionName: 'TV Shows',
      sectionUrl: `${SITE_URL}/tv`,
      title,
    }),
    buildFAQSchema({
      title,
      year,
      isSeries: true,
      isAnime: false,
    }),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="relative h-[45vh] w-full overflow-hidden sm:h-[55vh]">
        {backdrop && (
          <Image
            src={backdrop}
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
                {show.number_of_seasons ? (
                  <Badge variant="outline">{show.number_of_seasons} Seasons</Badge>
                ) : null}
                <Badge variant="outline">HD</Badge>
                <span>
                  {SITE_NAME} &middot; Free streaming
                </span>
                {/* Must stay in sync with `aggregateRating` in the JSON-LD below. */}
                <RatingBadge
                  average={show.vote_average}
                  votes={show.vote_count}
                  label="TMDB"
                />
              </div>
            </div>

            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {show.genres.slice(0, 4).map((genre) => (
                  <Badge key={genre.id} variant="outline">
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}

            {show.overview && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {show.overview}
              </p>
            )}

            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={`${watchPath('tv', show.id)}?season=1&episode=1`}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch {title} Season 1 Episode 1
              </a>
            </Button>

            <DownloadButtons
              directUrl={getDownloadUrl('tv', show.id, 1, 1)}
              episodeLabel="S1 E1"
              isManga={false}
            />

            {/* Second Smartlink entry point on a detail page. `DownloadButtons`
                already carries one inside its red button; this is the wider,
                labelled variant for a visitor who does not act on the first. */}
            <SmartlinkCta label={`Fast HD Download — ${title}`} hint="Sponsored offer" className="mt-1" />

            <AdSlot className="mt-2" />
          </div>
        </div>

        {/* Crawl paths: the similarity rail links out from this title's own
            cluster, the genre rail reaches titles with no other connection. */}
        {seasons.length > 0 && (
          <section className="mt-12" aria-labelledby="seasons-heading">
            <h2 id="seasons-heading" className="mb-4 text-2xl font-bold tracking-tight">
              {title} Seasons
            </h2>
            <nav aria-label={`Seasons of ${title}`} className="flex flex-wrap gap-2">
              {seasons.map((season) => (
                <Link
                  key={season.id}
                  href={tvSeasonPath(show.id, season.season_number)}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:bg-accent"
                >
                  Season {season.season_number}
                  {season.episode_count ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({season.episode_count} eps)
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
            <AdSlot className="mt-6" />
          </section>
        )}

        <RecommendedTv show={show} />
        {show.genres?.[0] && (
          <TrendingInGenreTv genre={show.genres[0]} excludeId={show.id} />
        )}
        {/* Fallback trending rail for additional crawl breadth. */}
        {trendingTv.length > 0 && (
          <TvCarousel title="Trending Series" items={trendingTv} />
        )}
      </main>

      <DetailJsonLd nodes={jsonLdNodes} />
    </div>
  );
}