import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { fetchFromAniList } from '@/lib/anilist';
import { fetchMoviesByGenre, fetchTvByGenre } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { absoluteUrl } from '@/lib/routes';
import { GENRES, findGenre, genrePath, type GenreEntry } from '@/lib/genres';
import Header from '@/components/header';
import MovieGrid from '@/components/movie-grid';
import TvGrid from '@/components/tv-grid';
import MediaGrid from '@/components/media-grid';
import Pagination from '@/components/pagination';
import GenreNav from '@/components/genre-nav';
import DetailJsonLd from '@/components/detail-json-ld';
import { AdBanner } from '@/components/ads';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

/** Results per rail per page. TMDB defaults to 20; AniList is asked for the same. */
const PER_PAGE = 20;

/** How far back a crawler is followed. See the note on `dynamicParams` below. */
const MAX_PAGES = 500;

/**
 * Genre landing page: `/genre/[slug]`.
 *
 * ── Why it exists ────────────────────────────────────────────────────────────
 * "action movies", "best romance anime", "comedy web series" are the highest-volume
 * searches a catalogue site gets, and the category hubs (`/movies`, `/anime`) do
 * not target them — every title on those pages competes for the same head term.
 * One page per genre gives each query its own address, its own title and its own
 * set of ranked titles.
 *
 * ── Caching ──────────────────────────────────────────────────────────────────
 * An hour, matching the popularity rails behind it. These lists move with
 * popularity, so a slower refresh would be stale in the one dimension visitors
 * notice.
 */
export const revalidate = 3600;

/**
 * Genre pages are rendered on demand rather than enumerated.
 *
 * There are only ~29 slugs and they never change, so `generateStaticParams` would
 * be cheap — but every one of them renders three upstream rails, and pre-rendering
 * all of them at build time makes the build pay for the whole catalogue up front
 * for no gain, since they are all in the sitemap anyway and will be crawled.
 */
export const dynamicParams = true;

/** Every genre slug is pre-rendered; anything else 404s. */
export function generateStaticParams() {
  return GENRES.map((genre) => ({ slug: genre.slug }));
}

const pageFrom = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, MAX_PAGES) : 1;
};

/**
 * Title and description for a genre page.
 *
 * The two are different because the query behind them is: someone searching
 * "action anime" should land on a page that says so, not one that also promises
 * action TV series. `anilist === null` means TMDB has no equivalent bucket and the
 * page is anime-only, and the copy says that instead of padding the page with
 * unrelated titles to look fuller.
 */
function metaFor(genre: GenreEntry, page: number): Metadata {
  const path = genrePath(genre.slug);
  const canonical = absoluteUrl(page > 1 ? `${path}?page=${page}` : path, SITE_URL);

  const subject = genre.anilist && !genre.tmdbIds.length
    ? `${genre.label} Anime`
    : `${genre.label} Movies, TV Series & Anime`;

  const pageSuffix = page > 1 ? ` — Page ${page}` : '';

  const title = `Top ${genre.label} Movies and Anime to Watch Free${pageSuffix} - ${SITE_NAME}`;

  const description =
    page > 1
      ? `Page ${page} of top ${genre.label} titles to watch free online in HD on ${SITE_NAME}. ${capitalise(genre.intent)}.`
      : `Watch the best ${genre.intent} online free in HD 1080p on ${SITE_NAME}. Updated daily from TMDB and AniList, with English subtitles and dubbed audio.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: `${subject} to Watch Free${pageSuffix}`,
      description,
      url: canonical,
    },
  };
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const genre = findGenre(slug);
  if (!genre) return { title: 'Not Found' };
  return metaFor(genre, pageFrom(page));
}

export default async function GenrePage({ params, searchParams }: Props) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);

  const genre = findGenre(slug);
  if (!genre) notFound();

  const currentPage = pageFrom(page);
  const genreIds = genre.tmdbIds;

  /**
   * Each rail is independently optional. A TMDB outage should not blank the whole
   * page — the anime rail comes from a different API and is usually still fine, and
   * a page with three empty sections is a worse outcome than a page with one.
   *
   * AniList-only genres have no TMDB ids at all, so their two TMDB rails resolve to
   * empty without a request rather than being padded with unrelated titles.
   */
  const [movies, tv, anime] = await Promise.all([
    genreIds.length
      ? fetchMoviesByGenre(genreIds, currentPage).catch(() => [])
      : Promise.resolve([]),
    genreIds.length ? fetchTvByGenre(genreIds, currentPage).catch(() => []) : Promise.resolve([]),
    genre.anilist
      ? fetchFromAniList({
          type: 'ANIME',
          genre_in: [genre.anilist],
          sort: ['POPULARITY_DESC'],
          page: currentPage,
          perPage: PER_PAGE,
          isAdult: false,
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const hasNext = movies.length === PER_PAGE || tv.length === PER_PAGE || anime.length === PER_PAGE;

  /**
   * Only pre-render page one. Deeper pages are reachable from `Pagination` and are
   * crawled from there, but submitting `?page=2` for every genre to the sitemap
   * would triple the index for lists with no search demand behind them.
   */
  const canonicalPath = genrePath(genre.slug);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Top ${genre.label} to Watch Free`,
      url: absoluteUrl(canonicalPath, SITE_URL),
      description: `Browse the most popular ${genre.label} movies, TV series and anime available to stream free.`,
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${SITE_URL.replace(/\/$/, '')}/`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL.replace(/\/$/, '')}/` },
        { '@type': 'ListItem', position: 2, name: 'Genres', item: `${SITE_URL.replace(/\/$/, '')}/genre` },
        { '@type': 'ListItem', position: 3, name: genre.label },
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
              Top {genre.label} Movies, TV Series &amp; Anime to Watch Free
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The most popular {genre.label} titles on {SITE_NAME}, ranked by what people are actually
              watching. Every title streams free in HD with English subtitles and dubbed audio, and the
              list is rebuilt from TMDB and AniList every hour.
            </p>
          </header>

          <GenreNav current={genre.slug} />

          {movies.length === 0 && tv.length === 0 && anime.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Nothing to show right now</h2>
              <p className="text-muted-foreground">
                The catalogue for this genre could not be loaded. Check the{' '}
                <a href="/diagnostics" className="underline">
                  system status
                </a>{' '}
                page.
              </p>
            </div>
          ) : (
            <>
              {movies.length > 0 && <MovieGrid title={`${genre.label} Movies`} items={movies} />}
              <AdBanner />
              {anime.length > 0 && <MediaGrid title={`${genre.label} Anime`} items={anime} />}
              {tv.length > 0 && <TvGrid title={`${genre.label} TV Series`} items={tv} />}
            </>
          )}

          <Pagination path={canonicalPath} page={currentPage} hasNext={hasNext} />
        </div>
      </main>

      <DetailJsonLd nodes={jsonLd} />
    </div>
  );
}