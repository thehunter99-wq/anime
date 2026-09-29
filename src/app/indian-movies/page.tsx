import { fetchIndianMovies, fetchIndianWebSeries } from '@/lib/tmdb';
import Header from '@/components/header';
import MovieGrid from '@/components/movie-grid';
import MovieCarousel from '@/components/movie-carousel';
import TvCarousel from '@/components/tv-carousel';
import { AdBanner } from '@/components/ads';

export const revalidate = 3600;

export const metadata = {
  title: 'Indian Movies',
  description:
    'Stream Bollywood, Hindi dubbed and South Indian movies. Trending Hindi, Tamil, Telugu, Malayalam and Kannada films updated daily.',
};

const RAILS = [
  { key: 'hindi', label: 'Hindi & Bollywood' },
  { key: 'tamil', label: 'Tamil Movies' },
  { key: 'telugu', label: 'Telugu Movies' },
  { key: 'malayalam', label: 'Malayalam Movies' },
  { key: 'kannada', label: 'Kannada Movies' },
] as const;

export default async function IndianMoviesPage() {
  const [hindiSeries, ...railResults] = await Promise.all([
    fetchIndianWebSeries('hindi'),
    ...RAILS.map((rail) => fetchIndianMovies(rail.key)),
  ]);

  const rails = RAILS.map((rail, index) => ({
    label: rail.label,
    items: railResults[index],
  })).filter((rail) => rail.items.length > 0);

  const totalTitles = rails.reduce((sum, rail) => sum + rail.items.length, 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto space-y-12 px-4 py-8 sm:px-6 lg:px-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Indian Movies</h1>
            <p className="text-sm text-muted-foreground">
              Bollywood and regional cinema in Hindi, Tamil, Telugu, Malayalam and
              Kannada. {totalTitles > 0 ? `${totalTitles} titles available.` : ''}
            </p>
          </header>

          {rails.length === 0 ? (
            <div className="py-16 text-center">
              <h2 className="text-2xl font-bold">Indian catalogue unavailable</h2>
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
              {rails[0] && <MovieGrid title={rails[0].label} items={rails[0].items} />}
              <AdBanner />
              {rails.slice(1).map((rail) => (
                <MovieCarousel key={rail.label} title={rail.label} items={rail.items} />
              ))}
              {hindiSeries.length > 0 && (
                <>
                  <AdBanner />
                  <TvCarousel title="Hindi Web Series" items={hindiSeries} />
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
