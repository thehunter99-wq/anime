import { notFound } from 'next/navigation';
import { fetchMovieById, getTMDBImageUrl, isTMDBUnavailable } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { watchPath, absoluteUrl } from '@/lib/routes';
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
import RecommendedMovies from '@/components/recommended-movies-enhanced';
import TrendingInGenre from '@/components/trending-in-genre';
import TrendingEpisodesToday from '@/components/trending-episodes-today';
import RecommendedMovies1080p from '@/components/recommended-movies-1080p';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, Download } from 'lucide-react';
import { AdSlot } from '@/components/ads';
import DownloadButtons from '@/components/download-buttons';
import { getDownloadUrl } from '@/lib/embed';
import Image from 'next/image';

type Props = {
  params: Promise<{ id: string; slug: string[] }>;
};

/**
 * Long-tail SEO route: /watch/[id]/[slug]
 *
 * Catches variations like:
 * - /watch/550/fight-club-english-sub-hd
 * - /watch/550/fight-club-1080p-free-online
 * - /watch/550/fight-club-watch-online-free
 *
 * Dynamically injects keywords from slug into metadata, H1, and JSON-LD
 * to capture long-tail search queries.
 */
export const revalidate = 3600;
export const dynamicParams = true;

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

/**
 * Extract long-tail keywords from slug segments
 * e.g., ["fight-club", "english-sub", "hd", "1080p", "free"] -> keywords
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
    cleanTitle: slug[0]?.replace(/-/g, ' ') || '',
  };
}

/**
 * Build dynamic title with long-tail keywords
 */
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

/**
 * Build dynamic description with long-tail keywords
 */
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

  const movie = await resolveMovie(id);
  const keywords = extractKeywordsFromSlug(slug);
  const year = yearOf(movie.release_date);
  const image = getTMDBImageUrl(movie.backdrop_path ?? movie.poster_path, 'original');

  const dynamicTitle = buildDynamicTitle(movie.title, keywords, year);
  const dynamicDescription = buildDynamicDescription(movie.overview || '', keywords, movie.title);

  return buildDetailMetadata({
    title: dynamicTitle,
    overview: dynamicDescription,
    year,
    genres: movie.genres?.map((g) => g.name),
    image,
    path: `/watch/${movie.id}/${slug.join('-')}`,
    siteUrl: SITE_URL,
  });
}

export default async function WatchLongTailPage({ params }: Props) {
  const { id: raw, slug } = await params;
  const id = toId(raw);

  const movie = await resolveMovie(id);
  const keywords = extractKeywordsFromSlug(slug);
  const year = yearOf(movie.release_date);
  const image = getTMDBImageUrl(movie.backdrop_path ?? movie.poster_path, 'original');
  const poster = getTMDBImageUrl(movie.poster_path, 'w500');
  const watchHref = watchPath('movie', movie.id);
  const downloadUrl = getDownloadUrl('movie', movie.id, 1, 1) ?? watchHref;

  const dynamicTitle = buildDynamicTitle(movie.title, keywords, year);
  const dynamicDescription = buildDynamicDescription(movie.overview || '', keywords, movie.title);
  const pageUrl = absoluteUrl(`/watch/${movie.id}/${slug.join('-')}`, SITE_URL);
  const embedUrl = absoluteUrl(watchPath('movie', movie.id), SITE_URL);

  // Build enhanced JSON-LD nodes with full schemas
  const mediaSchema = buildEnhancedMediaJsonLd({
    type: 'Movie',
    title: movie.title,
    description: dynamicDescription,
    image: image ?? undefined,
    url: pageUrl,
    datePublished: movie.release_date || null,
    genres: movie.genres?.map((g) => g.name),
    rating: {
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count ?? null,
    },
    duration: null,
    contentRating: 'PG-13',
    keywords: [
      ...(keywords.hasEnglishSub ? ['English Subtitles'] : []),
      ...(keywords.hasDub ? ['Dubbed', 'English Dub'] : []),
      ...(keywords.has4K ? ['4K', 'UHD'] : keywords.has1080p ? ['1080p', 'Full HD'] : keywords.hasHD ? ['HD'] : []),
      ...(keywords.hasFree ? ['Free', 'No Sign Up'] : []),
      'Watch Online',
      'Streaming',
    ],
  });

  const videoSchema = buildEnhancedVideoObject({
    name: `Watch ${movie.title}${year ? ` (${year})` : ''} ${keywords.hasEnglishSub ? 'English Sub' : ''} ${keywords.hasHD ? 'HD' : ''} ${keywords.has1080p ? '1080p' : ''} ${keywords.has4K ? '4K' : ''} ${keywords.hasFree ? 'Free' : ''} Online`,
    description: dynamicDescription,
    thumbnailUrl: poster ?? image,
    uploadDate: movie.release_date || null,
    embedUrl,
    duration: null,
    isFamilyFriendly: true,
    partOfSeries: undefined,
    publisher: { name: SITE_NAME, url: SITE_URL },
  });

  const breadcrumbSchema = buildBreadcrumbList({
    siteUrl: SITE_URL,
    sectionName: 'Movies',
    sectionUrl: `${SITE_URL}/?tab=movies`,
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
            alt={`Backdrop for ${movie.title}`}
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
                alt={`${movie.title} poster`}
                fill
                sizes="(max-width: 640px) 160px, 208px"
                className="object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold sm:text-4xl">{dynamicTitle}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {year && <Badge variant="secondary">{year}</Badge>}
                {keywords.has4K && <Badge variant="outline">4K UHD</Badge>}
                {keywords.has1080p && <Badge variant="outline">1080p</Badge>}
                {keywords.hasHD && <Badge variant="outline">HD</Badge>}
                {keywords.hasEnglishSub && <Badge variant="outline">English Sub</Badge>}
                {keywords.hasDub && <Badge variant="outline">Dubbed</Badge>}
                {keywords.hasFree && <Badge variant="secondary">FREE</Badge>}
                <span>{SITE_NAME} &middot; Free streaming</span>
                <RatingBadge average={movie.vote_average} votes={movie.vote_count} label="TMDB" />
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

            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {dynamicDescription}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href={watchHref}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch {movie.title} {keywords.hasEnglishSub ? 'English Sub' : ''} {keywords.has1080p ? '1080p' : ''} {keywords.has4K ? '4K' : ''}
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <a href={downloadUrl}>
                  <Download className="mr-2 h-5 w-5" />
                  Download {keywords.has1080p ? '1080p' : keywords.hasHD ? 'HD' : ''}
                </a>
              </Button>
            </div>

            <AdSlot className="mt-2" />
          </div>
        </div>

        {/* Enhanced crawl paths with keyword-rich anchor texts */}
        <RecommendedMovies movie={movie} />
        {movie.genres?.[0] && (
          <TrendingInGenre genre={movie.genres[0]} excludeId={movie.id} />
        )}

        {/* New: Trending Episodes Today section */}
        <TrendingEpisodesToday limit={8} />

        {/* New: Recommended Movies in 1080p section */}
        <RecommendedMovies1080p limit={8} />
      </main>

      <DetailJsonLd nodes={jsonLdNodes} />
    </div>
  );
}