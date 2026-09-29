import { fetchIndianWebSeries, fetchIndianMovies } from '@/lib/tmdb';
import Header from '@/components/header';
import TvGrid from '@/components/tv-grid';
import TvCarousel from '@/components/tv-carousel';
import MovieCarousel from '@/components/movie-carousel';
import { AdBanner } from '@/components/ads';

export const revalidate = 3600;

export const metadata = {
  title: 'Indian Web Series',
  description:
    'Stream Indian web series and OTT originals in Hindi, Tamil, Telugu, Malayalam and Kannada. New episodes and trending shows updated daily.',
};

const RAILS = [
  { key: 'hindi', label: 'Hindi Web Series' },
  { key: 'tamil', label: 'Tamil Web Series' },
  { key: 'telugu', label: 'Telugu Web Series' },
  { key: 'malayalam', label: 'Malayalam Web Series' },
  { key: 'kannada', label: 'Kannada Web Series' },
] as const;

export default async function IndianWebSeriesPage() {
  const [hindiMovies, ...railResults] = await Promise.all([
    fetchIndianMovies('hindi'),
    ...RAILS.map((rail) => fetchIndianWebSeries(rail.key)),
  ]);

  const rails = RAILS.map((rail, index) => ({
    label: rail.label,
    items: railResults[index],
  })).filter((rail) => rail.items.length > 0);

  const totalSeries = rails.reduce((sum, rail) => sum + rail.items.length, 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto space-y-12 px-4 py-8 sm:px-6 lg:px-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Indian Web Series</h1>
            <p className="text-sm text-muted-foreground">
              OTT originals and streaming series across five Indian languages.
              {totalSeries > 0 ? ` ${totalSeries} shows available.` : ''}
            </p>
          </header>

          {rails.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Web series catalogue unavailable</h2>
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
              {rails[0] && <TvGrid title={rails[0].label} items={rails[0].items} />}
              <AdBanner />
              {rails.slice(1).map((rail) => (
                <TvCarousel key={rail.label} title={rail.label} items={rail.items} />
              ))}
              {hindiMovies.length > 0 && (
                <>
                  <AdBanner />
                  <MovieCarousel title="Hindi & Bollywood Movies" items={hindiMovies} />
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
