import type { Metadata } from 'next';

import { fetchFromTMDB } from '@/lib/tmdb';
import { fetchFromAniList } from '@/lib/anilist';
import { SITE_URL } from '@/lib/site';
import Header from '@/components/header';
import MovieCarousel from '@/components/movie-carousel';
import TvCarousel from '@/components/tv-carousel';
import MediaCarousel from '@/components/media-carousel';
import { AdBanner } from '@/components/ads';

/**
 * Cross-category trending hub.
 *
 * Sits on a much shorter revalidate than the other category pages because it is
 * entirely made of fast-moving lists. An hour-stale "trending" page is not
 * trending any more, and `lastModified` in the sitemap should reflect that.
 */
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Trending Now',
  description:
    'See what is trending right now across movies, TV series and anime on MovAnime. Updated every few hours from TMDB and AniList trending charts.',
  alternates: { canonical: `${SITE_URL}/trending` },
  openGraph: {
    title: 'Trending Now',
    description: 'Trending movies, web series and anime, updated every few hours.',
    url: `${SITE_URL}/trending`,
  },
};

export default async function TrendingPage() {
  const [trendingMovies, trendingTv, trendingAnime] = await Promise.all([
    fetchFromTMDB('/trending/movie/day'),
    fetchFromTMDB('/trending/tv/day'),
    fetchFromAniList({ type: 'ANIME', sort: ['TRENDING_DESC'], perPage: 20 }),
  ]);

  const allEmpty =
    trendingMovies.length === 0 && trendingTv.length === 0 && trendingAnime.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto space-y-12 px-4 py-8 sm:px-6 lg:px-8">
          {allEmpty ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Trending data is unavailable</h2>
              <p className="text-muted-foreground">
                Upstreams could not be reached. Check the{' '}
                <a href="/diagnostics" className="underline">
                  system status
                </a>{' '}
                page.
              </p>
            </div>
          ) : (
            <>
              {trendingMovies.length > 0 && (
                <MovieCarousel title="Trending Movies Today" items={trendingMovies} />
              )}
              <AdBanner />
              {trendingTv.length > 0 && (
                <TvCarousel title="Trending Series Today" items={trendingTv} />
              )}
              {trendingAnime.length > 0 && (
                <MediaCarousel title="Trending Anime Today" items={trendingAnime} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}