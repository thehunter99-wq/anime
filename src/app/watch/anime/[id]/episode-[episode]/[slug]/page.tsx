import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';

import { fetchMediaById, isAniListUnavailable } from '@/lib/anilist';
import { resolveAnimeIds } from '@/lib/anime-mapping';
import type { Media } from '@/lib/types';
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
import MediaCarousel from '@/components/media-carousel';
import { getEnhancedTrendingByGenre } from '@/components/anime-seo-anchors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/ads';

type Props = {
  params: Promise<{
    id: string;
    episode: string;
    slug: string;
  }>;
};

/**
 * Episode landing page for an anime:
 *   /watch/anime/[id]/episode-[episode]/[slug]
 *
 * ── What AniList does and does not give us ──────────────────────────────────
 * AniList exposes an *episode count*, never per-episode titles, air dates or
 * synopses. So an anime episode page cannot carry "S01E01 <episode name>" the way
 * a TMDB-backed one does — the earlier version passed the literal string
 * "Episode 1" in as the episode title and rendered "S01E01 Episode 1", repeating
 * itself while pushing the series name out of a truncated SERP title.
 *
 * So the label is `Episode N`, the title carries no fake episode name, and the
 * structured data omits `seasonNumber` and `datePublished` rather than
 * fabricating them. AniList's series start date is still used as the page's
 * `datePublished`/`uploadDate`, which is the standard approximation for a
 * catalogue page with no real publish timestamp.
 */
export const revalidate = 3600;
export const dynamicParams = true;

const toId = (raw: string): number => Number.parseInt(raw, 10);

const numberFromSegment = (segment: string, fallback: number): number => {
  const match = /(\d+)/.exec(segment ?? '');
  return match ? Number.parseInt(match[1], 10) : fallback;
};

async function resolveAnimeEpisode(id: number, episodeNumber: number): Promise<Media> {
  if (!Number.isFinite(id) || id < 1) notFound();
  if (!Number.isFinite(episodeNumber) || episodeNumber < 1) notFound();

  const media = await fetchMediaById(id);

  if (isAniListUnavailable()) {
    throw new Error(`AniList unavailable resolving /watch/anime/${id} episode ${episodeNumber}`);
  }

  if (!media) notFound();

  /**
   * A request past the end of the series would otherwise render a page
   * advertising an episode that does not exist — a thin page whose only content
   * is "stream this now" pointing at an empty playlist. When AniList reports a
   * count and we are past it, that is a real 404.
   */
  if (media.episodes != null && episodeNumber > media.episodes) notFound();

  return media;
}

function toSeoInput(media: Media, episodeNumber: number): EpisodePageSeoInput {
  const title = media.title.english || media.title.romaji;
  const startDate = media.startDate
    ? `${media.startDate.year}-${String(media.startDate.month ?? 1).padStart(2, '0')}-${String(
        media.startDate.day ?? 1
      ).padStart(2, '0')}`
    : null;

  return {
    showType: 'anime',
    intent: 'watch',
    id: media.id,
    seriesTitle: title,
    seriesOverview: media.description,
    seasonNumber: 1,
    episodeNumber,
    episodeName: '',
    episodeOverview: null,
    airDate: startDate,
    image: media.bannerImage ?? media.coverImage.extraLarge,
    voteAverage: media.averageScore != null && media.averageScore > 0 ? media.averageScore / 10 : null,
  };
}

export async function generateMetadata({ params }: Props) {
  const { id: rawId, episode: rawEpisode } = await params;

  const media = await resolveAnimeEpisode(
    toId(rawId),
    numberFromSegment(rawEpisode, 1)
  );

  return buildEpisodePageMetadata(toSeoInput(media, numberFromSegment(rawEpisode, 1)));
}

export default async function WatchAnimeEpisodePage({ params }: Props) {
  const { id: rawId, episode: rawEpisode } = await params;
  const episodeNumber = numberFromSegment(rawEpisode, 1);

  const media = await resolveAnimeEpisode(toId(rawId), episodeNumber);
  const seoInput = toSeoInput(media, episodeNumber);

  const title = media.title.english || media.title.romaji;
  const heading = episodeHeading(seoInput);
  const banner = media.bannerImage ?? media.coverImage.extraLarge;

  /**
   * The mirrors need a TMDB id, and AniList ids are not accepted by any of them.
   * `resolveAnimeIds` bridges via AniZip and falls back to a title search, and
   * returns null when the title genuinely is not in TMDB — in which case we say
   * so rather than embedding a guessed id, because a wrong id renders the
   * provider's "Video Not Found" inside the player.
   */
  const mapping = await resolveAnimeIds(media.id);

  const anilistScore =
    media.averageScore != null && media.averageScore > 0 ? media.averageScore / 10 : null;

  const sameGenre = media.genres?.[0]
    ? await getEnhancedTrendingByGenre(media.genres[0], 'ANIME', media.id, 20).catch(() => [])
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="relative h-[45vh] w-full overflow-hidden sm:h-[55vh]">
        {banner && (
          <Image
            src={banner}
            alt={`Artwork for ${heading}`}
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
          <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg shadow-2xl sm:w-52">
            <Image
              src={media.coverImage.extraLarge}
              alt={`${title} cover`}
              fill
              sizes="(max-width: 640px) 160px, 208px"
              className="object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {media.format && <Badge variant="secondary">{media.format}</Badge>}
                {media.startDate?.year && <Badge variant="secondary">{media.startDate.year}</Badge>}
                <Badge variant="secondary">Episode {episodeNumber}</Badge>
                <Badge variant="outline">1080p</Badge>
                <Badge variant="outline">English Sub</Badge>
                <Badge variant="secondary">FREE</Badge>
                <span>{SITE_NAME} &middot; Free streaming</span>
                <RatingBadge average={anilistScore} label="AniList" />
              </div>
            </div>

            {media.genres && media.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {media.genres.slice(0, 4).map((genre) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={playerPathFor(seoInput)}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch {title} Episode {episodeNumber}
              </a>
            </Button>

            {!mapping?.tmdbId && (
              <p className="text-xs text-muted-foreground">
                This title is not yet available in the streaming catalogue.
              </p>
            )}

            <AdSlot className="mt-2" />
          </div>
        </div>

        <div className="mt-12 space-y-12">
          {sameGenre.length > 0 && (
            <MediaCarousel
              title={`More ${media.genres![0]} Anime`}
              items={sameGenre.map(({ seoAnchors: _seoAnchors, ...media }) => media)}
            />
          )}
        </div>
      </main>

      <DetailJsonLd nodes={buildEpisodePageJsonLd(seoInput)} />
    </div>
  );
}