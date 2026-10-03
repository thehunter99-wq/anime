import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Download, PlayCircle } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/ads';
import DownloadButtons from '@/components/download-buttons';
import { getDownloadUrl } from '@/lib/embed';

type Props = {
  params: Promise<{
    id: string;
    season: string;
    episode: string;
    slug: string;
  }>;
};

/**
 * Episode landing page for the download intent:
 *   /download/tv/[id]/season-[season]/episode-[episode]/[slug]
 *
 * A separate route from `/watch/...` on purpose. "Download <series> S01E02" is a
 * distinct query with a distinct result, so it gets its own title, description and
 * URL. Merging them would leave one of the two intents without a page that matches
 * it.
 *
 * Nothing is served from here. The buttons hand off to the same third-party
 * mirrors the player uses — the site hosts no media, and the buttons say
 * "Direct Stream" / "Mobile Stream" rather than promising a file.
 *
 * The canonical slug is enforced in `middleware.ts`, which can answer with a real
 * 301/404; a redirect from the page component here would arrive as a 200 with a
 * client-side navigation, because the layout shell has already streamed by then.
 */
export const revalidate = 3600;
export const dynamicParams = true;

const toId = (raw: string): number => Number.parseInt(raw, 10);
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

async function resolveEpisodeRoute(
  id: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<Resolved> {
  if (!Number.isFinite(id) || id < 1) notFound();
  if (!Number.isFinite(seasonNumber) || seasonNumber < 1) notFound();
  if (!Number.isFinite(episodeNumber) || episodeNumber < 1) notFound();

  const [show, season, episode] = await Promise.all([
    fetchTVShowById(id),
    fetchSeasonById(id, seasonNumber),
    fetchEpisodeById(id, seasonNumber, episodeNumber),
  ]);

  if (isTMDBUnavailable()) {
    throw new Error(
      `TMDB unavailable resolving /download/tv/${id} S${seasonNumber}E${episodeNumber}`
    );
  }

  if (!show || !season || !episode) notFound();

  return { show, season, episode, seasonNumber, episodeNumber };
}

function toSeoInput({ show, episode, season, seasonNumber, episodeNumber }: Resolved): EpisodePageSeoInput {
  const still = episode.still_path ?? show.backdrop_path ?? show.poster_path;

  return {
    showType: 'tv',
    intent: 'download',
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

export default async function DownloadTvEpisodePage({ params }: Props) {
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

  /**
   * The mirrors serve the episode by (id, season, episode); there is no
   * download-specific endpoint, so this is the same URL the player uses. If the
   * mirror cannot be built we fall back to the player rather than rendering a
   * button that goes nowhere.
   */
  const downloadUrl =
    getDownloadUrl('tv', show.id, episodeNumber, seasonNumber) ?? playerHref;

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
                <span>{SITE_NAME} &middot; Direct Download</span>
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-5 w-5" />
                  Download 1080p
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <a href={playerHref}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch Online Instead
                </a>
              </Button>
            </div>

            <DownloadButtons directUrl={downloadUrl} episodeLabel={`S${seasonNumber}E${episodeNumber}`} />

            <AdSlot className="mt-2" />
          </div>
        </div>
      </main>

      <DetailJsonLd nodes={buildEpisodePageJsonLd(seoInput)} />
    </div>
  );
}