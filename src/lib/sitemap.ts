import { fetchFromTMDB, fetchTVShowById } from './tmdb';
import { fetchFromAniList } from './anilist';
import type { Media } from './types';
import { SITE_URL } from './site';
import { animePath, dubPath, mangaPath, moviePath, subPath, tvPath, tvSeasonPath } from './routes';
import { GENRES, genrePath } from './genres';
import { DUB_LANGUAGES } from './languages';
import { episodePath } from './episode-slug';
import { catalogYears, yearPath } from './years';

/**
 * Programmatic-SEO sitemap: a sitemap **index** over paginated chunk sitemaps.
 *
 * ── Why an index ─────────────────────────────────────────────────────────────
 * A single sitemap may hold at most 50,000 URLs (and 50 MB uncompressed). The
 * target catalogue — 5,000 movies, 5,000 series, 5,000 anime, plus the watch and
 * download landing page for every episode of the most-searched titles — is well
 * past that. Past the limit Google stops reading the rest of the file and logs an
 * error, so the URLs that got cut are the ones that never get discovered.
 *
 * The index is the only structure that scales here: it stays a few kB regardless
 * of catalogue size, and each chunk stays small enough that the crawler parses and
 * fetches it without complaint.
 *
 * ── Why this is not `app/sitemap.ts` ─────────────────────────────────────────
 * Next.js 15.5's `sitemap.ts` can only emit a `<urlset>` — its serializer
 * (`resolveRouteData` → `resolveSitemap`) hard-codes that root element and has no
 * branch for `<sitemapindex>`, and `MetadataRoute.Sitemap` is typed as
 * `Array<{ url, ... }>` with no shape for child sitemaps. So the index and the
 * chunks are ordinary route handlers that serialise their own XML. That also lets
 * chunk ids be descriptive (`tv-episodes-3`) instead of opaque integers, so a
 * chunk name in a server log says what is actually in it.
 *
 * ── URL budget ───────────────────────────────────────────────────────────────
 * The caps below are what keep generation bounded. They are not arbitrary: TMDB
 * serves at most 400 rows per list request and AniList at most 50 per GraphQL
 * page, so 5,000 ids already costs ~13 requests per source. Episode expansion is
 * the genuinely expensive part — it needs one `/tv/{id}` per series for the title
 * and season list — so it is limited to the most popular titles, which is also
 * where nearly all episode-level search demand is.
 */

/** How many URLs go into one chunk. Well under both the 50k and 50 MB limits. */
export const CHUNK_SIZE = 2000;

/** Per-source id targets. */
const MOVIE_ID_TARGET = 5000;
const TV_ID_TARGET = 5000;
const ANIME_ID_TARGET = 5000;
const MANGA_ID_TARGET = 500;

/**
 * How far into the popularity ranking episode pages are generated. Episode URLs
 * are the bulk of the index, and each show costs a `/tv/{id}` detail call, so this
 * cap is what makes regeneration finish in seconds rather than minutes.
 *
 * Season pages reuse exactly this same set of shows — see `buildTvSeasonPaths` —
 * because the `/tv/{id}` call that lists the seasons is already being made here.
 * Emitting them from the same walk costs zero extra upstream requests, and it
 * guarantees an episode URL is never in the index without its season page.
 */
const TV_EPISODE_SHOWS = 80;
const ANIME_EPISODE_TITLES = 150;

/**
 * Per-title episode cap.
 *
 * TMDB long-runners run to several hundred episodes and One Piece alone has over
 * 1,000. Without a cap one title can outnumber a third of the catalogue, and the
 * tail episodes are the ones with no measurable search volume.
 */
const MAX_EPISODES_PER_SHOW = 120;

/** Anime runs long but not that long; the extra URLs buy nothing. */
const MAX_EPISODES_PER_ANIME = 60;

export type SitemapChunkKind =
  | 'static'
  | 'movies'
  | 'tv'
  | 'anime'
  | 'manga'
  | 'tv-seasons'
  | 'tv-episodes'
  | 'anime-episodes'
  | 'genres'
  | 'years'
  | 'dub';

export interface SitemapChunkRef {
  kind: SitemapChunkKind;
  /** 1-based. */
  page: number;
}

export type ChangeFrequency = 'hourly' | 'daily' | 'weekly' | 'yearly';

export interface SitemapEntry {
  path: string;
  changeFrequency?: ChangeFrequency;
  priority?: number;
}

const CHUNK_KINDS = new Set<SitemapChunkKind>([
  'static',
  'movies',
  'tv',
  'anime',
  'manga',
  'tv-seasons',
  'tv-episodes',
  'anime-episodes',
  'genres',
  'years',
  'dub',
]);

