import type { Metadata } from 'next';

import { fetchFromAniList } from '@/lib/anilist';
import { type Media } from '@/lib/types';
import { SITE_URL } from '@/lib/site';
import Header from '@/components/header';
import MediaCarousel from '@/components/media-carousel';
import MediaGrid from '@/components/media-grid';
import { AdBanner } from '@/components/ads';

/**
 * Manga hub at `/manga`.
 *
 * Also the section landing page referenced by the breadcrumb trail on every
 * `/manga/[id]` page, so it must exist and be crawlable.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Manga - Read Online Free',
  description:
    'Read manga online free on MovAnime. Popular, trending and top rated manga updated daily, with new chapters as they release.',
  alternates: { canonical: `${SITE_URL}/manga` },
  openGraph: {
    title: 'Manga - Read Online Free',
    description: 'Read popular manga online free, updated daily.',
    url: `${SITE_URL}/manga`,
  },
};

export default async function MangaHubPage() {
  const [popular, trending, topRated] = await Promise.all([
    fetchFromAniList({ type: 'MANGA', sort: ['POPULARITY_DESC'], perPage: 24 }),
    fetchFromAniList({ type: 'MANGA', sort: ['TRENDING_DESC'], perPage: 24 }),
    fetchFromAniList({ type: 'MANGA', sort: ['SCORE_DESC'], perPage: 24 }),
  ]);

  const manga: Media[] = popular;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto space-y-12 px-4 py-8 sm:px-6 lg:px-8">
          {manga.length === 0 && trending.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Manga data is unavailable</h2>
              <p className="text-muted-foreground">
                AniList could not be reached. Check the{' '}
                <a href="/diagnostics" className="underline">
                  system status
                </a>{' '}
                page.
              </p>
            </div>
          ) : (
            <>
              {popular.length > 0 && <MediaGrid title="Popular Manga" items={popular} />}
              <AdBanner />
              {trending.length > 0 && <MediaCarousel title="Trending Manga" items={trending} />}
              {topRated.length > 0 && <MediaGrid title="Top Rated Manga" items={topRated} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}