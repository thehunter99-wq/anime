import { fetchFromTMDB } from '@/lib/tmdb';
import { type TVShow } from '@/lib/types';
import Header from '@/components/header';
import TvCarousel from '@/components/tv-carousel';
import TvGrid from '@/components/tv-grid';
import SmartlinkCta from '@/components/smartlink-cta';

export const revalidate = 3600;

export const metadata = {
  title: 'Web Series & TV Shows',
  description:
    'Stream the latest web series and trending TV shows online. Browse popular, top rated and trending series updated daily.',
};

export default async function WebSeriesPage() {
  const [trending, popular, topRated, onTheAir] = await Promise.all([
    fetchFromTMDB('/trending/tv/day'),
    fetchFromTMDB('/tv/popular'),
    fetchFromTMDB('/tv/top_rated'),
    fetchFromTMDB('/tv/on_the_air'),
  ]);

  const hero: TVShow[] = trending.slice(0, 5);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto space-y-12 px-4 py-8 sm:px-6 lg:px-8">
          {hero.length === 0 && trending.length === 0 && popular.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">TV data is unavailable</h2>
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
              {popular.length > 0 && <TvGrid title="Popular Web Series" items={popular} />}
              {trending.length > 0 && <TvCarousel title="Trending Today" items={trending} />}
              {topRated.length > 0 && <TvGrid title="Top Rated Series" items={topRated} />}
              {/* Smartlink entry point for visitors who browse but never open a
                  show's detail page — the only other place the smartlink appears. */}
              <SmartlinkCta label="Fast HD Download — Web Series" hint="Sponsored offer" />
              {onTheAir.length > 0 && <TvCarousel title="On The Air" items={onTheAir} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
