import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { fetchMoviesByLanguage, fetchTvByLanguage } from '@/lib/tmdb';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { absoluteUrl, dubPath } from '@/lib/routes';
import { DUB_LANGUAGES, findDubLanguage } from '@/lib/languages';
import Header from '@/components/header';
import MovieGrid from '@/components/movie-grid';
import TvGrid from '@/components/tv-grid';
import Pagination from '@/components/pagination';
import DetailJsonLd from '@/components/detail-json-ld';
import { AdBanner, NativeBannerAd } from '@/components/ads';

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PER_PAGE = 20;
const MAX_PAGES = 500;

/**
 * Dubbed-language landing page: `/dub/[lang]`.
 *
 * ── Why it exists ────────────────────────────────────────────────────────────
 * "hindi dubbed movies", "tamil dubbed movies download" and "korean drama english
 * dub" are large, distinctly-worded queries that neither `/genre/[slug]` nor
 * `/year/[year]` can answer: those pages target *what kind* of title, this one
 * targets *which audio track*. `with_original_language` is how TMDB filters for
 * it, and that filter needs a page whose title, `<h1>` and canonical actually say
 * "Hindi dubbed" — which is this page.
 *
 * ── Honesty about what "dubbed" means here ───────────────────────────────────
 * TMDB has no "has a dub" flag, so this page lists titles whose *original*
 * language is the requested one. The copy says "in <Language>" rather than
 * claiming a specific alternate audio track we cannot verify per title. A page
 * that over-promised ("watch in Hindi dub") on titles with no Hindi audio would
 * lose the visitor on the first click, which is worse for ranking than a smaller,
 * accurate list.
 */
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  // Nine slugs, all in the sitemap — cheap to pre-render and they are the pages
  // with the traffic. Deeper pagination stays on demand.
  return DUB_LANGUAGES.map((language) => ({ lang: language.slug }));
}

const pageFrom = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, MAX_PAGES) : 1;
};

function metaFor(label: string, intent: string, slug: string, page: number): Metadata {
  const path = dubPath(slug);
  const canonical = absoluteUrl(page > 1 ? `${path}?page=${page}` : path, SITE_URL);
  const pageSuffix = page > 1 ? ` — Page ${page}` : '';

  const title = `Watch ${label} Dubbed Movies & Web Series Online Free${pageSuffix} - ${SITE_NAME}`;

  const description =
    page > 1
      ? `Page ${page} of ${label} movies and web series to watch free online in HD on ${SITE_NAME}.`
      : `Watch the best ${intent} online free in HD 1080p with English subtitles. Updated daily on ${SITE_NAME}, no sign-up needed.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: `${label} Movies & Web Series to Watch Free${pageSuffix}`,
      description,
      url: canonical,
    },
  };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ lang }, { page }] = await Promise.all([params, searchParams]);
  const language = findDubLanguage(lang);
  if (!language) return { title: 'Not Found' };
  return metaFor(language.label, language.intent, language.slug, pageFrom(page));
}

export default async function DubLanguagePage({ params, searchParams }: Props) {
  const [{ lang }, { page }] = await Promise.all([params, searchParams]);

  const language = findDubLanguage(lang);
  if (!language) notFound();

  const currentPage = pageFrom(page);

  /**
   * Both rails fail soft and independently — TMDB movies and TMDB TV are separate
   * requests, and one failing still leaves a useful page rather than an empty one
   * that is indistinguishable from "no such language".
   */
  const [movies, tv] = await Promise.all([
    fetchMoviesByLanguage(language.code, currentPage).catch(() => []),
    fetchTvByLanguage(language.code, currentPage).catch(() => []),
  ]);

  const hasNext = movies.length === PER_PAGE || tv.length === PER_PAGE;
  const root = SITE_URL.replace(/\/$/, '');
  const canonicalPath = dubPath(language.slug);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${language.label} Dubbed Movies & Web Series`,
      url: absoluteUrl(canonicalPath, SITE_URL),
      description: `Browse ${language.intent} available to stream free in HD.`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${root}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${root}/` },
        { '@type': 'ListItem', position: 2, name: 'Dubbed', item: `${root}/dub` },
        { '@type': 'ListItem', position: 3, name: language.label },
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
              {language.label} Dubbed Movies &amp; Web Series to Watch Free
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The most popular {language.intent}, ranked by what people are actually watching. Every
              title streams free in HD with English subtitles, and the list is rebuilt from TMDB
              every hour.
            </p>
          </header>

          {/* Sibling languages, rendered as real links. A landing page nothing
              links to does not get crawled, and these chips are the internal-link
              path into every `/dub/[lang]` page without pre-rendering them. */}
          <nav aria-label="Dubbed languages" className="flex flex-wrap gap-2">
            {DUB_LANGUAGES.map((entry) => {
              const active = entry.slug === language.slug;
              return (
                <Link
                  key={entry.slug}
                  href={dubPath(entry.slug)}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
                      : 'rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent'
                  }
                >
                  {entry.label}
                </Link>
              );
            })}
            <Link
              href="/sub"
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              English Sub
            </Link>
          </nav>

          {movies.length === 0 && tv.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Nothing to show right now</h2>
              <p className="text-muted-foreground">
                The {language.label} catalogue could not be loaded. Check the{' '}
                <Link href="/diagnostics" className="underline">
                  system status
                </Link>{' '}
                page.
              </p>
            </div>
          ) : (
            <>
{movies.length > 0 && (
                 <MovieGrid title={`${language.label} Movies`} items={movies} />
               )}
               <AdBanner />
               {tv.length > 0 && <TvGrid title={`${language.label} Web Series`} items={tv} />}
               <NativeBannerAd />
            </>
          )}

          <Pagination path={canonicalPath} page={currentPage} hasNext={hasNext} />
        </div>
      </main>

      <DetailJsonLd nodes={jsonLd} />
    </div>
  );
}
