
import { fetchFromAniList } from '@/lib/anilist';
import {
  fetchFromTMDB,
  fetchIndianMovies,
  fetchIndianTrendingMovies,
  fetchIndianWebSeries,
} from '@/lib/tmdb';
import type { Media, Movie, TVShow } from '@/lib/types';
import Header from '@/components/header';
import MediaCarousel from '@/components/media-carousel';
import MovieCarousel from '@/components/movie-carousel';
import TvCarousel from '@/components/tv-carousel';
import MediaGrid from '@/components/media-grid';
import MovieGrid from '@/components/movie-grid';
import TvGrid from '@/components/tv-grid';
import HeroCarousel from '@/components/hero-carousel';
import MovieHeroCarousel from '@/components/movie-hero-carousel';
import TvHeroCarousel from '@/components/tv-hero-carousel';
import { AdBanner } from '@/components/ads';


export const revalidate = 3600; // Revalidate every hour

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string; tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.query || '';
  const tab = resolvedSearchParams?.tab || 'anime';

  let trendingAnime: Media[] = [];
  let popularAnime: Media[] = [];
  let trendingManga: Media[] = [];
  let popularManga: Media[] = [];
  let trendingMovies: Movie[] = [];
  let popularMovies: Movie[] = [];
  let trendingTv: TVShow[] = [];
  let popularTv: TVShow[] = [];

  let indianHindiMovies: Movie[] = [];
  let indianSouthMovies: Movie[] = [];
  let trendingIndianMovies: Movie[] = [];
  let hindiWebSeries: TVShow[] = [];

  let animeSearchResults: Media[] = [];
  let mangaSearchResults: Media[] = [];
  let movieSearchResults: Movie[] = [];
  let tvSearchResults: TVShow[] = [];

  try {
    if (query) {
      // `tab=all` is the unified search: every provider is queried so movies,
      // web series, anime and manga all appear on one page.
      if (tab === 'anime' || tab === 'all') {
        animeSearchResults = await fetchFromAniList({ search: query, type: 'ANIME', sort: ['SEARCH_MATCH'], perPage: 20 });
      }
      if (tab === 'manga' || tab === 'all') {
        mangaSearchResults = await fetchFromAniList({ search: query, type: 'MANGA', sort: ['SEARCH_MATCH'], perPage: 20 });
      }
      if (tab === 'movies' || tab === 'all') {
        movieSearchResults = await fetchFromTMDB('/search/movie', { query });
      }
      if (tab === 'tv' || tab === 'all') {
        tvSearchResults = await fetchFromTMDB('/search/tv', { query });
      }
    } else {
      // Indian rails are fetched on every tab because they are the primary
      // discovery surface for the intended audience. Each call is independent
      // so one failing region filter cannot blank the whole page.
      [
        trendingAnime,
        popularAnime,
        trendingManga,
        popularManga,
        trendingMovies,
        popularMovies,
        trendingTv,
        popularTv,
      ] = await Promise.all([
        fetchFromAniList({
          type: 'ANIME',
          sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
          perPage: 10,
        }),
        fetchFromAniList({
          type: 'ANIME',
          sort: ['POPULARITY_DESC'],
          perPage: 20,
        }),
        fetchFromAniList({
          type: 'MANGA',
          sort: ['TRENDING_DESC', 'POPULARITY_DESC'],
          perPage: 10,
        }),
        fetchFromAniList({
          type: 'MANGA',
          sort: ['POPULARITY_DESC'],
          perPage: 20,
        }),
        fetchFromTMDB('/trending/movie/week'),
        fetchFromTMDB('/movie/popular'),
        fetchFromTMDB('/trending/tv/week'),
        fetchFromTMDB('/tv/popular'),
      ]);

      [
        trendingIndianMovies,
        indianHindiMovies,
        indianSouthMovies,
        hindiWebSeries,
      ] = await Promise.all([
        fetchIndianTrendingMovies(),
        fetchIndianMovies('hindi'),
        fetchIndianMovies('tamil'),
        fetchIndianWebSeries('hindi'),
      ]);

      // Dedupe the South rail against Hindi so the same title cannot appear twice.
      const seen = new Set(indianHindiMovies.map((item) => item.id));
      const southExtras = (await fetchIndianMovies('telugu')).filter(
        (item) => !seen.has(item.id)
      );
      indianSouthMovies = [...indianSouthMovies, ...southExtras].slice(0, 20);
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }

  const heroAnimeItems = trendingAnime.slice(0, 5);
  const heroMangaItems = trendingManga.slice(0, 5);
  const heroMovieItems = trendingMovies.slice(0, 5);
  const heroTvItems = trendingTv.slice(0, 5);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {query ? (
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="space-y-12">
                {animeSearchResults.length > 0 && (
                  <MediaGrid title="Anime Results" items={animeSearchResults} />
                )}
                {mangaSearchResults.length > 0 && (
                  <MediaGrid title="Manga Results" items={mangaSearchResults} />
                )}
                {movieSearchResults.length > 0 && (
                  <MovieGrid title="Movie Results" items={movieSearchResults} />
                )}
                {tvSearchResults.length > 0 && (
                  <TvGrid title="TV Show Results" items={tvSearchResults} />
                )}
                {animeSearchResults.length === 0 && mangaSearchResults.length === 0 && movieSearchResults.length === 0 && tvSearchResults.length === 0 && (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold">No results found for "{query}"</h2>
                    <p className="text-muted-foreground">Try a different search term.</p>
                  </div>
                )}
              </div>
          </div>
        ) : (
          <>
            {heroAnimeItems.length > 0 && tab === 'anime' && <HeroCarousel items={heroAnimeItems} />}
            {heroMangaItems.length > 0 && tab === 'manga' && <HeroCarousel items={heroMangaItems} />}
            {heroMovieItems.length > 0 && tab === 'movies' && <MovieHeroCarousel items={heroMovieItems} />}
            {heroTvItems.length > 0 && tab === 'tv' && <TvHeroCarousel items={heroTvItems} />}
            <div className="container mx-auto px-4 pt-6 sm:px-6 lg:px-8">
              <AdBanner />
            </div>
            <div className="container mx-auto space-y-12 px-4 py-8 sm:px-6 lg:px-8">
              {tab === 'anime' && (
                <>
                  {trendingAnime.length > 0 && (
                    <MediaCarousel title="Trending Anime" items={trendingAnime} />
                  )}
                   {popularAnime.length > 0 && (
                     <MediaCarousel title="Popular Anime" items={popularAnime} />
                   )}
                   <div className="py-2" />
                   {trendingIndianMovies.length > 0 && (
                     <MovieCarousel title="Trending Indian Movies" items={trendingIndianMovies} />
                   )}
                   {hindiWebSeries.length > 0 && (
                     <TvCarousel title="Hindi Web Series" items={hindiWebSeries} />
                   )}
                </>
              )}
               {tab === 'manga' && (
                <>
                  {trendingManga.length > 0 && (
                    <MediaCarousel title="Trending Manga" items={trendingManga} />
                  )}
                  {popularManga.length > 0 && (
                    <MediaCarousel title="Popular Manga" items={popularManga} />
                  )}
                </>
              )}
              {tab === 'movies' && (
                <>
                   {trendingIndianMovies.length > 0 && (
                    <MovieCarousel title="Trending Indian Movies" items={trendingIndianMovies} />
                  )}
                   {indianHindiMovies.length > 0 && (
                    <MovieCarousel title="Hindi & Bollywood Movies" items={indianHindiMovies} />
                  )}
                   {indianSouthMovies.length > 0 && (
                    <MovieCarousel title="South Indian Movies" items={indianSouthMovies} />
                  )}
                   {trendingMovies.length > 0 && (
                    <MovieCarousel title="Trending Movies" items={trendingMovies} />
                  )}
                   {popularMovies.length > 0 && (
                    <MovieCarousel title="Popular Movies" items={popularMovies} />
                  )}
                </>
              )}
               {tab === 'tv' && (
                <>
                   {hindiWebSeries.length > 0 && (
                    <TvCarousel title="Hindi Web Series" items={hindiWebSeries} />
                  )}
                   {trendingTv.length > 0 && (
                    <TvCarousel title="Trending TV Shows" items={trendingTv} />
                  )}
                   {popularTv.length > 0 && (
                    <TvCarousel title="Popular TV Shows" items={popularTv} />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