/** Public path of a chunk. The `.xml` suffix is part of the chunk id. */
export function chunkPath(ref: SitemapChunkRef): string {
  return `/sitemap/${ref.kind}-${ref.page}.xml`;
}

export function chunkUrl(ref: SitemapChunkRef): string {
  return `${SITE_URL.replace(/\/$/, '')}${chunkPath(ref)}`;
}

/**
 * Parses `movies-2.xml` back into a chunk ref, or `null` for anything unknown.
 *
 * `null` is the 404 path. The catch-all segment means `/sitemap/anything.xml`
 * reaches this handler, so an unrecognised id has to be rejected explicitly.
 */
export function parseChunkId(file: string | undefined): SitemapChunkRef | null {
  if (!file) return null;

  const match = /^([a-z-]+?)-(\d+)\.xml$/.exec(file);
  if (!match) return null;

  const [, kind, pageRaw] = match;
  if (!CHUNK_KINDS.has(kind as SitemapChunkKind)) return null;

  const page = Number.parseInt(pageRaw, 10);
  if (!Number.isFinite(page) || page < 1) return null;

  return { kind: kind as SitemapChunkKind, page };
}

/* ─────────────────────────── id collection ─────────────────────────── */

/** TMDB hard-caps every list endpoint at 400 rows regardless of `page`. */
const TMDB_PAGE_SIZE = 400;

async function fetchTmdbIds(endpoint: string, limit: number): Promise<number[]> {
  const ids: number[] = [];
  const pages = Math.ceil(limit / TMDB_PAGE_SIZE);

  for (let page = 1; page <= pages && ids.length < limit; page += 1) {
    const rows = await fetchFromTMDB(endpoint, { page: String(page) });

    // An empty page means we walked off the end of the list.
    if (!rows.length) break;

    for (const row of rows) {
      const id = row?.id;
      if (typeof id === 'number') ids.push(id);
    }
  }

  return ids.slice(0, limit);
}

/**
 * Merges several TMDB lists into one ordered id list.
 *
 * Order is preserved rather than sorted, because the endpoint order *is* the
 * relevance ranking — popular first, then trending, then top rated. Deduplicating
 * into a `Set` alone would have kept the same ids but thrown that ranking away,
 * and the ordering decides which titles land in the earlier, higher-priority
 * chunks.
 */
async function collectIds(endpoints: string[], limit: number): Promise<number[]> {
  const collected: number[] = [];
  const seen = new Set<number>();

  const lists = await Promise.all(
    endpoints.map((endpoint) => fetchTmdbIds(endpoint, limit).catch(() => [] as number[]))
  );

  for (const list of lists) {
    for (const id of list) {
      if (seen.has(id)) continue;
      seen.add(id);
      collected.push(id);
      if (collected.length >= limit) return collected;
    }
  }

  return collected;
}

const MOVIE_ENDPOINTS = [
  '/movie/popular',
  '/trending/movie/week',
  '/movie/top_rated',
  '/movie/now_playing',
];

const TV_ENDPOINTS = ['/tv/popular', '/trending/tv/week', '/tv/top_rated', '/tv/on_the_air'];

/** AniList caps a GraphQL page at 50 rows. */
const ANILIST_PAGE_SIZE = 50;

async function collectAniList(type: 'ANIME' | 'MANGA', limit: number): Promise<Media[]> {
  const sorts: string[][] = [
    ['POPULARITY_DESC'],
    ['TRENDING_DESC', 'POPULARITY_DESC'],
    ['SCORE_DESC', 'POPULARITY_DESC'],
  ];

  const collected: Media[] = [];
  const seen = new Set<number>();
  const pages = Math.ceil(limit / ANILIST_PAGE_SIZE);

  for (const sort of sorts) {
    for (let page = 1; page <= pages && collected.length < limit; page += 1) {
      const rows = await fetchFromAniList({ type, sort, perPage: ANILIST_PAGE_SIZE, page }).catch(
        () => [] as Media[]
      );

      if (!rows.length) break;

      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        collected.push(row);
        if (collected.length >= limit) return collected;
      }
    }
  }

  return collected;
}

/* ─────────────────────────── static routes ─────────────────────────── */

const STATIC_ROUTES: Array<{ path: string; changeFrequency: ChangeFrequency; priority: number }> = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/movies', changeFrequency: 'daily', priority: 0.9 },
  { path: '/tv', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/anime', changeFrequency: 'daily', priority: 0.9 },
  { path: '/manga', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/trending', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/indian-movies', changeFrequency: 'daily', priority: 0.9 },
  { path: '/indian-series', changeFrequency: 'daily', priority: 0.9 },
  { path: '/dub', changeFrequency: 'daily', priority: 0.8 },
  { path: '/sub', changeFrequency: 'daily', priority: 0.8 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/dmca', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/disclaimer', changeFrequency: 'yearly', priority: 0.3 },
];

