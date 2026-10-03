import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';

import {
  fetchTVShowById,
  fetchSeasonById,
  fetchEpisodeById,
  getTMDBImageUrl,
  isTMDBUnavailable,
} from '@/lib/tmdb';
import type { Episode, Season, TVShow } from '@/lib/types';
import { SITE_NAME } from '@/lib/site';
import {
  buildEpisodePageJsonLd,
  buildEpisodePageMetadata,
  episodeHeading,
  playerPathFor,
  type EpisodePageSeoInput,
} from '@/lib/episode-seo';
import DetailJsonLd from '@/components/detail-json-ld';
import { RatingBadge } from '@/components/rating-badge';
import Header from '@/components/header';
import RecommendedTv from '@/components/recommended-tv';
import TrendingInGenreTv from '@/components/trending-in-genre-tv';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/ads';

type Props = {
  params: Promise<{
    id: string;
    season: string;
    episode: string;
    slug: string;
  }>;
};

/**
 * Episode landing page for a TV series:
 *   /watch/tv/[id]/season-[season]/episode-[episode]/[slug]
 *
 * ── What this page is for ────────────────────────────────────────────────────
 * It is the indexable surface for the long-tail "watch <series> S01E02" queries.
 * The video itself lives one hop away on `/view/tv/[id]?season=&episode=`, which
 * is `noindex` and disallowed in robots.txt, because it is a thin wrapper around a
 * third-party iframe and would otherwise compete with this page for the same
 * keywords. So this page carries the metadata, the structured data and the
 * internal links, and the player carries the playback.
 *
 * ── One URL per episode ─────────────────────────────────────────────────────
 * `[slug]` is a single segment, not `[...slug]`, and only one value of it is
 * canonical: `middleware.ts` 301s every other variant to it and 404s anything
 * malformed, before the request reaches this component. Making the segment
 * single rather than catch-all is deliberate — a catch-all would let extra
 * segments through to the renderer, where the only available answer is a soft 404.
 *
 * ── Caching ──────────────────────────────────────────────────────────────────
 * `revalidate` matches `DATA_REVALIDATE_SECONDS`, which is the binding constraint
 * anyway — the TMDB fetches behind it cache for an hour, so a longer route window
 * would not keep the page fresher.
 */
export const revalidate = 3600;
export const dynamicParams = true;

const toId = (raw: string): number => Number.parseInt(raw, 10);

/**
 * The `[season]` / `[episode]` segments are literal `season-1`, `episode-12`.
 * Pulling the digits out keeps the route tolerant of a hand-typed `s1`/`e12`
 * rather than sending it to `/tv/NaN`.
 */
const numberFromSegment = (segment: string, fallback: number): number => {
  const match = /(\d+)/.exec(segment ?? '');
  return match ? Number.parseInt(match[1], 10) : fallback;
};

interface Resolved {
  show: TVShow;
  season: Season & { episodes: Episode[] };
  episode: Episode;
  seasonNumber: number;
  episodeNumber: number;
}

/**
 * Loads the show, its season and the specific episode.
 *
 * Every branch distinguishes "TMDB says this does not exist" from "TMDB could
 * not be reached". That distinction is load bearing: `notFound()` output is
 * cached by the ISR layer, so a 30-second upstream blip that reached `notFound()`
 * would serve a hard 404 for a real episode for up to an hour — Googlebot would
 * record genuine pages as gone, which is how a long-tail catalogue gets
 * deindexed. When the upstream is merely unavailable we throw instead, and Next
 * does not cache a 5xx.
 */
async function resolveEpisodeRoute(id: number, seasonNumber: number, episodeNumber: number): Promise<Resolved> {
  if (!Number.isFinite(id) || id < 1) notFound();
  if (!Number.isFinite(seasonNumber) || seasonNumber < 1) notFound();
  if (!Number.isFinite(episodeNumber) || episodeNumber < 1) notFound();

  const [show, season, episode] = await Promise.all([
    fetchTVShowById(id),
    fetchSeasonById(id, seasonNumber),
    fetchEpisodeById(id, seasonNumber, episodeNumber),
  ]);

  if (isTMDBUnavailable()) {
    throw new Error(`TMDB unavailable resolving /watch/tv/${id} S${seasonNumber}E${episodeNumber}`);
  }

  if (!show || !season || !episode) notFound();

  return { show, season, episode, seasonNumber, episodeNumber };
}

/** One place that knows how the four episode routes feed their upstream data in. */
function toSeoInput(
  { show, season, episode, seasonNumber, episodeNumber }: Resolved
): EpisodePageSeoInput {
  const still = episode.still_path ?? show.backdrop_path ?? show.poster_path;

  return {
    showType: 'tv',
    intent: 'watch',
    id: show.id,
    seriesTitle: show.name,
    seriesOverview: show.overview,
    seasonNumber,
    episodeNumber,
    episodeName: episode.name,
    episodeOverview: episode.overview || season.overview || null,
    airDate: episode.air_date || season.air_date || null,
    image: getTMDBImageUrl(still, 'w780'),
    durationMinutes: episode.runtime,
    voteAverage: show.vote_average,
    voteCount: show.vote_count,
  };
}

export async function generateMetadata({ params }: Props) {
  const { id: rawId, season: rawSeason, episode: rawEpisode } = await params;

  const resolved = await resolveEpisodeRoute(
    toId(rawId),
    numberFromSegment(rawSeason, 1),
    numberFromSegment(rawEpisode, 1)
  );

  return buildEpisodePageMetadata(toSeoInput(resolved));
}

export default async function WatchTvEpisodePage({ params }: Props) {
  const { id: rawId, season: rawSeason, episode: rawEpisode } = await params;

  const resolved = await resolveEpisodeRoute(
    toId(rawId),
    numberFromSegment(rawSeason, 1),
    numberFromSegment(rawEpisode, 1)
  );

  const seoInput = toSeoInput(resolved);

  const { show, episode, seasonNumber, episodeNumber } = resolved;
  const heading = episodeHeading(seoInput);
  const year = Number.parseInt((show.first_air_date ?? '').slice(0, 4), 10) || null;
  const backdrop = getTMDBImageUrl(episode.still_path ?? show.backdrop_path, 'original');
  const poster = getTMDBImageUrl(show.poster_path, 'w500');
  const playerHref = playerPathFor(seoInput);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="relative h-[45vh] w-full overflow-hidden sm:h-[55vh]">
        {backdrop && (
          <Image
            src={backdrop}
            alt={`Still frame from ${heading}`}
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
                alt={`${show.name} poster`}
                fill
                sizes="(max-width: 640px) 160px, 208px"
                className="object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {year && <Badge variant="secondary">{year}</Badge>}
                <Badge variant="secondary">
                  Season {seasonNumber} · Episode {episodeNumber}
                </Badge>
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

            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={playerHref}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch {show.name} Season {seasonNumber} Episode {episodeNumber}
              </a>
            </Button>

            <AdSlot className="mt-2" />
          </div>
        </div>

        {/* Crawl paths out of this episode. */}
        <div className="mt-12 space-y-12">
          <RecommendedTv show={show} />
          {show.genres?.[0] && <TrendingInGenreTv genre={show.genres[0]} excludeId={show.id} />}
        </div>
      </main>

      <DetailJsonLd nodes={buildEpisodePageJsonLd(seoInput)} />
    </div>
  );
}