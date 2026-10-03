import Link from 'next/link';
import type { Metadata } from 'next';

import { fetchMoviesByLanguage, fetchTvByLanguage } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { absoluteUrl, dubPath } from '@/lib/routes';
import { DUB_LANGUAGES } from '@/lib/languages';
import Header from '@/components/header';
import MovieGrid from '@/components/movie-grid';
import TvGrid from '@/components/tv-grid';
import DetailJsonLd from '@/components/detail-json-ld';
import { AdBanner, NativeBannerAd } from '@/components/ads';

/**
 * Dubbed hub: `/dub`.
 *
 * ── Why a hub rather than a redirect ─────────────────────────────────────────
 * "dubbed movies" with no language named is a real query, and the honest answer
 * is a page that shows what languages exist here plus a cross-section of dubbed
 * titles — not a bounce to Hindi. It also gives every `/dub/[lang]` page a parent
 * one hop from the homepage, which is what makes the language pages crawlable
 * without each one having to be linked from navigation.
 *
 * The cross-section is Hindi, because that is the largest slice of this
 * audience's demand and therefore the most useful default. The page says so
 * rather than implying the list is language-neutral.
 */
export const revalidate = 3600;

const CANONICAL = dubPath();

export const metadata: Metadata = {
  title: `Dubbed Movies & Web Series — Watch Free in Hindi, Tamil, Telugu - ${SITE_NAME}`,
  description: `Watch dubbed movies and web series free online in HD 1080p. Hindi, Tamil, Telugu, Malayalam, Kannada, English, Japanese and Korean titles with English subtitles on ${SITE_NAME}.`,
  alternates: { canonical: absoluteUrl(CANONICAL, SITE_URL) },
  openGraph: {
    type: 'website',
    title: `Dubbed Movies & Web Series to Watch Free - ${SITE_NAME}`,
    description:
      'Hindi, Tamil, Telugu, Malayalam, Kannada, English, Japanese and Korean dubbed movies and web series, free in HD.',
    url: absoluteUrl(CANONICAL, SITE_URL),
  },
};

export default async function DubHubPage() {
  /**
   * The featured rail is Hindi. Both requests fail soft: a TMDB outage must not
   * blank the page, because the language list below is static and is itself the
   * main crawl path into the per-language pages.
   */
  const featured = DUB_LANGUAGES[0];
  const [movies, tv] = await Promise.all([
    fetchMoviesByLanguage(featured.code, 1).catch(() => []),
    fetchTvByLanguage(featured.code, 1).catch(() => []),
  ]);

  const root = SITE_URL.replace(/\/$/, '');

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Dubbed Movies & Web Series',
      url: absoluteUrl(CANONICAL, SITE_URL),
      description:
        'Dubbed movies and web series in Hindi, Tamil, Telugu, Malayalam, Kannada, English, Japanese and Korean.',
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${root}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${root}/` },
        { '@type': 'ListItem', position: 2, name: 'Dubbed' },
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
              Dubbed Movies &amp; Web Series to Watch Free
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Browse dubbed titles by language. Every list streams free in HD with English
              subtitles and is rebuilt from TMDB every hour. Pick a language to see the most
              popular {featured.label.toLowerCase()} movies and web series first.
            </p>
          </header>

          <section aria-labelledby="languages-heading" className="space-y-4">
            <h2 id="languages-heading" className="text-xl font-bold tracking-tight">
              Browse by language
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {DUB_LANGUAGES.map((language) => (
                <Link
                  key={language.slug}
                  href={dubPath(language.slug)}
                  className="rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-accent"
                >
                  <p className="font-semibold">{language.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{language.intent}</p>
                </Link>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Prefer subtitles? Browse{' '}
              <Link href="/sub" className="underline hover:text-primary transition-colors">
                subbed titles
              </Link>
              .
            </p>
          </section>

{movies.length > 0 && (
             <MovieGrid title={`Popular ${featured.label} Dubbed Movies`} items={movies} />
           )}
           <AdBanner />
           {tv.length > 0 && (
             <TvGrid title={`Popular ${featured.label} Dubbed Web Series`} items={tv} />
           )}
           <NativeBannerAd />
        </div>
      </main>

      <DetailJsonLd nodes={jsonLd} />
    </div>
  );
}