/**
 * Pages that only render their first page of results.
 *
 * `?page=2` and beyond are reachable from the in-page pagination, but only the
 * bare URL is submitted. Google treats deep query-string pagination as crawlable
 * only when it is linked consistently, and a site that enumerates every page of
 * every genre/year landing spends its crawl budget on lists nobody searches for.
 * Page 1 is the one with the search intent behind it.
 */
function assertStaticRoutesExist(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = STATIC_ROUTES.filter((entry) => !STATIC_ROUTE_FILES.has(entry.path));
  if (missing.length) {
    throw new Error(
      `[sitemap] static route listed but not implemented: ${missing
        .map((entry) => entry.path)
        .join(', ')}`
    );
  }
}

const STATIC_ROUTE_FILES = new Set(STATIC_ROUTES.map((entry) => entry.path));

/* ─────────────────────────── catalogue ─────────────────────────── */

interface TvSeriesEntry {
  id: number;
  /** Only seasons that actually have episodes, in ascending order. */
  seasons: Array<{ number: number; episodes: number }>;
}

interface Catalog {
  movieIds: number[];
  tvIds: number[];
  anime: Media[];
  mangaIds: number[];
  tvSeasonPaths: string[];
  tvEpisodePaths: string[];
  animeEpisodePaths: string[];
}

let catalogPromise: Promise<Catalog> | null = null;

/**
 * The resolved catalogue, memoised for the life of the process.
 *
 * The index handler and every chunk handler need this, and the fetches behind it
 * are already cached for an hour — but re-collecting per chunk would turn one
 * regeneration into "collection × number of chunks" upstream requests.
 */
export function getCatalog(): Promise<Catalog> {
  catalogPromise ??= buildCatalog();
  return catalogPromise;
}

/** Drops the memoised catalogue. For tests and explicit re-reads only. */
export function resetCatalog(): void {
  catalogPromise = null;
}

async function buildCatalog(): Promise<Catalog> {
  assertStaticRoutesExist();

  /**
   * Every source is independently optional. A TMDB outage must degrade the
   * sitemap to whatever AniList answered rather than failing it: a thrown error
   * makes `/sitemap.xml` return 500, and Google responds to a broken sitemap by
   * dropping every URL in it — including the ones that were fine a minute ago.
   */
  const [movieIds, tvIds, anime, manga] = await Promise.all([
    collectIds(MOVIE_ENDPOINTS, MOVIE_ID_TARGET).catch(() => [] as number[]),
    collectIds(TV_ENDPOINTS, TV_ID_TARGET).catch(() => [] as number[]),
    collectAniList('ANIME', ANIME_ID_TARGET).catch(() => [] as Media[]),
    collectAniList('MANGA', MANGA_ID_TARGET).catch(() => [] as Media[]),
  ]);

  const series = await collectTvSeries(tvIds.slice(0, TV_EPISODE_SHOWS));

  return {
    movieIds,
    tvIds,
    anime,
    mangaIds: manga.map((media) => media.id),
    tvSeasonPaths: buildTvSeasonPaths(series),
    tvEpisodePaths: buildTvEpisodePaths(series),
    animeEpisodePaths: buildAnimeEpisodePaths(anime.slice(0, ANIME_EPISODE_TITLES)),
  };
}

/**
 * Season breakdowns for the shows that get episode pages generated.
 *
 * Season 0 is skipped: TMDB uses it for specials and behind-the-scenes extras,
 * which have no episode numbering anyone searches for, so each one would be a
 * page with nothing on it.
 *
 * This has to go through `fetchTVShowById`, not `fetchFromTMDB`. `/tv/{id}` is a
 * single-object endpoint with no `results` array, and `fetchFromTMDB` returns
 * `data.results || []` — so calling it here returns an empty list for every show
 * and silently produces zero episode URLs while the sitemap still looks healthy.
 * That is the worst possible failure shape: no error, no warning, just missing
 * pages.
 */
