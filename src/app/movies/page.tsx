import type { Metadata } from 'next';

import { fetchFromTMDB } from '@/lib/tmdb';
import { type Movie } from '@/lib/types';
import { SITE_URL } from '@/lib/site';
import Header from '@/components/header';
import MovieCarousel from '@/components/movie-carousel';
import MovieGrid from '@/components/movie-grid';
import SmartlinkCta from '@/components/smartlink-cta';

/**
 * Movie hub. Referenced by the sitemap as a category page, so it has to be a
 * real crawlable route rather than a query-string view of the homepage.
 */
export const revalidate = 3600;

const TITLE = 'Movies';

export const metadata: Metadata = {
  title: `${TITLE} - Watch Online Free`,
  description:
    'Browse and stream movies online free in HD. Popular, trending, top rated and now playing films updated daily on MovAnime.',
  alternates: { canonical: `${SITE_URL}/movies` },
  openGraph: {
    title: `${TITLE} - Watch Online Free`,
    description: 'Stream movies online free in HD 1080p with English subtitles.',
    url: `${SITE_URL}/movies`,
  },
};

export default async function MoviesPage() {
  const [popular, trending, topRated, nowPlaying] = await Promise.all([
    fetchFromTMDB('/movie/popular'),
    fetchFromTMDB('/trending/movie/week'),
    fetchFromTMDB('/movie/top_rated'),
    fetchFromTMDB('/movie/now_playing'),
  ]);

  const movies: Movie[] = popular;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto space-y-12 px-4 py-8 sm:px-6 lg:px-8">
          {movies.length === 0 && trending.length === 0 && nowPlaying.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Movie data is unavailable</h2>
              <p className="text-muted-foreground">
                TMDB could not be reached. Check the{' '}
                <a href="/diagnostics" className="underline">
                  system status
                </a>{' '}
                page.
              </p>
            </div>
          ) : (
            <>
              {popular.length > 0 && <MovieGrid title="Popular Movies" items={popular} />}
              {trending.length > 0 && <MovieCarousel title="Trending This Week" items={trending} />}
              {nowPlaying.length > 0 && <MovieGrid title="Now Playing" items={nowPlaying} />}
              {/* Smartlink entry point for visitors who browse but never open a
                  film's detail page — the only other place the smartlink appears. */}
              <SmartlinkCta label="Fast HD Download — Latest Movies" hint="Sponsored offer" />
              {topRated.length > 0 && <MovieGrid title="Top Rated Movies" items={topRated} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
