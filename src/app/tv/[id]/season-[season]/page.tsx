import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { PlayCircle } from 'lucide-react';

import {
  fetchTVShowById,
  fetchSeasonById,
  getTMDBImageUrl,
  isTMDBUnavailable,
} from '@/lib/tmdb';
import type { Episode, Season, TVShow } from '@/lib/types';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { absoluteUrl, tvPath, tvSeasonPath, watchPath } from '@/lib/routes';
import { episodePath } from '@/lib/episode-slug';
import { buildMediaJsonLd, buildBreadcrumbList, buildVideoObject } from '@/lib/seo';
import DetailJsonLd from '@/components/detail-json-ld';
import { RatingBadge } from '@/components/rating-badge';
import Header from '@/components/header';
import RecommendedTv from '@/components/recommended-tv';
import TrendingInGenreTv from '@/components/trending-in-genre-tv';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  params: Promise<{ id: string; season: string }>;
};

/**
 * Season landing page for a TV series:
 *   /tv/[id]/season-[season]
 *
 * ── Why this route exists ────────────────────────────────────────────────────
 * "breaking bad season 2", "money heist season 3 download" and "the boys season 4
 * watch online" are head terms in their own right. They are distinct from both
 * the series page — which sells the whole show and cannot repeat itself for every
 * season without becoming duplicate content — and the episode page, which targets
 * one episode's long tail.
 *
 * Without this address the query has no page whose title, `<h1>` and canonical
 * match it, so it either lands on `/tv/[id]` and competes for the wrong intent or
 * simply does not rank. One page per season gives each of those queries its own
 * address, its own heading, and its own list of episodes to crawl.
 *
 * ── Why it is NOT a redirect target ─────────────────────────────────────────
 * This is a first-class page, not a hop to the series page. It carries its own
 * episode grid with real links, which is also how it earns internal links from
 * the series page and the episode pages above and below it.
 */
export const revalidate = 3600;
export const dynamicParams = true;

const toId = (raw: string): number => Number.parseInt(raw, 10);

/**
 * `[season]` is the literal `season-2`. Pulling the digits out keeps the route
 * tolerant of a hand-typed `s2` rather than sending it upstream as `NaN`.
 */
const numberFromSegment = (segment: string, fallback: number): number => {
  const match = /(\d+)/.exec(segment ?? '');
  return match ? Number.parseInt(match[1], 10) : fallback;
};

interface ResolvedSeason {
  show: TVShow;
  season: Season & { episodes: Episode[] };
  seasonNumber: number;
}

/**
 * Loads the show and the season.
 *
 * The same distinction as the episode routes: "TMDB says this does not exist" is
 * a cached `notFound()`, while "TMDB could not be reached" throws so Next serves
 * a 5xx it will not cache. Collapsing the two would let a 30-second upstream blip
 * mark a real season as gone for the full revalidate window, which is how a
 * catalogue gets deindexed.
 *
 * Season 0 is rejected explicitly. TMDB uses it for specials and behind-the-scenes
 * extras, which have no episode numbering anyone searches for — a page built from
 * them would be thin content with nothing on it.
 */
async function resolveSeason(id: number, seasonNumber: number): Promise<ResolvedSeason> {
  if (!Number.isFinite(id) || id < 1) notFound();
  if (!Number.isFinite(seasonNumber) || seasonNumber < 1) notFound();

  const [show, season] = await Promise.all([
    fetchTVShowById(id),
    fetchSeasonById(id, seasonNumber),
  ]);

  if (isTMDBUnavailable()) {
    throw new Error(`TMDB unavailable resolving /tv/${id}/season-${seasonNumber}`);
  }

  if (!show || !season) notFound();

  /**
   * A season TMDB knows about but has no episodes for renders an empty grid —
   * a page whose only content is a heading. That is a thin page, and a 404 is the
   * better answer than shipping one.
   */
  if (!season.episodes?.length) notFound();

  return { show, season, seasonNumber };
}

const yearOf = (date: string | null | undefined): number | null =>
  date ? Number.parseInt(date.slice(0, 4), 10) || null : null;

