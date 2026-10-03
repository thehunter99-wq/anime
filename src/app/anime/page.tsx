import type { Metadata } from 'next';

import { fetchFromAniList } from '@/lib/anilist';
import { type Media } from '@/lib/types';
import { SITE_URL } from '@/lib/site';
import Header from '@/components/header';
import MediaCarousel from '@/components/media-carousel';
import MediaGrid from '@/components/media-grid';
import { AdBanner } from '@/components/ads';
import SmartlinkCta from '@/components/smartlink-cta';

/**
 * Anime hub.
 *
 * Note this is a sibling of `/anime/[id]`, not a parent of it. Both can coexist
 * in the App Router: `/anime` resolves to this index and `/anime/21` to the
 * detail route, which is exactly the shape the sitemap assumes.
 */
export const revalidate = 3600;

const TITLE = 'Anime';

export const metadata: Metadata = {
  title: `${TITLE} - Watch Online Free with English Subs`,
  description:
    'Watch anime online free in HD with English subtitles and dubbing. Popular, trending, top rated and upcoming series updated daily on MovAnime.',
  alternates: { canonical: `${SITE_URL}/anime` },
  openGraph: {
    title: `${TITLE} - Watch Online Free with English Subs`,
    description:
      'Stream anime free in HD 1080p with English sub and dub on MovAnime.',
    url: `${SITE_URL}/anime`,
  },
};

export default async function AnimeHubPage() {
  const [popular, trending, topRated, upcoming] = await Promise.all([
    fetchFromAniList({ type: 'ANIME', sort: ['POPULARITY_DESC'], perPage: 24 }),
    fetchFromAniList({ type: 'ANIME', sort: ['TRENDING_DESC'], perPage: 24 }),
    fetchFromAniList({ type: 'ANIME', sort: ['SCORE_DESC'], perPage: 24 }),
    fetchFromAniList({ type: 'ANIME', sort: ['START_DATE_DESC'], perPage: 24 }),
  ]);

  const anime: Media[] = popular;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto space-y-12 px-4 py-8 sm:px-6 lg:px-8">
          {anime.length === 0 && trending.length === 0 && upcoming.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Anime data is unavailable</h2>
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
              {popular.length > 0 && <MediaGrid title="Popular Anime" items={popular} />}
              <AdBanner />
              {trending.length > 0 && <MediaCarousel title="Trending Anime" items={trending} />}
              {topRated.length > 0 && <MediaGrid title="Top Rated Anime" items={topRated} />}
              <AdBanner />
              {/* Smartlink entry point for visitors who browse but never open a
                  title's detail page — the only other place the smartlink appears. */}
              <SmartlinkCta label="Fast HD Download — Popular Anime" hint="Sponsored offer" />
              {upcoming.length > 0 && <MediaGrid title="Latest Releases" items={upcoming} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}