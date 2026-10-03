import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Download, PlayCircle } from 'lucide-react';

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
import DownloadButtons from '@/components/download-buttons';

type Props = {
  params: Promise<{
    id: string;
    episode: string;
    slug: string;
  }>;
};

/**
 * Episode landing page for the anime download intent:
 *   /download/anime/[id]/episode-[episode]/[slug]
 *
 * The anime counterpart of `/download/tv/[id]/season-[n]/episode-[n]/[slug]`, and
 * the route that was missing: the sitemap and every internal link already pointed
 * here, but no page existed, so `/download/anime/[id]/episode-[n]/<slug>` 404ed
 * for every anime episode. A sitemap entry for a 404 is not a harmless mistake —
 * the crawler spends budget on it and logs the error against the whole property.
 *
 * See the watch-side route for why the episode title, season number and air date
 * are all "unknown" here: AniList reports an episode *count* and nothing per
 * episode, so nothing is invented to fill the gap.
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
    throw new Error(
      `AniList unavailable resolving /download/anime/${id} episode ${episodeNumber}`
    );
  }

  if (!media) notFound();
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
    intent: 'download',
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
  const episodeNumber = numberFromSegment(rawEpisode, 1);

  const media = await resolveAnimeEpisode(toId(rawId), episodeNumber);

  return buildEpisodePageMetadata(toSeoInput(media, episodeNumber));
}

export default async function DownloadAnimeEpisodePage({ params }: Props) {
  const { id: rawId, episode: rawEpisode } = await params;
  const episodeNumber = numberFromSegment(rawEpisode, 1);

  const media = await resolveAnimeEpisode(toId(rawId), episodeNumber);
  const seoInput = toSeoInput(media, episodeNumber);

  const title = media.title.english || media.title.romaji;
  const heading = episodeHeading(seoInput);
  const banner = media.bannerImage ?? media.coverImage.extraLarge;

  const mapping = await resolveAnimeIds(media.id);

  /**
   * The mirrors address episodes by a TMDB id, so the download target depends on
   * the AniZip/TMDB mapping rather than the AniList id in the URL. Without a
   * mapping there is nothing to hand off to, so the buttons are omitted rather
   * than pointed at a guessed id.
   */
  const downloadHref = mapping?.tmdbId
    ? `https://vidsrc.pm/embed/tv/${mapping.tmdbId}/1/${episodeNumber}`
    : null;

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
                <span>{SITE_NAME} &middot; Direct Download</span>
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto" disabled={!downloadHref}>
                <a href={downloadHref ?? playerPathFor(seoInput)}>
                  <Download className="mr-2 h-5 w-5" />
                  Download 1080p
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <a href={playerPathFor(seoInput)}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch Online Instead
                </a>
              </Button>
            </div>

            <DownloadButtons
              directUrl={downloadHref}
              episodeLabel={`Episode ${episodeNumber}`}
            />

            {!mapping?.tmdbId && (
              <p className="text-xs text-muted-foreground">
                This title is not yet available in the download catalogue.
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