/**
 * Deterministic, keyword-bearing slugs for episode URLs.
 *
 * ── WHY THE SLUG IS JUST THE KEYWORDS ────────────────────────────────────────
 * The obvious design is a title-bearing slug (`breaking-bad-s01e01-pilot-…`), but
 * the title only exists upstream. That makes the canonical URL impossible to know
 * without a TMDB/AniList call, and the call can only happen while rendering —
 * where it is too late for a real HTTP redirect. Verified against a production
 * build: `permanentRedirect()` from the page component returned **200** with a
 * client-side navigation, not a 308, because the root layout's shell has already
 * been flushed by the time the page runs. Same reason `notFound()` soft-404s.
 *
 * So the canonical slug is derived **only from the URL itself** — the numbers in
 * the path plus the intent. Middleware can compute it on the edge, before
 * rendering, and answer with a real 301 or 404. That is what makes the URL
 * contract enforceable:
 *
 *   - exactly one crawlable URL per episode, with a real 301 from every variant
 *   - a real 404 for every malformed probe, instead of a 200 empty page
 *   - slugs that never change, because nothing upstream can affect them
 *
 * The series and episode names still go in the `<title>`, the `<h1>` and the
 * JSON-LD, which is where Google actually reads them. The URL keeps the words
 * that describe the *experience* (`watch-online-free-1080p`, `english-sub`),
 * which is the part a slugifier could never derive from an id anyway.
 */

/** Longest slug we will emit. Beyond this, URLs get truncated in the SERP. */
const MAX_SLUG_LENGTH = 110;

export type EpisodeShowType = 'tv' | 'anime';
export type EpisodeIntent = 'watch' | 'download';

export interface EpisodeSlugInput {
  showType: EpisodeShowType;
  seasonNumber: number;
  episodeNumber: number;
  intent: EpisodeIntent;
}

/**
 * Lowercases, strips diacritics, and reduces everything that is not a letter or
 * digit to a single hyphen.
 *
 * Still used for the *caller-supplied* slug comparison (so an incoming URL with
 * accents or uppercase collapses onto the same canonical form) and for any future
 * title-bearing path.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    // Drop the combining marks NFKD leaves behind, so "Pokémon" → `pokemon`
    // rather than `pokmon`.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The season/episode label, in the form people actually type.
 *
 * `S01E02` for TV. Anime has no numbered seasons and AniList has no per-episode
 * titles, so an anime episode that rendered "S01E01 Episode 1" was repeating itself
 * while pushing the series name out of a truncated SERP title.
 */
