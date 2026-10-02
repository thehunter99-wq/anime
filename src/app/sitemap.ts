import { type MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';
import { moviePath, animePath, tvPath, mangaPath } from '@/lib/routes';
import {
  fetchPopularMovies,
  fetchTrendingMovies,
  fetchNowPlayingMovies,
  fetchPopularTv,
  fetchTrendingTv,
  fetchAnimeTv,
} from '@/lib/tmdb';
import { fetchFromAniList } from '@/lib/anilist';

/**
 * Six hours. Trending and now-playing lists turn over daily, so a shorter window
 * than the 24h previously used keeps the sitemap fresh enough to signal
 * relevance without hammering TMDB on every regeneration.
 */
export const revalidate = 21600;

const now = new Date();

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
  { url: `${SITE_URL}/tv`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
  { url: `${SITE_URL}/indian-movies`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  { url: `${SITE_URL}/indian-series`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /**
   * Every list is fetched concurrently, and each one is optional: a TMDB outage
   * degrades the sitemap to whatever sources answered instead of failing the
   * whole generation and dropping every URL from the index.
   */
  const [
    popularMovies,
    trendingMovies,
    nowPlayingMovies,
    popularTv,
    trendingTv,
    animeTv,
    animeList,
    mangaList,
  ] = await Promise.all([
    fetchPopularMovies().catch(() => []),
    fetchTrendingMovies().catch(() => []),
    fetchNowPlayingMovies().catch(() => []),
    fetchPopularTv().catch(() => []),
    fetchTrendingTv().catch(() => []),
    fetchAnimeTv().catch(() => []),
    fetchFromAniList({ sort: ['POPULARITY_DESC'], perPage: 200 }).catch(() => []),
    fetchFromAniList({ type: 'MANGA', sort: ['POPULARITY_DESC'], perPage: 100 }).catch(() => []),
  ]);

  /**
   * De-duplication matters here. A film that is popular AND now-playing would
   * otherwise appear twice, and duplicate sitemap entries waste crawl budget and
   * make the file look spammy to Google.
   */
  const movieIds = new Set<number>();
  for (const movie of [...popularMovies, ...trendingMovies, ...nowPlayingMovies]) {
    if (movie?.id) movieIds.add(movie.id);
  }

  const tvIds = new Set<number>();
  for (const show of [...popularTv, ...trendingTv]) {
    if (show?.id) tvIds.add(show.id);
  }

  const animeIds = new Set<number>();
  for (const show of animeTv) {
    if (show?.id) animeIds.add(show.id);
  }

  const movieEntries: MetadataRoute.Sitemap = [...movieIds].map((id) => ({
    url: `${SITE_URL}${moviePath(id)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const tvEntries: MetadataRoute.Sitemap = [...tvIds].map((id) => ({
    url: `${SITE_URL}${tvPath(id)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const animeEntries: MetadataRoute.Sitemap = [...animeIds].map((id) => ({
    url: `${SITE_URL}${animePath(id)}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // AniList ids for both anime and manga; the AniList feed is the authoritative
  // source for these, TMDB's Japanese-language TV list is only a supplement.
  const anilistEntries: MetadataRoute.Sitemap = [...animeList, ...mangaList]
    .filter((item) => item?.id)
    .map((item) => {
      const path =
        item.type.toUpperCase() === 'MANGA' ? mangaPath(item.id) : animePath(item.id);
      return {
        url: `${SITE_URL}${path}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      };
    });

  /**
   * Final de-duplication across every source, because the TMDB anime list and
   * the AniList feed can both contribute `/anime/...` URLs for the same show
   * under different ids — those are genuinely different URLs, so the only safe
   * merge is on the finished path.
   */
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of [
    ...STATIC_ROUTES,
    ...movieEntries,
    ...tvEntries,
    ...animeEntries,
    ...anilistEntries,
  ]) {
    byUrl.set(entry.url, entry);
  }

  return [...byUrl.values()];
}
