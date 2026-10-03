import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';

import { fetchMediaById, isAniListUnavailable } from '@/lib/anilist';
import { type Media } from '@/lib/types';
import { SITE_URL } from '@/lib/site';
import { mangaPath, watchPath, absoluteUrl } from '@/lib/routes';
import {
  buildDetailMetadata,
  buildMediaJsonLd,
  buildBreadcrumbList,
} from '@/lib/seo';
import DetailJsonLd from '@/components/detail-json-ld';
import { RatingBadge } from '@/components/rating-badge';
import Header from '@/components/header';
import { SeasonEpisodeSelector } from '@/components/season-episode-selector';
import { Badge } from '@/components/ui/badge';
import RelatedMedia from '@/components/related-media';
import RecommendedMedia from '@/components/recommended-media';
import { AdBanner } from '@/components/ads';
import { pingIndexNowForContent } from '@/lib/indexnow';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Manga detail, canonical at `/manga/[id]`.
 *
 * ── Why this route was added ─────────────────────────────────────────────────
 * `mangaPath()` in `lib/routes.ts` already declared `/manga/[id]` as the canonical
 * manga URL, and six components link through it — `media-card`, `hero-carousel`,
 * `search-bar`, `related-media`, `viewer` and `animeOrMangaPath` itself. But no
 * such route existed: manga was only served by the legacy
 * `/media/[type]/[id-slug]` page. Every manga link in the UI therefore 404'd,
 * and the sitemap advertised dead URLs. This route closes that gap.
 *
 * `src/middleware.ts` now 308-redirects `/media/manga/*` here, matching how
 * movie, anime and tv were already consolidated, so there is exactly one
 * crawlable manga URL and no duplicate content.
 *
 * The markup below is carried over unchanged from the legacy page; only the
 * route, metadata and schema handling were upgraded.
 */
export const revalidate = 3600;

/** Additive generation: any id a card or the sitemap links resolves on demand. */
export const dynamicParams = true;

const toId = (raw: string): number => Number.parseInt(raw, 10);

const cleanDescription = (raw: string | null | undefined): string =>
  raw?.replace(/<br>/g, '\n').replace(/<\/?i>/g, '').trim() ||
  'No description available.';

/**
 * `fetchMediaById` returns `null` both for "no such manga" and for "AniList did
 * not answer". Only the first may become `notFound()`, because ISR caches that
 * response — an outage must never mark real pages as missing.
 */
async function resolveManga(id: number): Promise<Media> {
  if (!Number.isFinite(id)) notFound();

  const media = await fetchMediaById(id);
  if (media) return media;

  if (isAniListUnavailable()) {
    throw new Error(`AniList unavailable while resolving manga ${id}`);
  }
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: raw } = await params;
  const id = toId(raw);

  if (!Number.isFinite(id)) return { title: 'Not Found' };

  const media = await fetchMediaById(id);
  if (!media) return { title: 'Not Found' };

  const title = media.title.english || media.title.romaji;

  return buildDetailMetadata({
    title,
    overview: media.description,
    year: media.startDate?.year || null,
    genres: media.genres ?? [],
    // Poster first: manga has no meaningful 16:9 backdrop for a card, and the
    // portrait cover is what a reader recognises.
    image: media.coverImage.extraLarge,
    path: mangaPath(media.id),
    siteUrl: SITE_URL,
    isSeries: true,
    isAnime: true,
  });
}

export default async function MangaPage({ params }: Props) {
  const { id: raw } = await params;
  const id = toId(raw);

  const media = await resolveManga(id);

  // Trigger IndexNow ping for fast indexing (fire-and-forget)
  pingIndexNowForContent('manga', media.id).catch(console.error);

  const title = media.title.english || media.title.romaji;
  const description = cleanDescription(media.description);
  const isAnime = media.type === 'ANIME';

  // AniList supplies a score but no vote count, so this is display-only and is
  // intentionally absent from the JSON-LD. Same reasoning as the anime page.
  const anilistScore =
    media.averageScore != null && media.averageScore > 0
      ? media.averageScore / 10
      : null;

  const jsonLdNodes = [
    buildMediaJsonLd({
      type: 'TVSeries',
      title,
      description: media.description,
      image: media.coverImage.extraLarge,
      url: absoluteUrl(mangaPath(media.id), SITE_URL),
      datePublished: media.startDate?.year ? `${media.startDate.year}-01-01` : null,
      genres: media.genres ?? [],
      rating: null,
    }),
    buildBreadcrumbList({
      siteUrl: SITE_URL,
      sectionName: 'Manga',
      sectionUrl: `${SITE_URL}/manga`,
      title,
    }),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="relative h-[30vh] w-full sm:h-[40vh] md:h-[50vh]">
          {media.bannerImage && (
            <Image
              src={media.bannerImage}
              alt={`Backdrop for ${title}`}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />
        </div>

        <div className="container mx-auto max-w-5xl -mt-16 px-4 pb-8 sm:px-6 lg:-mt-24 lg:px-8">
          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end">
            <div className="w-full max-w-[150px] shrink-0 md:max-w-[200px]">
              {media.coverImage.extraLarge && (
                <Image
                  src={media.coverImage.extraLarge}
                  alt={`Poster for ${title}`}
                  fill
                  className="rounded-lg shadow-xl object-cover"
                  sizes="(max-width: 768px) 150px, 200px"
                  loading="lazy"
                />
              )}
            </div>
            <div className="flex flex-col gap-2 py-4">
              <h1 className="text-2xl font-bold text-foreground md:text-4xl">{title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <Badge>{media.type}</Badge>
                {media.startDate?.year && <Badge variant="outline">{media.startDate.year}</Badge>}
                {media.format && <Badge variant="outline">{media.format}</Badge>}
                {media.status && <Badge variant="outline">{media.status}</Badge>}
                {media.episodes && <Badge variant="outline">{media.episodes} Episodes</Badge>}
                {media.chapters && <Badge variant="outline">{media.chapters} Chapters</Badge>}
                <RatingBadge average={anilistScore} label="AniList" />
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-2xl font-bold">Synopsis</h2>
                <p className="whitespace-pre-line text-foreground/80">{description}</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">
                  {isAnime ? 'Watch Now' : 'Read Now'}
                </h2>
                <SeasonEpisodeSelector media={media} />
              </div>
            </div>

            <AdBanner />

            {media.relations && <RelatedMedia relations={media.relations} />}
            <RecommendedMedia media={media} />
          </div>
        </div>
      </main>

      <DetailJsonLd nodes={jsonLdNodes} />
    </div>
  );
}