async function collectTvSeries(ids: number[]): Promise<TvSeriesEntry[]> {
  const shows = await Promise.all(
    ids.map(async (id) => {
      const show = await fetchTVShowById(id).catch(() => null);
      if (!show?.name || !show.seasons?.length) return null;

      const seasons = show.seasons
        .filter((season) => Number.isFinite(season.season_number) && season.season_number >= 1)
        .map((season) => ({
          number: season.season_number,
          /**
           * `episode_count` is what makes the expansion bounded. A show whose
           * season data omits it contributes nothing rather than an unbounded
           * range of invented URLs.
           */
          episodes: Number.isFinite(season.episode_count) && season.episode_count > 0
            ? Math.min(season.episode_count, MAX_EPISODES_PER_SHOW)
            : 0,
        }))
        .filter((season) => season.episodes > 0)
        .sort((a, b) => a.number - b.number);

      return seasons.length ? { id, seasons } : null;
    })
  );

  return shows.filter((show): show is TvSeriesEntry => show !== null);
}

/**
 * The season landing page for every season of every selected show.
 *
 * Built from the same `TvSeriesEntry[]` the episode walk uses, so the two cannot
 * disagree about which seasons exist — and no extra upstream request is needed,
 * because the season list came from the `/tv/{id}` call `collectTvSeries` already
 * made.
 *
 * Ordering matches the episode walk (show, then season ascending), which keeps a
 * given chunk stable between regenerations: an unstable order would shuffle URLs
 * across chunk boundaries on every rebuild, and Google re-fetches chunks whose
 * contents moved for no real reason.
 */
function buildTvSeasonPaths(series: TvSeriesEntry[]): string[] {
  const paths: string[] = [];

  for (const show of series) {
    for (const season of show.seasons) {
      paths.push(tvSeasonPath(show.id, season.number));
    }
  }

  return paths;
}

/**
 * Watch + download landing page for every episode of every selected show.
 *
 * Both intents are emitted because they are separately addressable routes with
 * separately worded titles, and only one of them is what a given searcher meant.
 */
function buildTvEpisodePaths(series: TvSeriesEntry[]): string[] {
  const paths: string[] = [];

  for (const show of series) {
    for (const season of show.seasons) {
      for (let episode = 1; episode <= season.episodes; episode += 1) {
        for (const intent of ['watch', 'download'] as const) {
          paths.push(
            episodePath({
              showType: 'tv',
              intent,
              id: show.id,
              seasonNumber: season.number,
              episodeNumber: episode,
            })
          );
        }
      }
    }
  }

  return paths;
}

function buildAnimeEpisodePaths(anime: Media[]): string[] {
  const paths: string[] = [];

  for (const media of anime) {
    if (!media.episodes || media.episodes <= 0) continue;

    const count = Math.min(media.episodes, MAX_EPISODES_PER_ANIME);

    for (let episode = 1; episode <= count; episode += 1) {
      for (const intent of ['watch', 'download'] as const) {
        paths.push(
          episodePath({
            showType: 'anime',
            intent,
            id: media.id,
            seasonNumber: 1,
            episodeNumber: episode,
          })
        );
      }
    }
  }

  return paths;
}

/* ─────────────────────────── chunks ─────────────────────────── */

/**
 * Every chunk that currently has content.
 *
 * A chunk is omitted when its slice is empty, which is why this runs the
 * collection instead of hardcoding `ceil(5000 / 2000) = 3` chunks per kind. An
 * upstream failure would otherwise leave the index pointing at empty chunks, and
 * Google logs those as errors before ignoring them.
 */
export async function buildSitemapChunks(): Promise<SitemapChunkRef[]> {
  const catalog = await getCatalog();
  const chunks: SitemapChunkRef[] = [{ kind: 'static', page: 1 }];

  const paginate = (kind: SitemapChunkKind, total: number) => {
    for (let page = 1; page <= Math.ceil(total / CHUNK_SIZE); page += 1) {
      chunks.push({ kind, page });
    }
  };

  paginate('movies', catalog.movieIds.length);
  paginate('tv', catalog.tvIds.length);
  paginate('anime', catalog.anime.length);
  paginate('manga', catalog.mangaIds.length);
  paginate('tv-seasons', catalog.tvSeasonPaths.length);
  paginate('tv-episodes', catalog.tvEpisodePaths.length);
  paginate('anime-episodes', catalog.animeEpisodePaths.length);
  paginate('genres', GENRES.length);
  paginate('years', catalogYears().length);
  paginate('dub', DUB_LANGUAGES.length);

  return chunks;
}

