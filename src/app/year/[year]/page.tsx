import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { fetchAnimeByYear } from '@/lib/anilist';
import { fetchMoviesByYear, fetchTvByYear } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { absoluteUrl } from '@/lib/routes';
import { isValidYear, latestCatalogYear, yearPath } from '@/lib/years';
import Header from '@/components/header';
import MovieGrid from '@/components/movie-grid';
import TvGrid from '@/components/tv-grid';
import MediaGrid from '@/components/media-grid';
import Pagination from '@/components/pagination';
import GenreNav from '@/components/genre-nav';
import DetailJsonLd from '@/components/detail-json-ld';
import { AdBanner } from '@/components/ads';

type Props = {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PER_PAGE = 20;
const MAX_PAGES = 500;

/**
 * Release-year landing page: `/year/[year]`.
 *
 * ── Why it exists ────────────────────────────────────────────────────────────
 * "best movies of 2015", "new anime 2024", "2020 web series" is a large,
 * distinctly-intent slice of catalogue search traffic, and it is not covered by
 * any existing page: `/trending` is a rolling list of *this week's* charts, not a
 * frozen year. One page per year gives that query a stable address.
 *
 * ── Year validation ──────────────────────────────────────────────────────────
 * Anything outside the supported range is a hard 404, never a redirect to the
 * nearest valid year. A redirect would assert that `/year/1843` and `/year/1950`
 * are the same page, and the destination would be a guess the visitor did not ask
 * for.
 */
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  // A representative window rather than every year: the full range is reachable
  // on demand and listed in the sitemap, and pre-rendering 70+ pages that each
  // cost three upstream rails would slow the build for URLs that will be crawled
  // anyway.
  const thisYear = new Date().getUTCFullYear();
  return Array.from({ length: 10 }, (_, offset) => ({
    year: String(thisYear - offset),
  }));
}

const pageFrom = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, MAX_PAGES) : 1;
};

const yearFrom = (raw: string): number => Number.parseInt(raw, 10);

function metaFor(year: number, page: number): Metadata {
  const path = yearPath(year);
  const canonical = absoluteUrl(page > 1 ? `${path}?page=${page}` : path, SITE_URL);
  const pageSuffix = page > 1 ? ` — Page ${page}` : '';

  return {
    title: `Best Movies, TV Series & Anime of ${year} to Watch Free${pageSuffix} - ${SITE_NAME}`,
    description:
      page > 1
        ? `Page ${page} of the best movies, web series and anime released in ${year}. Watch free online in HD 1080p on ${SITE_NAME}.`
        : `Discover the best movies, web series and anime of ${year}. Watch and download free in HD 1080p with English subtitles and dub on ${SITE_NAME}.`,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: `Best of ${year} — Movies, Series & Anime${pageSuffix}`,
      description: `The most popular movies, TV series and anime released in ${year}.`,
      url: canonical,
    },
  };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ year: rawYear }, { page }] = await Promise.all([params, searchParams]);
  if (!isValidYear(rawYear)) return { title: 'Not Found' };
  return metaFor(yearFrom(rawYear), pageFrom(page));
}

export default async function YearPage({ params, searchParams }: Props) {
  const [{ year: rawYear }, { page }] = await Promise.all([params, searchParams]);

  if (!isValidYear(rawYear)) notFound();

  const year = yearFrom(rawYear);
  const currentPage = pageFrom(page);

  /**
   * Each rail fails soft and independently. TMDB and AniList have no shared
   * failure mode, so one being down normally leaves two working sections — far
   * better than an empty page, which would be indistinguishable from "no such
   * year" to both a visitor and a crawler.
   */
  const [movies, tv, anime] = await Promise.all([
    fetchMoviesByYear(year, currentPage).catch(() => []),
    fetchTvByYear(year, currentPage).catch(() => []),
    fetchAnimeByYear(year, currentPage, PER_PAGE).catch(() => []),
  ]);

  const hasNext = movies.length === PER_PAGE || tv.length === PER_PAGE || anime.length === PER_PAGE;
  const root = SITE_URL.replace(/\/$/, '');

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Best of ${year}`,
      url: absoluteUrl(yearPath(year), SITE_URL),
      description: `The most popular movies, TV series and anime released in ${year}.`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${root}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${root}/` },
        { '@type': 'ListItem', position: 2, name: `Movies of ${year}`, item: `${root}/year/${year}` },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto space-y-10 px-4 py-8 sm:px-6 lg:px-8">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Best Movies, TV Series &amp; Anime of {year}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Everything that landed in {year}, ordered by how much of it people are actually
              watching. Watch free in HD 1080p with English subtitles and dubbed audio, or grab a
              download. {year === latestCatalogYear() && 'This list fills up as titles are added.'}
            </p>
          </header>

          <GenreNav />

          {movies.length === 0 && tv.length === 0 && anime.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Nothing to show for {year}</h2>
              <p className="text-muted-foreground">
                The catalogue for {year} could not be loaded. Check the{' '}
                <a href="/diagnostics" className="underline">
                  system status
                </a>{' '}
                page.
              </p>
            </div>
          ) : (
            <>
              {movies.length > 0 && <MovieGrid title={`Movies from ${year}`} items={movies} />}
              <AdBanner />
              {anime.length > 0 && <MediaGrid title={`Anime from ${year}`} items={anime} />}
              {tv.length > 0 && <TvGrid title={`TV Series from ${year}`} items={tv} />}
            </>
          )}

          <Pagination path={yearPath(year)} page={currentPage} hasNext={hasNext} />
        </div>
      </main>

      <DetailJsonLd nodes={jsonLd} />
    </div>
  );
}