/**
 * Metadata for the season page.
 *
 * `absolute` for the same reason as the detail and episode builders: the root
 * layout applies a `%s | Brand` template that would otherwise print the brand
 * twice in a ~60-character SERP title.
 */
function buildSeasonMetadata(resolved: ResolvedSeason): Metadata {
  const { show, season, seasonNumber } = resolved;
  const year = yearOf(show.first_air_date);
  const yearPart = year ? ` (${year})` : '';

  const episodeCount = season.episodes.length;

  const pageTitle = `Watch ${show.name} Season ${seasonNumber}${yearPart} Online Free 1080p Sub/Dub - ${SITE_NAME}`;

  const base = `Watch ${show.name} Season ${seasonNumber} online free in HD 1080p with English Sub/Dub. All ${episodeCount} episodes of season ${seasonNumber} streaming and available to download on ${SITE_NAME}, no sign-up needed.`;

  const synopsis = (season.overview || show.overview || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const budget = 159 - base.length;
  const snippet = synopsis && budget >= 40
    ? synopsis.length <= budget
      ? synopsis
      : `${synopsis.slice(0, budget).replace(/\s+\S*$/, '')}…`
    : '';

  const description = snippet ? `${base} ${snippet}` : base;

  const canonical = absoluteUrl(tvSeasonPath(show.id, seasonNumber), SITE_URL);
  const poster = getTMDBImageUrl(season.poster_path ?? show.poster_path, 'w500');
  const backdrop = getTMDBImageUrl(show.backdrop_path ?? show.poster_path, 'original');
  const image = backdrop ?? poster;

  return {
    title: { absolute: pageTitle },
    description,
    alternates: { canonical },
    openGraph: {
      type: 'video.episode',
      siteName: SITE_NAME,
      title: pageTitle,
      description,
      url: canonical,
      locale: 'en_US',
      series: show.name,
      images: image
        ? [{ url: image, width: 1280, height: 720, alt: `${show.name} Season ${seasonNumber}` }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: image ? [image] : undefined,
    },
    other: {
      'og:video:season': String(seasonNumber),
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: rawId, season: rawSeason } = await params;

  const resolved = await resolveSeason(
    toId(rawId),
    numberFromSegment(rawSeason, 1)
  );

  return buildSeasonMetadata(resolved);
}

/** `S01E07`-style label for an episode row. */
const episodeCode = (seasonNumber: number, episodeNumber: number): string =>
  `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;

export default async function TvSeasonPage({ params }: Props) {
  const { id: rawId, season: rawSeason } = await params;

  const resolved = await resolveSeason(toId(rawId), numberFromSegment(rawSeason, 1));
  const { show, season, seasonNumber } = resolved;

  const year = yearOf(show.first_air_date);
  const backdrop = getTMDBImageUrl(show.backdrop_path, 'original');
  const poster = getTMDBImageUrl(season.poster_path ?? show.poster_path, 'w500');

  const seasonOverview = (season.overview || '').replace(/<[^>]*>/g, '').trim();
  const root = SITE_URL.replace(/\/$/, '');
  const seasonPath = tvSeasonPath(show.id, seasonNumber);

  /**
   * Every episode's watch landing page, built through the same helper the sitemap
   * and the episode routes use. That matters: the slugs here must be byte-identical
   * to the canonical ones, or middleware would 301 every link on this page — the
   * page would look fine and quietly waste a crawl hop per episode.
   */
  const episodes = season.episodes.map((episode) => ({
    episode,
    href: episodePath({
      showType: 'tv',
      intent: 'watch',
      id: show.id,
      seasonNumber,
      episodeNumber: episode.episode_number,
    }),
  }));

  const jsonLdNodes = [
    buildMediaJsonLd({
      type: 'TVSeries',
      title: `${show.name} Season ${seasonNumber}`,
      description: seasonOverview || show.overview,
      image: backdrop ?? undefined,
      url: absoluteUrl(seasonPath, SITE_URL),
      datePublished: season.air_date || show.first_air_date || null,
      genres: show.genres?.map((g) => g.name),
      numberOfEpisodes: season.episodes.length,
      rating: {
        voteAverage: show.vote_average,
        voteCount: show.vote_count ?? null,
      },
    }),
    buildVideoObject({
      name: `Watch ${show.name} Season ${seasonNumber} full season online`,
      description: seasonOverview || show.overview,
      thumbnailUrl: poster ?? backdrop,
      uploadDate: season.air_date || show.first_air_date || null,
      embedUrl: absoluteUrl(`${watchPath('tv', show.id)}?season=${seasonNumber}&episode=1`, SITE_URL),
    }),
    buildBreadcrumbList({
      siteUrl: SITE_URL,
      sectionName: 'TV Shows',
      sectionUrl: `${root}/tv`,
      title: `${show.name} Season ${seasonNumber}`,
    }),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="relative h-[45vh] w-full overflow-hidden sm:h-[55vh]">
        {backdrop && (
          <Image
            src={backdrop}
            alt={`Backdrop for ${show.name} Season ${seasonNumber}`}
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
                alt={`${show.name} Season ${seasonNumber} poster`}
                fill
                sizes="(max-width: 640px) 160px, 208px"
                className="object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
              {/* Link back to the series: a genuine parent relation, and the
                  crawl path that keeps the two pages connected. */}
              <p className="text-sm text-muted-foreground">
                <Link href={tvPath(show.id)} className="hover:text-primary transition-colors">
                  {show.name}
                </Link>
              </p>
              <h1 className="text-3xl font-bold sm:text-4xl">
                {show.name} Season {seasonNumber}
                {year ? ` (${year})` : ''}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{season.episodes.length} Episodes</Badge>
                <Badge variant="outline">1080p</Badge>
                <Badge variant="outline">Sub / Dub</Badge>
                <Badge variant="secondary">FREE</Badge>
                <span>{SITE_NAME} &middot; Free streaming</span>
                <RatingBadge average={show.vote_average} votes={show.vote_count} label="TMDB" />
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

            {seasonOverview && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {seasonOverview}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href={`${watchPath('tv', show.id)}?season=${seasonNumber}&episode=1`}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch Season {seasonNumber} Episode 1
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={tvPath(show.id)}>All seasons of {show.name}</Link>
              </Button>
            </div>

          </div>
        </div>

        {/* The episode grid is the real content of this page. Each row links to a
            canonical episode landing page, which is both the crawl path into the
            long tail and how a visitor actually picks an episode. */}
        <section className="mt-12" aria-labelledby="episodes-heading">
          <h2 id="episodes-heading" className="mb-4 text-2xl font-bold tracking-tight">
            {show.name} Season {seasonNumber} Episodes
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {episodes.map(({ episode, href }) => {
              const still = getTMDBImageUrl(episode.still_path, 'w300');
              return (
                <Card key={episode.id} className="overflow-hidden">
                  <Link href={href} className="block">
                    <div className="relative aspect-video w-full bg-muted">
                      {still ? (
                        <Image
                          src={still}
                          alt={`${show.name} ${episodeCode(seasonNumber, episode.episode_number)} still`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                  </Link>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">
                        {episodeCode(seasonNumber, episode.episode_number)}
                      </span>
                      {episode.air_date && <span>&middot; {episode.air_date}</span>}
                      {episode.runtime ? <span>&middot; {episode.runtime}m</span> : null}
                    </div>
                    <h3 className="text-sm font-semibold leading-snug">
                      <Link href={href} className="hover:text-primary transition-colors">
                        {episode.name || `Episode ${episode.episode_number}`}
                      </Link>
                    </h3>
                    {episode.overview && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {episode.overview}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <div className="mt-12 space-y-12">
          <RecommendedTv show={show} />
          {show.genres?.[0] && <TrendingInGenreTv genre={show.genres[0]} excludeId={show.id} />}
        </div>
      </main>

      <DetailJsonLd nodes={jsonLdNodes} />
    </div>
  );
}
