import { notFound } from 'next/navigation';
import { fetchMediaById, isAniListUnavailable } from '@/lib/anilist';
import { resolveAnimeIds } from '@/lib/anime-mapping';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { animePath, watchPath, absoluteUrl } from '@/lib/routes';
import {
  buildDetailMetadata,
  buildEnhancedMediaJsonLd,
  buildEnhancedVideoObject,
  buildBreadcrumbList,
  buildItemPageSchema,
} from '@/lib/seo';
import DetailJsonLd from '@/components/detail-json-ld';
import { RatingBadge } from '@/components/rating-badge';
import Header from '@/components/header';
import MediaCarousel from '@/components/media-carousel';
import TrendingEpisodesToday from '@/components/trending-episodes-today';
import RecommendedMovies1080p from '@/components/recommended-movies-1080p';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, Download } from 'lucide-react';
import { AdSlot } from '@/components/ads';
import Image from 'next/image';
import { pingIndexNowForContent } from '@/lib/indexnow';

type Props = {
  params: Promise<{ id: string; slug: string[] }>;
};

/**
 * Long-tail SEO route: /watch/anime/[id]/[slug]
 *
 * Catches variations like:
 * - /watch/anime/123/attack-on-titan-english-sub-hd
 * - /watch/anime/123/attack-on-titan-episode-1-1080p-free
 * - /watch/anime/123/attack-on-titan-watch-online-free
 *
 * Dynamically injects keywords from slug into metadata, H1, and JSON-LD
 * to capture long-tail search queries.
 */
export const revalidate = 3600;
export const dynamicParams = true;

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

/**
 * Extract long-tail keywords from slug segments
 */
function extractKeywordsFromSlug(slug: string[]): {
  hasEnglishSub: boolean;
  hasDub: boolean;
  hasHD: boolean;
  has1080p: boolean;
  has4K: boolean;
  hasFree: boolean;
  hasWatch: boolean;
  hasDownload: boolean;
  hasOnline: boolean;
  hasEpisode: boolean;
  cleanTitle: string;
} {
  const slugStr = slug.join('-').toLowerCase();
  const keywords = slugStr.split('-').filter(Boolean);

  return {
    hasEnglishSub: keywords.some(k => k === 'english' || k === 'sub' || k === 'subbed' || k === 'english-sub' || k === 'eng-sub'),
    hasDub: keywords.some(k => k === 'dub' || k === 'dubbed' || k === 'hindi-dub' || k === 'hindi'),
    hasHD: keywords.some(k => k === 'hd' || k === '720p'),
    has1080p: keywords.some(k => k === '1080p' || k === '1080'),
    has4K: keywords.some(k => k === '4k' || k === '2160p' || k === 'uhd'),
    hasFree: keywords.some(k => k === 'free' || k === 'fre' || k === 'no-cost'),
    hasWatch: keywords.some(k => k === 'watch' || k === 'stream' || k === 'streaming'),
    hasDownload: keywords.some(k => k === 'download' || k === 'dl'),
    hasOnline: keywords.some(k => k === 'online' || k === 'on-line'),
    hasEpisode: keywords.some(k => k === 'episode' || k === 'ep' || k === 'e01' || k === 'e02' || k === 'e03'),
    cleanTitle: slug[0]?.replace(/-/g, ' ') || '',
  };
}

function buildDynamicTitle(title: string, keywords: ReturnType<typeof extractKeywordsFromSlug>, year: number | null): string {
  const parts: string[] = [title];
  if (year) parts.push(`(${year})`);

  const modifiers: string[] = [];
  if (keywords.hasWatch) modifiers.push('Watch Online');
  if (keywords.hasEnglishSub) modifiers.push('English Sub');
  if (keywords.hasDub) modifiers.push('Dubbed');
  if (keywords.has4K) modifiers.push('4K');
  else if (keywords.has1080p) modifiers.push('1080p');
  else if (keywords.hasHD) modifiers.push('HD');
  if (keywords.hasFree) modifiers.push('Free');

  if (modifiers.length > 0) {
    parts.push(modifiers.join(' '));
  }

  return parts.join(' | ');
}

