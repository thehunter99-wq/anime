import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';

import { fetchFromAniList, fetchMediaById, isAniListUnavailable } from '@/lib/anilist';
import { resolveAnimeIds } from '@/lib/anime-mapping';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { animePath, watchPath, absoluteUrl } from '@/lib/routes';
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
import MediaCarousel from '@/components/media-carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { pingIndexNowForContent } from '@/lib/indexnow';
import { getEnhancedTrendingByGenre } from '@/components/anime-seo-anchors';

type Props = {
  params: Promise<{ id: string }>;
};

export const revalidate = 3600;

/** Additive generation: any id a rail or the sitemap links resolves on demand. */
export const dynamicParams = true;

/**
 * `fetchMediaById` returns `null` both for "no such anime" and for "AniList did
 * not answer". Only the first may become `notFound()`, because ISR caches that
 * response â€” an outage must never mark real pages as missing. Throwing produces
 * a 5xx, which Next does not cache, so the next request retries.
 */
async function resolveMedia(id: number) {
  if (!Number.isFinite(id)) notFound();

  const media = await fetchMediaById(id);
  if (media) return media;

  if (isAniListUnavailable()) {
    throw new Error(`AniList unavailable while resolving media ${id}`);
  }
  notFound();
}

const toId = (raw: string): number => Number.parseInt(raw, 10);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: raw } = await params;
  const id = toId(raw);
  if (!Number.isFinite(id)) return { title: 'Not Found' };

  const media = await resolveMedia(id);

  // Trigger IndexNow ping for fast indexing during ISR revalidation (fire-and-forget)
  pingIndexNowForContent('anime', media.id).catch(console.error);

  const title = media.title.english || media.title.romaji;
  // Banner first: it is 16:9 and fills the hero. The portrait cover is the
  // fallback so a title without a banner still gets a valid card.
  const image = media.bannerImage ?? media.coverImage.extraLarge;
  const genres = media.genres ?? [];

  return buildDetailMetadata({
    title,
    overview: media.description,
    year: media.startDate?.year || null,
    genres,
    image,
    path: animePath(media.id),
    siteUrl: SITE_URL,
    isSeries: true,
    isAnime: true,
  });
}

export default async function AnimePage({ params }: Props) {
  const { id: raw } = await params;
  const id = toId(raw);

  const media = await resolveMedia(id);

  // Trigger IndexNow ping for fast indexing (fire-and-forget)
  pingIndexNowForContent('anime', media.id).catch(console.error);

  const title = media.title.english || media.title.romaji;
  const image = media.bannerImage ?? media.coverImage.extraLarge;
  const genres = media.genres ?? [];

  /**
   * Cross-link rails, resolved during the server render so the anchors are
   * present in the HTML for the crawler. AniList has no "recommendations"
   * endpoint, so the genre list serves that role.
   *
   * This page previously had no outbound links whatsoever, which made every
   * anime detail URL a crawl dead end â€” the biggest internal-linking gap on the
   * site, since anime is the main source of long-tail traffic.
   *
   * Each source independently tolerates failure, so one outage cannot empty the
   * whole section, and self is filtered out so a page never links to itself.
   */
  const [sameGenreAnime, trendingAnime] = await Promise.all([
    media.genres?.[0]
      ? getEnhancedTrendingByGenre(media.genres[0], 'ANIME', media.id, 20)
      : Promise.resolve([]),
    fetchFromAniList({
      type: 'ANIME',
      sort: ['TRENDING_DESC'],
      perPage: 20,
    }).catch(() => []),
  ]);

  const withoutSelf = <T extends { id: number }>(list: T[]): T[] =>
    list.filter((item) => item.id !== media.id);

  // Resolve the TMDB id server-side so the watch button can hand the player a
  // TMDB-native id instead of an AniList id, which no embed mirror accepts.
  const mapping = await resolveAnimeIds(media.id);

  const startDate = media.startDate?.year
    ? `${media.startDate.year}-${String(media.startDate.month || 1).padStart(2, '0')}-${String(media.startDate.day || 1).padStart(2, '0')}`
    : null;

  // AniList returns `averageScore` (0-100) but no vote count. The score is
  // displayed so visitors see it, but `aggregateRating` is deliberately NOT
  // emitted: Google requires `ratingCount` to substantiate an aggregate rating,
  // and inventing or omitting it would make the markup incomplete and put the
  // site at risk of a rich-result penalty for the whole page.
  const anilistScore =
    media.averageScore != null && media.averageScore > 0
      ? media.averageScore / 10
      : null;

  const jsonLdNodes = [
    buildMediaJsonLd({
      type: 'TVSeries',
      title,
      description: media.description,
      image: image ?? undefined,
      url: absoluteUrl(animePath(media.id), SITE_URL),
      datePublished: startDate,
      genres,
      rating: null,
    }),
    buildVideoObject({
      name: `Watch ${title} English Sub & Dub online free`,
      description: media.description,
      thumbnailUrl: media.coverImage.extraLarge,
      uploadDate: startDate,
      embedUrl: absoluteUrl(watchPath('anime', media.id), SITE_URL),
    }),
    buildBreadcrumbList({
      siteUrl: SITE_URL,
      sectionName: 'Anime',
      sectionUrl: `${SITE_URL}/?tab=anime`,
      title,
    }),
    buildFAQSchema({
      title,
      year: media.startDate?.year || null,
      isSeries: true,
      isAnime: true,
    }),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

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
              <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {media.format && <Badge variant="secondary">{media.format}</Badge>}
                {media.startDate?.year && <Badge variant="secondary">{media.startDate.year}</Badge>}
                {media.episodes ? <Badge variant="outline">{media.episodes} Episodes</Badge> : null}
                <Badge variant="outline">Sub / Dub</Badge>
                <span>
                  {SITE_NAME} &middot; Free streaming
                </span>
                {/* AniList publishes a score but no vote count, so this is
                    display-only and is deliberately absent from the JSON-LD. */}
                <RatingBadge average={anilistScore} label="AniList" />
              </div>
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.slice(0, 4).map((genre) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {media.description && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {media.description}
              </p>
            )}

            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={watchPath('anime', media.id)}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch {title} Episode 1
              </a>
            </Button>

            {!mapping?.tmdbId && (
              <p className="text-xs text-muted-foreground">
                This title is not yet available in the streaming catalogue.
              </p>
            )}

          </div>
        </div>

        {/* Outbound crawl paths. Without these the page was a dead end. */}
        <div className="mt-12 space-y-12">
          {sameGenreAnime.length > 0 && (
            <MediaCarousel
              title={`More ${media.genres?.[0]} Anime`}
              items={withoutSelf(sameGenreAnime)}
            />
          )}
          {trendingAnime.length > 0 && (
            <MediaCarousel
              title="Trending Anime"
              items={withoutSelf(trendingAnime.map((item, index) => ({
                ...item,
                seoAnchors: [`Watch ${item.title.english || item.title.romaji} Online Free`],
              })))}
            />
          )}
        </div>
      </main>

      <DetailJsonLd nodes={jsonLdNodes} />
    </div>
  );
}