export function episodeLabel(
  showType: EpisodeShowType,
  seasonNumber: number,
  episodeNumber: number
): string {
  if (showType === 'anime') return `Episode ${episodeNumber}`;
  return `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
}

/** The slug's leading identifier. Lower-case so it matches `slugify` output. */
function labelSlug(showType: EpisodeShowType, seasonNumber: number, episodeNumber: number): string {
  return showType === 'anime'
    ? `episode-${episodeNumber}`
    : `s${String(seasonNumber).padStart(2, '0')}e${String(episodeNumber).padStart(2, '0')}`;
}

/**
 * The keyword tail. Kept after the label so a length trim can never drop the
 * words that carry the search intent.
 *
 * Download uses the same wording for TV and anime because there is no separate
 * anime download phrasing people search for. Watch does differ, because
 * "english-sub" is an anime-specific query and padding it onto a Breaking Bad
 * episode URL would misrepresent the content.
 */
function intentSuffix(showType: EpisodeShowType, intent: EpisodeIntent): string {
  if (intent === 'download') return 'download-1080p-free';
  return showType === 'anime' ? 'watch-online-english-sub-free' : 'watch-online-free-1080p';
}

/**
 * The one canonical slug for an episode, derived from the URL alone.
 *
 *   tv     → `s01e01-watch-online-free-1080p`
 *   anime  → `episode-1-watch-online-english-sub-free`
 *
 *   /watch/tv/1399/season-1/episode-1/s01e01-watch-online-free-1080p
 *   /watch/anime/16498/episode-1/episode-1-watch-online-english-sub-free
 *
 * Pure function of its four inputs, which is the whole point: middleware can
 * rebuild this from an incoming request path without touching an upstream API, so
 * every variant redirect is a real 301 rather than a client-side hop.
 */
export function buildEpisodeSlug(input: EpisodeSlugInput): string {
  const { showType, seasonNumber, episodeNumber, intent } = input;
  return `${labelSlug(showType, seasonNumber, episodeNumber)}-${intentSuffix(showType, intent)}`;
}

export interface EpisodePathInput extends EpisodeSlugInput {
  /** TMDB id for TV, AniList id for anime. */
  id: number | string;
}

/**
 * Full canonical path for an episode, used for `alternates.canonical`, internal
 * links, JSON-LD `url`, IndexNow and the sitemap. All five read from here, so they
 * cannot disagree about which address is the real one.
 */
export function episodePath(input: EpisodePathInput): string {
  const { id, showType, intent, seasonNumber, episodeNumber } = input;
  const slug = buildEpisodeSlug(input);

  if (showType === 'anime') {
    return `/${intent}/anime/${id}/episode-${episodeNumber}/${slug}`;
  }

  return `/${intent}/tv/${id}/season-${seasonNumber}/episode-${episodeNumber}/${slug}`;
}

/** Parsed shape of an episode URL. `null` when the path is not a valid one. */
export interface ParsedEpisodePath {
  intent: EpisodeIntent;
  showType: EpisodeShowType;
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  slug: string;
}

/**
 * Parses an episode path into its parts and the canonical slug for it.
 *
 * Returns `null` for anything that cannot be a valid episode URL, which is the
 * 404 path. Validating here rather than in each of the four route files means the
 * four cannot drift on what "valid" means.
 *
 * Bounds are checked here as well (`MAX_SEASON`, `MAX_EPISODE`). They are generous
 * static ceilings, not the real ones — the real count is only known upstream, and
 * middleware cannot ask. Their job is to stop a crawler probing
 * `episode-999999` from minting a fresh renderable URL each time; the page's own
 * `notFound()` still catches anything inside the bound that does not exist.
 */
const MAX_SEASON = 30;
const MAX_EPISODE = 2000;

/**
 * The season ceiling, exported for the middleware season guard.
 *
 * It is deliberately the same constant the episode parser uses rather than a
 * second copy: a season URL that passes the middleware guard must also pass
 * `parseEpisodePath`, and two independently-tuned numbers would eventually
 * disagree, producing a season page whose own episode links 404.
 */
export { MAX_SEASON };

export function parseEpisodePath(pathname: string): ParsedEpisodePath | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length < 5) return null;

  const [intent, type, idRaw] = segments;

  if (type !== 'tv' && type !== 'anime') return null;
  if (intent !== 'watch' && intent !== 'download') return null;

  const showType: EpisodeShowType = type;

  /**
   * The two families have different shapes, and getting this wrong 404s the
   * canonical URL against itself:
   *
   *   tv     /watch/tv/1399/season-1/episode-1/s01e01-watch-online-free-1080p   (6)
   *   anime  /watch/anime/16498/episode-1/episode-1-watch-online-english-sub-free (5)
   *
   * Anime has no season level in its URL because it has no season level in its
   * data — AniList exposes an episode count, not seasons. A stray `season-1`
   * segment on an anime URL is tolerated and redirected away, but any other season
   * number is a malformed URL and gets a real 404.
   */
  const rest = segments.slice(3);
  let seasonRaw: string | undefined;
  let episodeRaw: string;
  let slug: string;

  if (showType === 'anime') {
    if (rest.length === 3 && /^season-\d+$/.test(rest[0])) {
      if (rest[0] !== 'season-1') return null;
      seasonRaw = rest[0];
      [episodeRaw, slug] = rest.slice(1);
    } else if (rest.length === 2) {
      [episodeRaw, slug] = rest;
    } else {
      return null;
    }
  } else {
    if (rest.length !== 3) return null;
    [seasonRaw, episodeRaw, slug] = rest;
  }

  // A slug can only contain what `slugify` emits, and must be exactly one segment.
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;

  const id = Number.parseInt(idRaw, 10);
  if (!/^\d+$/.test(idRaw) || !Number.isFinite(id) || id < 1) return null;

  let seasonNumber = 1;
  let episodeNumber: number;

  if (showType === 'anime') {
    const match = /^episode-(\d+)$/.exec(episodeRaw);
    if (!match) return null;
    episodeNumber = Number.parseInt(match[1], 10);
  } else {
    const seasonMatch = /^season-(\d+)$/.exec(seasonRaw ?? '');
    const episodeMatch = /^episode-(\d+)$/.exec(episodeRaw);
    if (!seasonMatch || !episodeMatch) return null;
    seasonNumber = Number.parseInt(seasonMatch[1], 10);
    episodeNumber = Number.parseInt(episodeMatch[1], 10);
  }

  if (!Number.isFinite(seasonNumber) || seasonNumber < 1 || seasonNumber > MAX_SEASON) return null;
  if (!Number.isFinite(episodeNumber) || episodeNumber < 1 || episodeNumber > MAX_EPISODE) {
    return null;
  }

  return { intent, showType, id, seasonNumber, episodeNumber, slug };
}

/** Whether the slug in a parsed path is the canonical one for those numbers. */
export function episodeSlugIsCanonical(parsed: ParsedEpisodePath): boolean {
  return (
    parsed.slug === buildEpisodeSlug({
      showType: parsed.showType,
      intent: parsed.intent,
      seasonNumber: parsed.seasonNumber,
      episodeNumber: parsed.episodeNumber,
    })
  );
}

/**
 * The canonical path for a parsed episode URL.
 *
 * Returns `null` for a path that is not a valid episode URL, so callers can 404
 * without a second parsing pass.
 */
export function canonicalEpisodePath(pathname: string): string | null {
  const parsed = parseEpisodePath(pathname);
  if (!parsed) return null;

  return episodePath({
    id: parsed.id,
    showType: parsed.showType,
    intent: parsed.intent,
    seasonNumber: parsed.seasonNumber,
    episodeNumber: parsed.episodeNumber,
  });
}