/** The URLs for one chunk. */
export async function buildSitemapEntries(ref: SitemapChunkRef): Promise<SitemapEntry[]> {
  const catalog = await getCatalog();

  switch (ref.kind) {
    case 'static':
      return staticEntries();

    case 'movies':
      return detailEntries(chunkSlice(catalog.movieIds.map(moviePath), ref));

    case 'tv':
      return detailEntries(chunkSlice(catalog.tvIds.map(tvPath), ref));

    case 'anime':
      return detailEntries(
        chunkSlice(
          catalog.anime.map((media) => animePath(media.id)),
          ref
        )
      );

    case 'manga':
      return detailEntries(chunkSlice(catalog.mangaIds.map(mangaPath), ref), 'weekly', 0.6);

    /**
     * Seasons sit one level above episodes, so they carry a slightly higher
     * priority: they are the page that ranks for "<show> season N", which is a
     * head term, while an episode URL is the long tail beneath it.
     */
    case 'tv-seasons':
      return detailEntries(chunkSlice(catalog.tvSeasonPaths, ref), 'weekly', 0.7);

    case 'tv-episodes':
      return episodeEntries(chunkSlice(catalog.tvEpisodePaths, ref));

    case 'anime-episodes':
      return episodeEntries(chunkSlice(catalog.animeEpisodePaths, ref));

    case 'genres':
      return detailEntries(
        chunkSlice(
          GENRES.map((genre) => genrePath(genre.slug)),
          ref
        ),
        'daily',
        0.7
      );

    case 'years':
      return detailEntries(
        chunkSlice(
          catalogYears().map(yearPath),
          ref
        ),
        'weekly',
        0.6
      );

    case 'dub':
      return detailEntries(
        chunkSlice(
          DUB_LANGUAGES.map((language) => dubPath(language.slug)),
          ref
        ),
        'daily',
        0.7
      );
  }
}

function chunkSlice<T>(values: T[], ref: SitemapChunkRef): T[] {
  const start = (ref.page - 1) * CHUNK_SIZE;
  return values.slice(start, start + CHUNK_SIZE);
}

function staticEntries(): SitemapEntry[] {
  return [
    ...STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
      path,
      changeFrequency,
      priority,
    })),
    ...GENRES.map((genre) => ({
      path: genrePath(genre.slug),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...catalogYears().map((year) => ({
      path: yearPath(year),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}

function detailEntries(
  paths: string[],
  changeFrequency: ChangeFrequency = 'daily',
  priority = 0.8
): SitemapEntry[] {
  return paths.map((path) => ({ path, changeFrequency, priority }));
}

/**
 * Episodes are `weekly`, not `daily`.
 *
 * A new episode airing does not change last season's episode 4, and telling
 * Google otherwise spends crawl visits re-fetching an unchanged page — which is
 * the same crawl budget the rest of the catalogue needs.
 */
function episodeEntries(paths: string[]): SitemapEntry[] {
  return detailEntries(paths, 'weekly', 0.6);
}

/* ─────────────────────────── XML ─────────────────────────── */

/**
 * XML text escaping.
 *
 * Required, not defensive: an unescaped `&` anywhere in a URL produces malformed
 * XML, and the parser rejects the whole chunk rather than the single bad entry —
 * so one slug with an ampersand would cost 2,000 URLs their discovery path.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * `<sitemapindex>` document.
 *
 * `lastmod` on a child is when the *child* was regenerated, which is not knowable
 * without per-chunk state. It is omitted rather than filled with the render time,
 * because a `lastmod` that moves on every request tells Google the whole index
 * churns continuously and it should re-fetch all of it.
 */
export function renderSitemapIndex(chunks: SitemapChunkRef[]): string {
  const body = chunks
    .map((ref) => `  <sitemap>\n    <loc>${escapeXml(chunkUrl(ref))}</loc>\n  </sitemap>`)
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</sitemapindex>',
    '',
  ].join('\n');
}

/** `<urlset>` document for one chunk. */
export function renderSitemapUrlset(entries: SitemapEntry[]): string {
  const origin = SITE_URL.replace(/\/$/, '');

  const body = entries
    .map((entry) => {
      const lines = [`    <loc>${escapeXml(`${origin}${entry.path}`)}</loc>`];
      if (entry.changeFrequency) lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      if (typeof entry.priority === 'number') {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${lines.join('\n')}\n  </url>`;
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Total URLs the index describes.
 *
 * Exported for the health endpoint and for anyone debugging why a chunk count
 * changed — it is the number that matters against the 50,000-per-file and
 * 50,000-per-index limits.
 */
export async function totalSitemapUrls(): Promise<number> {
  const catalog = await getCatalog();

  return (
    staticEntries().length +
    catalog.movieIds.length +
    catalog.tvIds.length +
    catalog.anime.length +
    catalog.mangaIds.length +
    catalog.tvSeasonPaths.length +
    catalog.tvEpisodePaths.length +
    catalog.animeEpisodePaths.length
  );
}