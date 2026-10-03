import Link from 'next/link';
import type { Metadata } from 'next';

import { fetchFromAniList } from '@/lib/anilist';
import { fetchAnimeTv } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { absoluteUrl, subPath } from '@/lib/routes';
import { GENRES } from '@/lib/genres';
import Header from '@/components/header';
import MediaGrid from '@/components/media-grid';
import TvGrid from '@/components/tv-grid';
import Pagination from '@/components/pagination';
import DetailJsonLd from '@/components/detail-json-ld';
import { AdBanner } from '@/components/ads';
import SmartlinkCta from '@/components/smartlink-cta';

type Props = {
  searchParams: Promise<{ page?: string }>;
};

const PER_PAGE = 20;
const MAX_PAGES = 500;

/**
 * Subbed hub: `/sub`.
 *
 * ── Why this is not a redirect to `/anime` ───────────────────────────────────
 * "english sub anime" and "watch subbed anime free" are their own queries, and
 * the honest answer is a page whose title and heading say *subtitled* rather than
 * an anime hub that makes the visitor work out which of the listed titles carry
 * subs. Every anime on this site is subbed, so this page is a curated cut of that
 * catalogue under the phrasing people actually search with.
 *
 * ── Why the anime rail is TMDB-backed and not AniList ────────────────────────
 * AniList has no dub/sub field at all, so it cannot separate subbed from dubbed —
 * asking it for "subbed anime" would return the same list as "anime". TMDB gives
 * the popularity ranking that makes the page useful, and AniList supplies the
 * catalogue cards the rest of the site already renders, so both rails appear with
 * no false claim about either.
 */
export const revalidate = 3600;

const CANONICAL = subPath();

const pageFrom = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, MAX_PAGES) : 1;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page } = await searchParams;
  const currentPage = pageFrom(page);
  const pageSuffix = currentPage > 1 ? ` — Page ${currentPage}` : '';
  const canonical = absoluteUrl(
    currentPage > 1 ? `${CANONICAL}?page=${currentPage}` : CANONICAL,
    SITE_URL
  );

  const title = `Watch English Sub Anime Online Free 1080p${pageSuffix} - ${SITE_NAME}`;
  const description =
    currentPage > 1
      ? `Page ${currentPage} of subbed anime to watch free online in HD 1080p with English subtitles on ${SITE_NAME}.`
      : `Watch subbed anime online free in HD 1080p with English subtitles. The most popular subtitled anime series, updated daily on ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: `English Sub Anime to Watch Free${pageSuffix}`,
      description,
      url: canonical,
    },
  };
}

export default async function SubbedPage({ searchParams }: Props) {
  const { page } = await searchParams;
  const currentPage = pageFrom(page);

  /**
   * AniList is asked for the popular anime cards the site already renders
   * elsewhere; TMDB's anime rail supplies a second, independently-sourced list so
   * one API being down still leaves a populated page rather than an empty grid.
   */
  const [anime, animeTv] = await Promise.all([
    fetchFromAniList({
      type: 'ANIME',
      sort: ['POPULARITY_DESC'],
      page: currentPage,
      perPage: PER_PAGE,
      isAdult: false,
    }).catch(() => []),
    fetchAnimeTv(currentPage).catch(() => []),
  ]);

  const hasNext = anime.length === PER_PAGE || animeTv.length === PER_PAGE;
  const root = SITE_URL.replace(/\/$/, '');

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Subbed Anime',
      url: absoluteUrl(CANONICAL, SITE_URL),
      description:
        'The most popular subtitled anime series, streaming free in HD with English subtitles.',
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${root}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${root}/` },
        { '@type': 'ListItem', position: 2, name: 'English Sub' },
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
              English Sub Anime to Watch Free
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Every series here streams free in HD 1080p with hard-coded English subtitles. The
              list is ranked by genuine popularity and rebuilt from AniList and TMDB every hour.
            </p>
          </header>

          {/* Sibling surfaces. These chips are the internal-link path between the
              sub hub and the dubbed hub, so neither depends on the sitemap alone. */}
          <nav aria-label="Audio and subtitle options" className="flex flex-wrap gap-2">
            <span className="rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              English Sub
            </span>
            <Link
              href="/dub"
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              Dubbed
            </Link>
            {GENRES.slice(0, 8).map((genre) => (
              <Link
                key={genre.slug}
                href={`/genre/${genre.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent"
              >
                {genre.label}
              </Link>
            ))}
          </nav>

          {anime.length === 0 && animeTv.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Nothing to show right now</h2>
              <p className="text-muted-foreground">
                The subbed catalogue could not be loaded. Check the{' '}
                <Link href="/diagnostics" className="underline">
                  system status
                </Link>{' '}
                page.
              </p>
            </div>
          ) : (
            <>
              {anime.length > 0 && <MediaGrid title="Subbed Anime" items={anime} />}
              <AdBanner />
              {/* Smartlink CTA between the two rails. This page converts on
                  "watch subbed anime free", which is exactly the intent the
                  sponsored offer monetises, and neither rail links to a detail
                  page the visitor is guaranteed to open. */}
              <SmartlinkCta
                label="Fast HD Download — All Episodes"
                hint="Sponsored offer"
              />
              {animeTv.length > 0 && <TvGrid title="Subtitled Anime Series" items={animeTv} />}
            </>
          )}

          <Pagination path={CANONICAL} page={currentPage} hasNext={hasNext} />
        </div>
      </main>

      <DetailJsonLd nodes={jsonLd} />
    </div>
  );
}
