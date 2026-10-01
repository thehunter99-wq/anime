
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
import SearchFilterTabs from '@/components/search-filter-tabs';
import ContinueWatching from '@/components/continue-watching';


export const revalidate = 3600; // Revalidate every hour

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string; tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.query || '';
  const tab = resolvedSearchParams?.tab || 'anime';

  // Search results are filtered by the same tab param, mapped onto the four
  // chips. Any unrecognised value falls back to "All".
  const searchFilter = (['all', 'movies', 'tv', 'anime'] as const).includes(
    tab as 'all' | 'movies' | 'tv' | 'anime'
  )
    ? (tab as 'all' | 'movies' | 'tv' | 'anime')
    : 'all';

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
      // Every category is fetched for any search, in parallel, regardless of the
      // selected filter tab. Two reasons: the filter tabs can show accurate
      // per-category counts, and switching tabs does not refetch. allSettled
      // keeps one failing provider from blanking the other results.
      const [anime, manga, movies, tvShows] = await Promise.allSettled([
        fetchFromAniList({ search: query, type: 'ANIME', sort: ['SEARCH_MATCH'], perPage: 20 }),
        fetchFromAniList({ search: query, type: 'MANGA', sort: ['SEARCH_MATCH'], perPage: 20 }),
        fetchFromTMDB('/search/movie', { query }),
        fetchFromTMDB('/search/tv', { query }),
      ]);

      if (anime.status === 'fulfilled') animeSearchResults = anime.value;
      if (manga.status === 'fulfilled') mangaSearchResults = manga.value;
      if (movies.status === 'fulfilled') movieSearchResults = movies.value;
      if (tvShows.status === 'fulfilled') tvSearchResults = tvShows.value;
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

  const totalResults =
    animeSearchResults.length +
    mangaSearchResults.length +
    movieSearchResults.length +
    tvSearchResults.length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {query ? (
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="space-y-8">
              <div className="flex flex-col gap-4">
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Results for &quot;{query}&quot;
                </h1>
                <SearchFilterTabs
                  query={query}
                  active={searchFilter}
                  counts={{
                    all:
                      animeSearchResults.length +
                      mangaSearchResults.length +
                      movieSearchResults.length +
                      tvSearchResults.length,
                    movies: movieSearchResults.length,
                    tv: tvSearchResults.length,
                    anime: animeSearchResults.length,
                  }}
                />
              </div>

              <div className="space-y-12">
                {(searchFilter === 'all' || searchFilter === 'movies') && movieSearchResults.length > 0 && (
                  <MovieGrid title="Movies" items={movieSearchResults} />
                )}
                {(searchFilter === 'all' || searchFilter === 'tv') && tvSearchResults.length > 0 && (
                  <TvGrid title="TV Shows & Web Series" items={tvSearchResults} />
                )}
                {(searchFilter === 'all' || searchFilter === 'anime') && animeSearchResults.length > 0 && (
                  <MediaGrid title="Anime" items={animeSearchResults} />
                )}
                {searchFilter === 'all' && mangaSearchResults.length > 0 && (
                  <MediaGrid title="Manga" items={mangaSearchResults} />
                )}

                {totalResults === 0 && (
                  <div className="py-16 text-center">
                    <h2 className="text-2xl font-bold">No results found for &quot;{query}&quot;</h2>
                    <p className="text-muted-foreground">Try a different search term.</p>
                  </div>
                )}
              </div>
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
              <ContinueWatching />
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