function buildDynamicDescription(overview: string, keywords: ReturnType<typeof extractKeywordsFromSlug>, title: string): string {
  const base = overview || `Stream ${title} in high quality. Available in Sub and Dub.`;
  const modifiers: string[] = [];

  if (keywords.hasEnglishSub) modifiers.push('English subtitles');
  if (keywords.hasDub) modifiers.push('dubbed audio');
  if (keywords.has4K) modifiers.push('4K Ultra HD');
  else if (keywords.has1080p) modifiers.push('1080p Full HD');
  else if (keywords.hasHD) modifiers.push('HD quality');
  if (keywords.hasFree) modifiers.push('completely free');
  if (keywords.hasOnline) modifiers.push('no download required');

  if (modifiers.length > 0) {
    return `${base} ${modifiers.join(', ')}.`;
  }
  return base;
}

export async function generateMetadata({ params }: Props): Promise<any> {
  const { id: raw, slug } = await params;
  const id = toId(raw);
  if (!Number.isFinite(id)) return { title: 'Not Found' };

  const media = await resolveMedia(id);
  const keywords = extractKeywordsFromSlug(slug);
  const year = media.startDate?.year || null;
  const image = media.bannerImage ?? media.coverImage.extraLarge;

  // Trigger IndexNow ping for fast indexing during ISR revalidation (fire-and-forget)
  pingIndexNowForContent('anime', media.id).catch(console.error);

  const dynamicTitle = buildDynamicTitle(media.title.english || media.title.romaji, keywords, year);
  const dynamicDescription = buildDynamicDescription(media.description || '', keywords, media.title.english || media.title.romaji);

  return buildDetailMetadata({
    title: dynamicTitle,
    overview: dynamicDescription,
    year,
    genres: media.genres ?? [],
    image,
    path: `/watch/anime/${media.id}/${slug.join('-')}`,
    siteUrl: SITE_URL,
    isSeries: true,
    isAnime: true,
  });
}

