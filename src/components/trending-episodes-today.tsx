import { fetchFromTMDB } from '@/lib/tmdb';
import { type TVShow, type Episode } from '@/lib/types';
import MediaCarousel from '@/components/media-carousel';
import { getSeoAnchorByIndex } from '@/components/recommended-movies-enhanced';

/**
 * Fetches trending episodes airing today/this week for TV shows.
 * Creates a "Trending Episodes Today" section with SEO-rich anchor texts.
 *
 * Strategy:
 * 1. Get trending TV shows
 * 2. For each show, fetch latest episode
 * 3. Filter to episodes aired in the last 7 days
 * 4. Sort by popularity/vote average
 * 5. Return enhanced items with SEO anchors
 */
export async function getTrendingEpisodesToday(limit = 10): Promise<
  Array<Episode & { series: TVShow; seoAnchors: string[] }>
> {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  try {
    // Get trending TV shows (popular this week)
    const trendingShows = await fetchFromTMDB('/trending/tv/week');

    const episodesWithSeries: Array<Episode & { series: TVShow }> = [];

    // Fetch latest episodes for each trending show (parallel, limited to avoid rate limits)
    const showPromises = trendingShows.slice(0, 20).map(async (show) => {
      if (!show.id) return null;

      try {
        const showDetails = await fetchFromTMDB(`/tv/${show.id}`, {
          append_to_response: 'external_ids',
        }) as unknown as TVShow;

        if (!showDetails?.seasons?.length) return null;

        // Get the latest season
        const latestSeason = showDetails.seasons.reduce(
          (latest, s) => (s.season_number > latest.season_number ? s : latest),
          showDetails.seasons[0]
        );

        if (!latestSeason?.season_number) return null;

        // Fetch episodes for the latest season
        const seasonDetails = await fetchFromTMDB(`/tv/${show.id}/season/${latestSeason.season_number}`) as unknown as { episodes: Episode[] };

        if (!seasonDetails?.episodes?.length) return null;

        // Find episodes aired in the last 7 days
        const recentEpisodes = seasonDetails.episodes.filter((ep: Episode) => {
          if (!ep.air_date) return false;
          const airDate = new Date(ep.air_date);
          return airDate >= sevenDaysAgo && airDate <= today;
        });

        if (recentEpisodes.length === 0) return null;

        // Return the most recent episode
        const latestEpisode = recentEpisodes.sort(
          (a: Episode, b: Episode) => new Date(b.air_date || 0).getTime() - new Date(a.air_date || 0).getTime()
        )[0];

        return { ...latestEpisode, series: showDetails };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(showPromises);
    episodesWithSeries.push(...results.filter((r): r is Episode & { series: TVShow } => r !== null));

    // Sort by vote average (quality signal) then by air date (recency)
    episodesWithSeries.sort((a, b) => {
      const voteDiff = (b.vote_average || 0) - (a.vote_average || 0);
      if (Math.abs(voteDiff) > 0.1) return voteDiff;
      return new Date(b.air_date || 0).getTime() - new Date(a.air_date || 0).getTime();
    });

    // Enhance with SEO anchors
    return episodesWithSeries.slice(0, limit).map((item, index) => ({
      ...item,
      seoAnchors: generateEpisodeSeoAnchors(item, index),
    }));
  } catch (error) {
    console.warn('[TrendingEpisodesToday] Failed to fetch:', error);
    return [];
  }
}

/**
 * Generate SEO-optimized anchor texts for an episode.
 * Targets long-tail queries like "Watch Breaking Bad S05E16 Felina 1080p free"
 */
function generateEpisodeSeoAnchors(
  episode: Episode & { series: TVShow },
  index: number
): string[] {
  const seriesName = episode.series.name;
  const episodeName = episode.name;
  const seasonNum = episode.season_number;
  const episodeNum = episode.episode_number;
  const year = episode.air_date ? new Date(episode.air_date).getFullYear() : null;
  const baseTitle = year ? `${seriesName} (${year})` : seriesName;
  const seasonLabel = `S${String(seasonNum).padStart(2, '0')}`;
  const episodeLabel = `E${String(episodeNum).padStart(2, '0')}`;
  const episodeCode = `${seasonLabel}${episodeLabel}`;

  const anchors = [
    // Watch variations (primary intent)
    `Watch ${baseTitle} ${episodeCode} ${episodeName} Free 1080p`,
    `Watch ${seriesName} ${episodeCode} ${episodeName} Online HD`,
    `Watch ${seriesName} Season ${seasonNum} Episode ${episodeNum} English Sub`,
    `Stream ${seriesName} ${episodeCode} ${episodeName} Free`,
    `Stream ${baseTitle} ${episodeName} HD Online`,

    // Download variations
    `${baseTitle} ${episodeCode} ${episodeName} Download 1080p`,
    `${seriesName} ${episodeCode} Free Download HD`,
    `${seriesName} Season ${seasonNum} Episode ${episodeNum} Direct Download`,

    // Long-tail informational
    `${seriesName} ${episodeCode} ${episodeName} Full Episode`,
    `${baseTitle} ${episodeName} Watch Online Free`,
    `${seriesName} Season ${seasonNum} Episode ${episodeNum} 1080p Stream`,
    `${episodeName} ${seriesName} ${episodeCode} Free HD`,

    // Air date specific
    episode.air_date ? `${seriesName} ${episodeCode} Aired ${episode.air_date} Watch Free` : '',
  ].filter(Boolean);

  return anchors;
}

/**
 * TrendingEpisodesToday - Server Component for watch pages.
 * Displays episodes that aired recently with rich anchor texts.
 */
export default async function TrendingEpisodesToday({ limit = 8 }: { limit?: number }) {
  const episodes = await getTrendingEpisodesToday(limit);

  if (episodes.length === 0) return null;

  // Transform to MediaCarousel compatible format
  const items = episodes.map((ep, index) => ({
    id: ep.id,
    title: ep.name,
    overview: ep.overview || `${ep.series.name} ${ep.season_number}x${ep.episode_number}`,
    poster_path: ep.still_path,
    backdrop_path: ep.still_path,
    vote_average: ep.vote_average || 0,
    vote_count: ep.vote_count || 0,
    first_air_date: ep.air_date,
    genre_ids: ep.series.genre_ids || [],
    genres: ep.series.genres?.map((g) => ({ id: g.id, name: g.name })) || [],
    seoAnchors: ep.seoAnchors,
    // Custom fields for episode display
    seriesName: ep.series.name,
    seasonNumber: ep.season_number,
    episodeNumber: ep.episode_number,
    airDate: ep.air_date,
  }));

  return (
    <section className="mt-16" aria-labelledby="trending-episodes-heading">
      <h2 id="trending-episodes-heading" className="mb-4 text-2xl font-bold tracking-tight text-foreground">
        Trending Episodes Today
      </h2>
      <p className="mb-6 text-sm text-muted-foreground max-w-2xl">
        Latest episodes from trending series. Updated daily with new releases in HD 1080p.
      </p>
      <MediaCarousel
        title=""
        items={items as any[]}
      />
    </section>
  );
}