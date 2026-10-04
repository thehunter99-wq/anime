import { notFound } from 'next/navigation';
import { fetchMovieById, getTMDBImageUrl, isTMDBUnavailable } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { watchPath, absoluteUrl } from '@/lib/routes';
import {
  buildDetailMetadata,
  buildMediaJsonLd,
  buildVideoObject,
  buildBreadcrumbList,
} from '@/lib/seo';
import DetailJsonLd from '@/components/detail-json-ld';
import { RatingBadge } from '@/components/rating-badge';
import Header from '@/components/header';
import RecommendedMovies from '@/components/recommended-movies';
import TrendingInGenre from '@/components/trending-in-genre';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, Download } from 'lucide-react';
import DownloadButtons from '@/components/download-buttons';
import { getDownloadUrl } from '@/lib/embed';
import Image from 'next/image';

type Props = {
  params: Promise<{ id: string; slug: string[] }>;
};

/**
 * Long-tail SEO route: /download/[id]/[slug]
 *
 * Catches variations like:
 * - /download/550/fight-club-1080p-free
 * - /download/550/fight-club-hd-download
 * - /download/550/fight-club-4k-free-download
 *
 * Dynamically injects download-focused keywords into metadata, H1, and JSON-LD.
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
  hasDirect: boolean;
  hasFast: boolean;
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
    hasDirect: keywords.some(k => k === 'direct' || k === 'direct-link'),
    hasFast: keywords.some(k => k === 'fast' || k === 'high-speed' || k === 'speed'),
    cleanTitle: slug[0]?.replace(/-/g, ' ') || '',
  };
}

function buildDynamicTitle(title: string, keywords: ReturnType<typeof extractKeywordsFromSlug>, year: number | null): string {
  const parts: string[] = [title];
  if (year) parts.push(`(${year})`);

  const modifiers: string[] = ['Download'];
  if (keywords.has4K) modifiers.push('4K');
  else if (keywords.has1080p) modifiers.push('1080p');
  else if (keywords.hasHD) modifiers.push('HD');
  if (keywords.hasEnglishSub) modifiers.push('English Sub');
  if (keywords.hasDub) modifiers.push('Dubbed');
  if (keywords.hasFast) modifiers.push('Fast');
  if (keywords.hasDirect) modifiers.push('Direct');
  if (keywords.hasFree) modifiers.push('Free');

  parts.push(modifiers.join(' '));

  return parts.join(' | ');
}

function buildDynamicDescription(overview: string, keywords: ReturnType<typeof extractKeywordsFromSlug>, title: string): string {
  const base = overview || `Download ${title} in high quality. Direct download links available.`;
  const modifiers: string[] = [];

  if (keywords.has4K) modifiers.push('4K Ultra HD');
  else if (keywords.has1080p) modifiers.push('1080p Full HD');
  else if (keywords.hasHD) modifiers.push('HD quality');
  if (keywords.hasEnglishSub) modifiers.push('with English subtitles');
  if (keywords.hasDub) modifiers.push('dubbed audio');
  if (keywords.hasDirect) modifiers.push('direct download links');
  if (keywords.hasFast) modifiers.push('high-speed servers');
  if (keywords.hasFree) modifiers.push('completely free');

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
    path: `/download/${movie.id}/${slug.join('-')}`,
    siteUrl: SITE_URL,
  });
}

export default async function DownloadLongTailPage({ params }: Props) {
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

  const jsonLdNodes = [
    buildMediaJsonLd({
      type: 'Movie',
      title: dynamicTitle,
      description: dynamicDescription,
      image: image ?? undefined,
      url: absoluteUrl(`/download/${movie.id}/${slug.join('-')}`, SITE_URL),
      datePublished: movie.release_date || null,
      genres: movie.genres?.map((g) => g.name),
      rating: {
        voteAverage: movie.vote_average,
        voteCount: movie.vote_count ?? null,
      },
    }),
    buildVideoObject({
      name: `Download ${movie.title}${year ? ` (${year})` : ''} ${keywords.has4K ? '4K' : keywords.has1080p ? '1080p' : keywords.hasHD ? 'HD' : ''} ${keywords.hasEnglishSub ? 'English Sub' : ''} ${keywords.hasFree ? 'Free' : ''}`,
      description: dynamicDescription,
      thumbnailUrl: poster ?? image,
      uploadDate: movie.release_date || null,
      embedUrl: absoluteUrl(watchPath('movie', movie.id), SITE_URL),
    }),
    buildBreadcrumbList({
      siteUrl: SITE_URL,
      sectionName: 'Movies',
      sectionUrl: `${SITE_URL}/?tab=movies`,
      title: dynamicTitle,
    }),
  ];

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
                {keywords.hasFast && <Badge variant="secondary">Fast</Badge>}
                {keywords.hasDirect && <Badge variant="secondary">Direct</Badge>}
                {keywords.hasFree && <Badge variant="secondary">FREE</Badge>}
                <span>{SITE_NAME} &middot; Direct Download</span>
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
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-5 w-5" />
                  {keywords.hasFast ? 'Fast ' : ''}{keywords.hasDirect ? 'Direct ' : ''}Download {keywords.has4K ? '4K' : keywords.has1080p ? '1080p' : keywords.hasHD ? 'HD' : ''}
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <a href={watchHref}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch Online Instead
                </a>
              </Button>
            </div>

            <DownloadButtons
              directUrl={downloadUrl}
              isManga={false}
            />

          </div>
        </div>

        <RecommendedMovies movie={movie} />
        {movie.genres?.[0] && (
          <TrendingInGenre genre={movie.genres[0]} excludeId={movie.id} />
        )}
      </main>

      <DetailJsonLd nodes={jsonLdNodes} />
    </div>
  );
}