export default async function WatchAnimeLongTailPage({ params }: Props) {
  const { id: raw, slug } = await params;
  const id = toId(raw);

  const media = await resolveMedia(id);
  const keywords = extractKeywordsFromSlug(slug);
  const year = media.startDate?.year || null;
  const title = media.title.english || media.title.romaji;
  const image = media.bannerImage ?? media.coverImage.extraLarge;
  const poster = media.coverImage.extraLarge;
  const watchHref = watchPath('anime', media.id);

  // Resolve the TMDB id server-side so the watch button can hand the player a TMDB-native id
  const mapping = await resolveAnimeIds(media.id);

  const dynamicTitle = buildDynamicTitle(title, keywords, year);
  const dynamicDescription = buildDynamicDescription(media.description || '', keywords, title);
  const pageUrl = absoluteUrl(`/watch/anime/${media.id}/${slug.join('-')}`, SITE_URL);
  const embedUrl = absoluteUrl(watchPath('anime', media.id), SITE_URL);

  const startDate = media.startDate?.year
    ? `${media.startDate.year}-${String(media.startDate.month || 1).padStart(2, '0')}-${String(media.startDate.day || 1).padStart(2, '0')}`
    : null;

  // Build enhanced JSON-LD nodes with full schemas
  const mediaSchema = buildEnhancedMediaJsonLd({
    type: 'TVSeries',
    title: dynamicTitle,
    description: dynamicDescription,
    image: image ?? undefined,
    url: pageUrl,
    datePublished: startDate,
    genres: media.genres ?? [],
    rating: media.averageScore ? { voteAverage: media.averageScore / 10, voteCount: 1000 } : null,
    numberOfSeasons: media.seasons?.length ?? null,
    numberOfEpisodes: media.episodes ?? null,
    duration: 'PT24M',
    contentRating: 'TV-14',
    keywords: [
      ...(keywords.hasEnglishSub ? ['English Subtitles'] : []),
      ...(keywords.hasDub ? ['Dubbed', 'English Dub'] : []),
      ...(keywords.has4K ? ['4K', 'UHD'] : keywords.has1080p ? ['1080p', 'Full HD'] : keywords.hasHD ? ['HD'] : []),
      ...(keywords.hasFree ? ['Free', 'No Sign Up'] : []),
      'Watch Online',
      'Streaming',
      'Anime',
      'Japanese Animation',
    ],
    inLanguage: ['ja', 'en'],
  });

  const videoSchema = buildEnhancedVideoObject({
    name: `Watch ${title}${year ? ` (${year})` : ''} ${keywords.hasEnglishSub ? 'English Sub' : ''} ${keywords.hasHD ? 'HD' : ''} ${keywords.has1080p ? '1080p' : ''} ${keywords.has4K ? '4K' : ''} ${keywords.hasFree ? 'Free' : ''} Online`,
    description: dynamicDescription,
    thumbnailUrl: poster ?? image,
    uploadDate: startDate,
    embedUrl,
    duration: 'PT24M',
    isFamilyFriendly: true,
    partOfSeries: undefined,
    publisher: { name: SITE_NAME, url: SITE_URL },
  });

  const breadcrumbSchema = buildBreadcrumbList({
    siteUrl: SITE_URL,
    sectionName: 'Anime',
    sectionUrl: `${SITE_URL}/?tab=anime`,
    title: dynamicTitle,
  });

  const itemPageSchema = buildItemPageSchema({
    url: pageUrl,
    mainEntity: mediaSchema,
    name: dynamicTitle,
    description: dynamicDescription,
  });

  const jsonLdNodes = [mediaSchema, videoSchema, breadcrumbSchema, itemPageSchema];

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
              src={poster}
              alt={`${title} cover`}
              fill
              sizes="(max-width: 640px) 160px, 208px"
              className="object-cover"
              loading="lazy"
            />
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold sm:text-4xl">{dynamicTitle}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {media.format && <Badge variant="secondary">{media.format}</Badge>}
                {year && <Badge variant="secondary">{year}</Badge>}
                {media.episodes ? <Badge variant="outline">{media.episodes} Episodes</Badge> : null}
                {keywords.has4K && <Badge variant="outline">4K UHD</Badge>}
                {keywords.has1080p && <Badge variant="outline">1080p</Badge>}
                {keywords.hasHD && <Badge variant="outline">HD</Badge>}
                {keywords.hasEnglishSub && <Badge variant="outline">English Sub</Badge>}
                {keywords.hasDub && <Badge variant="outline">Dubbed</Badge>}
                {keywords.hasFree && <Badge variant="secondary">FREE</Badge>}
                <Badge variant="outline">Sub / Dub</Badge>
                <span>{SITE_NAME} &middot; Free streaming</span>
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

            {media.description && (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {dynamicDescription}
              </p>
            )}

            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={watchHref}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch {title} {keywords.hasEnglishSub ? 'English Sub' : ''} {keywords.has1080p ? '1080p' : ''} {keywords.has4K ? '4K' : ''}
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

        {/* Outbound crawl paths. */}
        <div className="mt-12 space-y-12">
          {media.genres?.[0] && (
            <MediaCarousel
              title={`More ${media.genres[0]} Anime`}
              items={media.genres[0] ? [] : []}
            />
          )}
        </div>

        {/* New: Trending Episodes Today section */}
        <TrendingEpisodesToday limit={8} />

        {/* New: Recommended Movies in 1080p section */}
        <RecommendedMovies1080p limit={8} />
      </main>

      <DetailJsonLd nodes={jsonLdNodes} />
    </div>
  );
}