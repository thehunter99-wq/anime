import type { Metadata } from 'next';
import Link from 'next/link';

import { SITE_NAME, SITE_URL } from '@/lib/site';
import { GENRES } from '@/lib/genres';
import Header from '@/components/header';
import GenreNav from '@/components/genre-nav';
import DetailJsonLd from '@/components/detail-json-ld';
import { AdBanner } from '@/components/ads';
import SmartlinkCta from '@/components/smartlink-cta';

export const metadata: Metadata = {
  title: `Browse All Movie, TV & Anime Genres - ${SITE_NAME}`,
  description: `Every genre on ${SITE_NAME} — action, romance, comedy, sci-fi, horror, anime and more. Find the best ${'free'} titles in each category and watch them online in HD.`,
  alternates: { canonical: `${SITE_URL}/genre` },
  openGraph: {
    type: 'website',
    title: 'All Genres',
    description: 'Browse movies, TV series and anime by genre.',
    url: `${SITE_URL}/genre`,
  },
};

/**
 * Genre index at `/genre`.
 *
 * This is the parent of every `/genre/[slug]` page and the reason those pages
 * have a real breadcrumb parent instead of a fabricated one. It also gives the
 * crawler a single hub to reach all ~29 genre pages in one hop, which is what
 * gets them discovered — a landing page that nothing links to does not get
 * crawled, however good its content is.
 *
 * Cheap by construction: no upstream calls at all, so it stays correct even when
 * TMDB and AniList are both down.
 */
export default function GenresIndexPage() {
  const root = SITE_URL.replace(/\/$/, '');

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'All Genres',
      url: `${root}/genre`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${root}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Genres',
      itemListElement: GENRES.map((genre, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: genre.label,
        url: `${root}/genre/${genre.slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${root}/` },
        { '@type': 'ListItem', position: 2, name: 'Genres' },
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
              Browse by Genre
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Pick a genre to see the most-watched movies, TV series and anime in it, ranked by
              popularity and rebuilt every hour. Everything streams free in HD with English subtitles
              and dubbed audio.
            </p>
          </header>

          <GenreNav />

          <AdBanner />

          <SmartlinkCta label="Fast HD Download — Any Genre" hint="Sponsored offer" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {GENRES.map((genre) => (
              <Link
                key={genre.slug}
                href={`/genre/${genre.slug}`}
                className="rounded-lg border border-border p-4 transition-colors hover:bg-accent"
              >
                <span className="block font-medium">{genre.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{genre.intent}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <DetailJsonLd nodes={jsonLd} />
    </div>
  );
}