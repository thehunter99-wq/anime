import type { Metadata } from 'next';

import { SITE_NAME } from './site';
import { absoluteUrl } from './routes';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://movanime.site';

/**
 * Builds the dynamic OG image URL for social sharing.
 * Uses /api/og endpoint with @vercel/og for on-demand generation.
 */
export function buildOgImageUrl(options: {
  title: string;
  poster?: string | null;
  type?: 'movie' | 'tv' | 'anime';
  rating?: number | null;
  quality?: string;
  year?: number | null;
}): string {
  const params = new URLSearchParams();
  params.set('title', options.title);
  if (options.poster) params.set('poster', options.poster);
  if (options.type) params.set('type', options.type);
  if (options.rating != null && options.rating > 0) params.set('rating', String(options.rating));
  if (options.quality) params.set('quality', options.quality);
  if (options.year) params.set('year', String(options.year));
  
  return `${SITE_URL}/api/og?${params.toString()}`;
}

/**
 * Title/description/OG builders for TMDB-backed detail pages.
 *
 * ── ON THE BRAND SUFFIX ─────────────────────────────────────────────────────
 * The requested format ends in "- MovAnime". Rather than hardcoding that string
 * here, `SITE_NAME` is used, so one constant drives the title suffix, `og:siteName`,
 * the header, the footer and the legal pages. They cannot disagree, and a future
 * rebrand is a one-line change instead of a grep across templates.
 */

/**
 * Title format, uniform across films, series and anime:
 *
 *   Watch [Title] ([Year]) Full HD Online Free - MovAnime
 *
 * One format for all three is deliberate. Splitting it per type produced titles
 * like "Full Movie HD Free" and "Full HD Free", which differ only in filler and
 * fragment the click-through rate; the intent term a user actually types is
 * already present in both, so the extra variation bought nothing.
 *
 * Year is dropped when TMDB has no release date rather than rendering "undefined".
 */
export function buildWatchTitle(options: {
  title: string;
  year?: number | null;
  /** Kept for call-site compatibility; the format is intentionally uniform. */
  isSeries?: boolean;
}): string {
  const { title, year } = options;
  const yearPart = year ? ` (${year})` : '';
  return `Watch ${title}${yearPart} Full HD Online Free - ${SITE_NAME}`;
}

/**
 * Description, leading with the exact high-intent phrasing the brief specifies
 * and then filling the remainder with TMDB's own synopsis.
 *
 * The synopsis is capped and trimmed on a word boundary so the sentence never
 * ends mid-word, which reads as machine-generated and lowers click-through.
 * The "movie"/"anime" noun is switched by `isSeries` so series pages do not claim
 * to be a single film.
 */
/**
 * Google renders roughly the first 155-160 characters of a meta description and
 * cuts mid-word beyond that, which reads as broken text in the SERP. The
 * requested lead sentence already consumes ~120 of those characters, so the
 * synopsis is treated as a fixed budget rather than an append-whatever-fits
 * afterthought.
 *
 * Truncation prefers a real sentence boundary; failing that it falls back to a
 * word boundary, and drops trailing function words ("by the", "and of") that
 * would leave the snippet visibly unfinished.
 */
function synopsisSnippet(overview: string | null | undefined, budget: number): string {
  if (budget < 40) return '';

  // TMDB overviews arrive with HTML; stripping tags keeps the snippet readable
  // in the SERP instead of printing markup.
  const text = (overview ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  if (text.length <= budget) return text;

  const window = text.slice(0, budget);

  // Prefer the last sentence end inside the budget.
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
  if (sentenceEnd > budget * 0.5) return window.slice(0, sentenceEnd + 1);

  let clipped = window.replace(/\s+\S*$/, '');

  // Strip trailing function words so the snippet does not end on "the".
  const dangling = /\s+(?:a|an|the|and|or|but|of|in|on|at|to|for|from|by|with|as|is|was|were|are|that|which|who|it|its|his|her|their|he|she|they)$/i;
  let previous;
  do {
    previous = clipped;
    clipped = clipped.replace(dangling, '');
  } while (clipped !== previous && clipped.length);

  return `${clipped.replace(/[\s,;:.\-]+$/, '')}…`;
}

export function buildDescription(options: {
  title: string;
  year?: number | null;
  overview?: string | null;
  isSeries?: boolean;
}): string {
  const { title, year, overview, isSeries = false } = options;
  const noun = isSeries ? 'anime' : 'movie';
  const yearPart = year ? ` (${year})` : '';

  const base = `Watch ${title}${yearPart} full ${noun} online free in HD 1080p, English Subbed/Dubbed. Fast streaming on ${SITE_NAME}.`;

  // One character is held back for the ellipsis `synopsisSnippet` may append,
  // so the final description never crosses the 160-character display limit.
  const snippet = synopsisSnippet(overview, 159 - base.length);
  return snippet ? `${base} ${snippet}` : base;
}

export interface DetailMetadataInput {
  title: string;
  overview?: string | null;
  year?: number | null;
  genres?: string[];
  image?: string | null;
  /** Canonical path, e.g. `/movie/550`. */
  path: string;
  siteUrl: string;
  isSeries?: boolean;
  isAnime?: boolean;
}

/**
 * Full metadata for a detail page: title, high-intent description, canonical
 * URL, OpenGraph and Twitter cards.
 *
 * The OG type is `video.movie` for films and `video.episode` for series, which
 * is what makes these eligible for the video carousel in search results. Images
 * fall back through backdrop -> poster -> the generated brand card, so a title
 * with no artwork still produces a valid, non-broken preview.
 */
export function buildDetailMetadata(input: DetailMetadataInput): Metadata {
  const {
    title,
    overview,
    year,
    genres = [],
    image,
    path,
    siteUrl,
    isSeries = false,
    isAnime = false,
  } = input;

  const pageTitle = buildWatchTitle({ title, year, isSeries });
  const description = buildDescription({ title, year, overview, isSeries });
  const canonical = absoluteUrl(path, siteUrl);

  // Use dynamic OG image generation with fallback to TMDB image
  const posterUrl = image ?? undefined;
  const ogImageUrl = buildOgImageUrl({
    title,
    poster: posterUrl,
    type: isAnime ? 'anime' : isSeries ? 'tv' : 'movie',
    year: year ?? undefined,
  });

  const images = [
    { url: ogImageUrl, width: 1200, height: 630, alt: `${title} - ${SITE_NAME}` },
    ...(posterUrl ? [{ url: posterUrl, width: 1280, height: 720, alt: `${title} poster` }] : []),
  ];

  return {
    title: { absolute: pageTitle },
    description,
    alternates: { canonical },
    openGraph: {
      type: isSeries ? 'video.episode' : 'video.movie',
      siteName: SITE_NAME,
      title: pageTitle,
      description,
      url: canonical,
      locale: 'en_US',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [ogImageUrl],
    },
    other: year
      ? { 'article:published_time': `${year}-01-01` }
      : undefined,
  };
}

/* ─────────────────────────── JSON-LD ─────────────────────────── */

export interface RatingSource {
  /** TMDB vote average, 0-10. */
  voteAverage?: number | null;
  /** TMDB vote count. */
  voteCount?: number | null;
}

/**
 * Builds schema.org `Movie` or `TVSeries`.
 *
 * ── ON aggregateRating ───────────────────────────────────────────────────────
 * Google treats `aggregateRating` as a claim about the ratings shown on *that
 * page*, and reserves it as a rich-result eligible star rating. Emitting it
 * without real on-page ratings is a structured-data policy violation and can
 * trigger a manual action, which is far more damaging than missing stars.
 *
 * So two rules are enforced together: the rating must come from the upstream the
 * page actually displays, and the page must actually display it. `<RatingBadge>`
 * renders the identical TMDB/AniList numbers that these functions receive, so
 * the structured data and the visible content can never disagree.
 *
 * Verified against Google's Rich Results Test on a detail page.
 * ────────────────────────────────────────────────────────────────────────────
 */
export function buildMediaJsonLd(options: {
  type: 'Movie' | 'TVSeries';
  title: string;
  description?: string | null;
  image?: string | null;
  url: string;
  datePublished?: string | null;
  genres?: string[];
  rating?: RatingSource | null;
  /** Number of seasons, for TVSeries. */
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
}): Record<string, unknown> {
  const {
    type,
    title,
    description,
    image,
    url,
    datePublished,
    genres = [],
    rating,
    numberOfSeasons,
    numberOfEpisodes,
  } = options;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    name: title,
    url,
  };

  if (description) schema.description = description.trim().slice(0, 500);
  if (image) schema.image = image;
  if (datePublished) schema.datePublished = datePublished;
  if (genres.length) schema.genre = genres;
  if (type === 'TVSeries') {
    schema.inLanguage = 'en';
    if (numberOfSeasons != null) schema.numberOfSeasons = numberOfSeasons;
    if (numberOfEpisodes != null) schema.numberOfEpisodes = numberOfEpisodes;
  }

  // Omitted unless real, visible ratings are supplied. See the note above.
  if (rating && rating.voteAverage != null && rating.voteCount) {
    // ── Scale consistency ─────────────────────────────────────────────────────
    // Both TMDB and AniList publish on a 0-10 scale. A previous version emitted
    // the raw 10-point value while declaring `bestRating: 5`, which is
    // self-contradictory (a ratingValue above its own bestRating) and is exactly
    // the kind of thing the Rich Results Test flags as invalid.
    //
    // Rather than halving the value — which loses precision on something Google
    // displays as a star rating — the scale is declared honestly as 1-10. Google
    // accepts any consistent scale and renders the stars itself.
    const average = Number(rating.voteAverage);
    if (Number.isFinite(average) && average > 0) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(average.toFixed(1)),
        bestRating: 10,
        worstRating: 1,
        ratingCount: rating.voteCount,
      };
    }
  }

  return schema;
}

/* ─────────────────────────── VideoObject ─────────────────────────── */

/**
 * schema.org `VideoObject` for a title's watch surface.
 *
 * ── Honest scope, read before shipping ──────────────────────────────────────
 * This markup is structurally valid and will pass the Rich Results Test, but it
 * will **not** earn a video rich result in practice, because Google requires the
 * video to be hosted on a crawlable page of your own domain. Two hard blockers
 * apply today:
 *
 *  1. The actual player is a third-party iframe (vidsrc/vidlink/2embed). The
 *     site does not host the media file, so `contentUrl` is deliberately
 *     omitted — asserting a `contentUrl` we cannot serve would be a false claim
 *     and a guideline violation.
 *  2. `robots.txt` disallows `/view/`, so the page where the video plays cannot
 *     be crawled at all.
 *
 * `embedUrl` therefore points at our own watch URL, which is the page that
 * actually carries the embed. Earning the rich result requires allowing
 * `/view/` in robots.txt and rendering the player without `noindex`; both are
 * one-line changes and are documented in the deployment notes rather than made
 * silently here, because opening the player to crawlers has its own tradeoffs.
 *
 * `uploadDate` uses the release/first-air date. It is a known approximation of
 * "when the video was published", and is the standard practice for catalogue
 * streaming pages where there is no real upload timestamp.
 */
export function buildVideoObject(options: {
  name: string;
  description?: string | null;
  /** Absolute URL to the poster or backdrop used as the video thumbnail. */
  thumbnailUrl?: string | null;
  /** ISO-8601 date, e.g. 2010-07-16. */
  uploadDate?: string | null;
  /** Absolute URL of the page carrying the embed, on this domain. */
  embedUrl: string;
  /** ISO-8601 duration, `PT1H58M`. Omitted when unknown. */
  duration?: string | null;
  isFamilyFriendly?: boolean;
}): Record<string, unknown> {
  const {
    name,
    description,
    thumbnailUrl,
    uploadDate,
    embedUrl,
    duration,
    isFamilyFriendly = false,
  } = options;

  const video: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    embedUrl,
  };

  // Google requires name, description, thumbnailUrl and uploadDate for a Video
  // result, so a node missing the mandatory ones is skipped rather than emitted
  // as an invalid partial entity.
  if (!description || !thumbnailUrl || !uploadDate) return {};

  video.description = description;
  video.thumbnailUrl = thumbnailUrl;
  video.uploadDate = uploadDate;

  if (duration) video.duration = duration;
  video.isFamilyFriendly = isFamilyFriendly;

  return video;
}

/* ─────────────────────────── BreadcrumbList ─────────────────────────── */

export interface BreadcrumbInput {
  siteUrl: string;
  /** e.g. "Movies", "TV Shows", "Anime". */
  sectionName: string;
  /** Absolute URL of the section listing the title belongs to. */
  sectionUrl: string;
  /** Current page's title. Rendered as a crumb with no `item`, per Google's guidance. */
  title: string;
}

/**
 * schema.org `BreadcrumbList` for a detail page: Home > Section > Title.
 *
 * The final crumb carries a name but no `item`. That is deliberate and is what
 * Google specifies for the page the breadcrumb is *on* — declaring the current
 * page's own URL as a breadcrumb target tells the crawler the trail ends
 * somewhere else, and the Rich Results Test flags it.
 *
 * `sectionUrl` is passed in rather than derived, because the correct parent
 * differs per section: `/tv` and `/manga` are real index routes, while movies
 * and anime only exist as a home-page tab (`/?tab=movies`). Guessing it here
 * would have produced 404s for half the catalogue.
 */
export function buildBreadcrumbList(input: BreadcrumbInput): Record<string, unknown> {
  const { siteUrl, sectionName, sectionUrl, title } = input;
  const root = siteUrl.replace(/\/$/, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${root}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: sectionName,
        item: sectionUrl,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
      },
    ],
  };
}

/**
 * Builds FAQ schema for detail pages.
 * These are common questions users search for.
 */
export function buildFAQSchema(options: {
  title: string;
  year?: number | null;
  isSeries: boolean;
  isAnime?: boolean;
}): Record<string, unknown> {
  const { title, year, isSeries, isAnime = false } = options;
  const yearPart = year ? ` (${year})` : '';
  const noun = isSeries ? (isAnime ? 'anime' : 'series') : 'movie';
  const watchVerb = isSeries ? 'watch' : 'watch';
  const episodeTerm = isAnime ? 'episode' : (isSeries ? 'episode' : '');

  const faqs = [
    {
      question: `Where can I ${watchVerb} ${title}${yearPart} online for free?`,
      answer: `You can ${watchVerb} ${title}${yearPart} online for free on ${SITE_NAME}. We offer HD streaming with English subtitles and dubbed audio options. No registration required.`,
    },
    {
      question: `Is ${title}${yearPart} available in English dub?`,
      answer: `Yes, ${title}${yearPart} is available with English dub and English subtitles on ${SITE_NAME}. You can switch between sub and dub using the audio selector in the player.`,
    },
    {
      question: `Can I download ${title}${yearPart} in 1080p?`,
      answer: `${title}${yearPart} can be streamed in up to 1080p HD quality. For download options, use the download buttons on the detail page which link to high-speed mirrors.`,
    },
    {
      question: `How many ${episodeTerm}s does ${title}${yearPart} have?`,
      answer: `${title}${yearPart} has multiple ${isSeries ? 'episodes/seasons' : ''} available for streaming. Check the episode list on the watch page for the complete count.`,
    },
    {
      question: `Is ${SITE_NAME} legal and safe to use?`,
      answer: `${SITE_NAME} aggregates content from third-party sources. We do not host any media files. Please check your local laws regarding streaming copyrighted content. Use a VPN for privacy.`,
    },
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/* ─────────────────────────── TVEpisode ─────────────────────────── */

export interface EpisodeMetadataInput {
  seriesTitle: string;
  seriesName: string;
  episodeName: string;
  episodeNumber: number;
  seasonNumber: number;
  overview?: string | null;
  airDate?: string | null;
  stillPath?: string | null;
  episodeUrl: string;
  siteUrl: string;
  seriesUrl: string;
  showType: 'tv' | 'anime';
  /**
   * Which of the two episode surfaces this is. `/watch/...` and `/download/...`
   * serve the same episode to different search intents, so they must not emit
   * the same `<title>`; defaulting both to the watch wording made the download
   * pages compete with their own watch twin.
   */
  intent?: 'watch' | 'download';
  /** Absolute banner/cover used when TMDB has no episode still. Anime only. */
  image?: string | null;
}

/**
 * Season/episode label used in titles and headings.
 *
 * `S01E02` is what people type for a TV series, so it is kept verbatim. Anime
 * almost never has numbered seasons, and AniList has no episode titles at all,
 * so an anime page that rendered "S01E01 Episode 1" was repeating itself while
 * pushing the actual series name further out of a truncated SERP title.
 */
export function episodeLabel(
  showType: 'tv' | 'anime',
  seasonNumber: number,
  episodeNumber: number
): string {
  if (showType === 'anime') return `Episode ${episodeNumber}`;
  return `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
}

/**
 * Builds schema.org `TVEpisode` for a specific episode page.
 *
 * This is the schema that tells Google exactly which season/episode a URL
 * represents. It is emitted for anime too: schema.org has no separate "anime
 * episode" type, and `TVEpisode` is what Google's video documentation accepts
 * for episodic content of any origin.
 */
export function buildTVEpisodeJsonLd(options: EpisodeMetadataInput): Record<string, unknown> {
  const {
    seriesName,
    episodeName,
    episodeNumber,
    seasonNumber,
    overview,
    airDate,
    stillPath,
    episodeUrl,
    siteUrl,
    seriesUrl,
    showType,
    image,
  } = options;

  const label = episodeLabel(showType, seasonNumber, episodeNumber);
  const fullTitle = `${seriesName} ${label} ${episodeName}`.trim();
  const thumbnailUrl = stillPath
    ? `https://image.tmdb.org/t/p/w780${stillPath}`
    : (image ?? undefined);

  const episode: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TVEpisode',
    name: fullTitle,
    episodeNumber,
    // Anime has no season numbering; emitting `seasonNumber: 1` on every anime
    // episode would be a fabricated claim, so it is left off entirely.
    ...(showType === 'anime' ? {} : { seasonNumber }),
    partOfSeries: {
      '@type': 'TVSeries',
      name: seriesName,
      url: absoluteUrl(seriesUrl, siteUrl),
    },
    url: absoluteUrl(episodeUrl, siteUrl),
  };

  if (overview) episode.description = overview.trim().slice(0, 500);
  if (airDate) episode.datePublished = airDate;
  if (thumbnailUrl) episode.thumbnailUrl = thumbnailUrl;

  return episode;
}

/**
 * Builds enhanced VideoObject for an episode page with episode-specific data.
 */
export function buildEpisodeVideoObject(options: {
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  uploadDate?: string | null;
  embedUrl: string;
  duration?: string | null;
  episodeNumber?: number;
  seasonNumber?: number;
  partOfSeries?: string;
}): Record<string, unknown> {
  const {
    name,
    description,
    thumbnailUrl,
    uploadDate,
    embedUrl,
    duration,
    episodeNumber,
    seasonNumber,
    partOfSeries,
  } = options;

  const video: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    embedUrl,
  };

  if (!description || !thumbnailUrl || !uploadDate) return {};

  video.description = description;
  video.thumbnailUrl = thumbnailUrl;
  video.uploadDate = uploadDate;

  if (duration) video.duration = duration;
  if (episodeNumber) video.episodeNumber = episodeNumber;
  if (seasonNumber) video.seasonNumber = seasonNumber;
  if (partOfSeries) video.partOfSeries = { '@type': 'TVSeries', name: partOfSeries };
  video.isFamilyFriendly = false;

  return video;
}

/**
 * Builds episode-specific metadata for the long-tail
 * "watch <series> S01E01 <name>" queries.
 *
 * ── Title shape ──────────────────────────────────────────────────────────────
 *   watch   → "Watch Breaking Bad S01E01 Pilot Free 1080p Sub/Dub - MovAnime"
 *   download→ "Download Breaking Bad S01E01 Pilot 1080p Free - MovAnime"
 *
 * Two variants rather than one shared string, because a download page titled
 * "Watch …" is a mismatch between the query and the result, and because the two
 * URL families are separately addressable in the sitemap — duplicate titles
 * across them would split their ranking signal for identical content.
 *
 * `absolute` for the same reason as `buildDetailMetadata`: the root layout
 * applies a `%s | Brand` template that would print the brand twice here.
 *
 * ── Date handling ────────────────────────────────────────────────────────────
 * The air date is rendered by `formatIsoDate`, not `toLocaleDateString`. The
 * latter resolves against the *server's* locale and timezone, so the same URL
 * produced different description text on different hosts — which caches two
 * variants of the same metadata and makes the SERP snippet unstable.
 */
function formatIsoDate(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${parsed.getUTCFullYear()}-${month}-${day}`;
}

export function buildEpisodeMetadata(input: EpisodeMetadataInput): Metadata {
  const {
    seriesName,
    episodeName,
    episodeNumber,
    seasonNumber,
    overview,
    airDate,
    stillPath,
    episodeUrl,
    siteUrl,
    showType,
    intent = 'watch',
    image,
  } = input;

  const label = episodeLabel(showType, seasonNumber, episodeNumber);
  const noun = showType === 'anime' ? 'anime' : 'TV series';
  const isDownload = intent === 'download';

  const lead = isDownload
    ? `Download ${seriesName} ${label} ${episodeName}`.trim()
    : `Watch ${seriesName} ${label} ${episodeName}`.trim();

  const pageTitle = isDownload
    ? `${lead} 1080p Free - ${SITE_NAME}`
    : `${lead} Free 1080p Sub/Dub - ${SITE_NAME}`;

  const airDateText = airDate ? formatIsoDate(airDate) : null;
  const baseDescription = isDownload
    ? `Download ${seriesName} ${label} in HD 1080p free with English Sub/Dub. High-speed mirrors for this ${noun}, no sign-up needed.`
    : `Watch ${seriesName} ${label} "${episodeName}" online free in HD 1080p. English Subbed/Dubbed available.${airDateText ? ` Aired ${airDateText}.` : ''} Fast streaming on ${SITE_NAME}.`;

  const snippet = synopsisSnippet(overview, 159 - baseDescription.length);
  const description = snippet ? `${baseDescription} ${snippet}` : baseDescription;

  const canonical = absoluteUrl(episodeUrl, siteUrl);
  const thumbnailUrl = stillPath
    ? `https://image.tmdb.org/t/p/w780${stillPath}`
    : (image ?? undefined);

  // Use dynamic OG image generation with fallback to TMDB still
  const episodeTitle = `${seriesName} ${label} ${episodeName}`.trim();
  const ogImageUrl = buildOgImageUrl({
    title: episodeTitle,
    poster: thumbnailUrl,
    type: showType === 'anime' ? 'anime' : 'tv',
    year: airDateText ? parseInt(airDateText.split('-')[0]) : undefined,
  });

  const images = [
    { url: ogImageUrl, width: 1200, height: 630, alt: `${episodeTitle} - ${SITE_NAME}` },
    ...(thumbnailUrl ? [{ url: thumbnailUrl, width: 1280, height: 720, alt: `${seriesName} ${label} ${episodeName}`.trim() }] : []),
  ];

  return {
    title: { absolute: pageTitle },
    description,
    alternates: { canonical },
    openGraph: {
      type: 'video.episode',
      siteName: SITE_NAME,
      title: pageTitle,
      description,
      url: canonical,
      locale: 'en_US',
      series: seriesName,
      ...(airDateText ? { releaseDate: airDateText } : {}),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [ogImageUrl],
    },
    other: {
      ...(airDateText ? { 'article:published_time': airDateText } : {}),
      ...(showType === 'anime' ? {} : { 'og:video:season': String(seasonNumber) }),
      'og:video:episode': String(episodeNumber),
    },
  };
}

/**
 * Episode breadcrumb: Home > Section > Series > Season N > Episode N.
 *
 * The section differs per content type (`/tv` vs `/anime`), and anime has no
 * season level — hardcoding "TV Shows" and "Season 1" produced a trail that
 * pointed at pages the user could not reach from an anime episode.
 */
export function buildEpisodeBreadcrumbList(input: {
  siteUrl: string;
  seriesName: string;
  seriesUrl: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
  showType?: 'tv' | 'anime';
}): Record<string, unknown> {
  const {
    siteUrl,
    seriesName,
    seriesUrl,
    seasonNumber,
    episodeNumber,
    episodeName,
    showType = 'tv',
  } = input;

  const root = siteUrl.replace(/\/$/, '');
  const isAnime = showType === 'anime';

  const items: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${root}/` },
    {
      '@type': 'ListItem',
      position: 2,
      name: isAnime ? 'Anime' : 'TV Shows',
      item: `${root}/${isAnime ? 'anime' : 'tv'}`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: seriesName,
      item: absoluteUrl(seriesUrl, siteUrl),
    },
  ];

  // The season crumb is only a real destination for TV; anime episodes hang off
  // the series directly. Position continues from whatever was already pushed.
  let position = items.length + 1;
  if (!isAnime) {
    items.push({
      '@type': 'ListItem',
      position,
      name: `Season ${seasonNumber}`,
      item: `${absoluteUrl(seriesUrl, siteUrl)}?season=${seasonNumber}`,
    });
    position += 1;
  }

  items.push({
    '@type': 'ListItem',
    position,
    name: isAnime
      ? `Episode ${episodeNumber}`
      : `Episode ${episodeNumber}: ${episodeName}`,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

/* ─────────────────────────── Person (Actor/Director) ─────────────────────────── */

/** Minimal person reference for cast/crew arrays. */
export interface PersonRef {
  name: string;
  /** Role in production: actor, director, creator, writer, etc. */
  role: string;
  /** Character name for actors. */
  character?: string;
  /** URL to person's detail page on this site. */
  url?: string;
  /** URL to person's image/headshot. */
  image?: string;
  /** SameAs links (IMDb, Wikipedia, etc.). */
  sameAs?: string[];
}

/**
 * Builds schema.org `Person` node for an actor or director.
 * Emits full Person node when we have enough data, otherwise just a reference.
 */
export function buildPersonSchema(person: PersonRef): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
  };

  if (person.url) schema.url = person.url;
  if (person.image) schema.image = person.image;
  if (person.sameAs?.length) schema.sameAs = person.sameAs;

  return schema;
}

/**
 * Builds an array of Person nodes for cast and crew.
 * Used inside Movie/TVSeries schema as `actor`, `director`, `creator`.
 */
export function buildPersonSchemas(people: PersonRef[]): Record<string, unknown>[] {
  return people.map(buildPersonSchema);
}

/* ─────────────────────────── ItemPage ─────────────────────────── */

/**
 * Builds schema.org `ItemPage` for a detail page.
 * This explicitly tells Google "this page is about one specific item".
 * Helps with entity disambiguation and knowledge graph alignment.
 */
export function buildItemPageSchema(options: {
  /** Absolute URL of this page. */
  url: string;
  /** The main entity this page is about (Movie, TVSeries, TVEpisode). */
  mainEntity: Record<string, unknown>;
  /** Human-readable name of the page. */
  name: string;
  /** Page description. */
  description?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    url: options.url,
    name: options.name,
    description: options.description,
    mainEntity: options.mainEntity,
  };
}

/* ─────────────────────────── Enhanced Media JSON-LD ─────────────────────────── */

export interface EnhancedMediaJsonLdOptions {
  type: 'Movie' | 'TVSeries';
  title: string;
  description?: string | null;
  image?: string | null;
  url: string;
  datePublished?: string | null;
  genres?: string[];
  rating?: RatingSource | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  /** Cast members with character names. */
  actors?: PersonRef[];
  /** Directors. */
  directors?: PersonRef[];
  /** Creators (for TVSeries/Anime). */
  creators?: PersonRef[];
  /** Duration ISO 8601 (e.g., PT1H58M). */
  duration?: string | null;
  /** Content rating (e.g., PG-13, TV-MA). */
  contentRating?: string | null;
  /** Keywords/tags for the item. */
  keywords?: string[];
  /** Production companies. */
  productionCompanies?: Array<{ name: string; logoPath?: string | null }>;
  /** Country of origin. */
  countryOfOrigin?: string[];
  /** Languages. */
  inLanguage?: string[];
}

/**
 * Builds enhanced Movie or TVSeries schema with full cast, crew, genres, and ratings.
 * Includes AggregateRating, Actor, Director, Genre, and ItemPage references.
 */
export function buildEnhancedMediaJsonLd(options: EnhancedMediaJsonLdOptions): Record<string, unknown> {
  const {
    type,
    title,
    description,
    image,
    url,
    datePublished,
    genres = [],
    rating,
    numberOfSeasons,
    numberOfEpisodes,
    actors = [],
    directors = [],
    creators = [],
    duration,
    contentRating,
    keywords = [],
    productionCompanies = [],
    countryOfOrigin = [],
    inLanguage = [],
  } = options;

  // Start with base media schema
  const schema = buildMediaJsonLd({
    type,
    title,
    description,
    image,
    url,
    datePublished,
    genres,
    rating,
    numberOfSeasons,
    numberOfEpisodes,
  });

  // Add actors (Person nodes with character names)
  if (actors.length > 0) {
    schema.actor = actors.map((actor) => ({
      '@type': 'Person',
      name: actor.name,
      ...(actor.character ? { characterName: actor.character } : {}),
      ...(actor.url ? { url: actor.url } : {}),
      ...(actor.image ? { image: actor.image } : {}),
    }));
  }

  // Add directors
  if (directors.length > 0) {
    schema.director = directors.map((director) => ({
      '@type': 'Person',
      name: director.name,
      ...(director.url ? { url: director.url } : {}),
      ...(director.image ? { image: director.image } : {}),
    }));
  }

  // Add creators (for TV series)
  if (creators.length > 0) {
    schema.creator = creators.map((creator) => ({
      '@type': 'Person',
      name: creator.name,
      ...(creator.url ? { url: creator.url } : {}),
      ...(creator.image ? { image: creator.image } : {}),
    }));
  }

  // Add duration
  if (duration) schema.duration = duration;

  // Add content rating
  if (contentRating) schema.contentRating = contentRating;

  // Add keywords
  if (keywords.length > 0) schema.keywords = keywords.join(', ');

  // Add production companies
  if (productionCompanies.length > 0) {
    schema.productionCompany = productionCompanies.map((company) => ({
      '@type': 'Organization',
      name: company.name,
      ...(company.logoPath ? { logo: company.logoPath } : {}),
    }));
  }

  // Add country of origin
  if (countryOfOrigin.length > 0) schema.countryOfOrigin = countryOfOrigin;

  // Add languages
  if (inLanguage.length > 0) schema.inLanguage = inLanguage;

  return schema;
}

/* ─────────────────────────── Enhanced VideoObject ─────────────────────────── */

export interface EnhancedVideoObjectOptions {
  name: string;
  description?: string | null;
  /** Absolute URL to the poster or backdrop used as the video thumbnail. */
  thumbnailUrl?: string | null;
  /** ISO-8601 date, e.g. 2010-07-16. */
  uploadDate?: string | null;
  /** Absolute URL of the page carrying the embed, on this domain. */
  embedUrl: string;
  /** ISO-8601 duration, `PT1H58M`. Omitted when unknown. */
  duration?: string | null;
  isFamilyFriendly?: boolean;
  /** Episode number for episodic content. */
  episodeNumber?: number;
  /** Season number for TV series. */
  seasonNumber?: number;
  /** Parent series name. */
  partOfSeries?: string;
  /** Parent series URL. */
  partOfSeriesUrl?: string;
  /** Transcript or caption track URL. */
  transcriptUrl?: string | null;
  /** Regions where the video is allowed. */
  regionsAllowed?: string[];
  /** Publisher information. */
  publisher?: {
    name: string;
    logoUrl?: string;
    url?: string;
  };
}

/**
 * Builds enhanced VideoObject schema with all required fields for Google Video rich results.
 * Ensures thumbnailUrl, uploadDate, and description are always valid strings.
 * Returns empty object if mandatory fields are missing.
 */
export function buildEnhancedVideoObject(options: EnhancedVideoObjectOptions): Record<string, unknown> {
  const {
    name,
    description,
    thumbnailUrl,
    uploadDate,
    embedUrl,
    duration,
    isFamilyFriendly = false,
    episodeNumber,
    seasonNumber,
    partOfSeries,
    partOfSeriesUrl,
    transcriptUrl,
    regionsAllowed = ['US', 'CA', 'GB', 'AU', 'IN'],
    publisher = { name: 'MovAnime', url: 'https://movanime.site' },
  } = options;

  // Google REQUIRES these four fields for VideoObject rich results
  if (!description || !thumbnailUrl || !uploadDate) {
    return {};
  }

  const video: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name,
    description: description.trim().slice(0, 500),
    thumbnailUrl,
    uploadDate,
    embedUrl,
    isFamilyFriendly,
    regionsAllowed,
    publisher: {
      '@type': 'Organization',
      name: publisher.name,
      ...(publisher.logoUrl ? { logo: { '@type': 'ImageObject', url: publisher.logoUrl } } : {}),
      ...(publisher.url ? { url: publisher.url } : {}),
    },
  };

  if (duration) video.duration = duration;
  if (episodeNumber) video.episodeNumber = episodeNumber;
  if (seasonNumber) video.seasonNumber = seasonNumber;
  if (partOfSeries) {
    video.partOfSeries = {
      '@type': 'TVSeries',
      name: partOfSeries,
      ...(partOfSeriesUrl ? { url: partOfSeriesUrl } : {}),
    };
  }
  if (transcriptUrl) video.transcript = transcriptUrl;

  // Add potential action for watch action
  video.potentialAction = {
    '@type': 'WatchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: embedUrl,
      actionPlatform: [
        'http://schema.org/DesktopWebPlatform',
        'http://schema.org/MobileWebPlatform',
        'http://schema.org/TVWebPlatform',
      ],
    },
    actionAccessibilityRequirement: {
      '@type': 'ActionAccessSpecification',
      category: 'Free',
      availabilityStarts: uploadDate,
      eligibleRegion: regionsAllowed.map((r) => ({ '@type': 'Country', name: r })),
    },
  };

  return video;
}

/* ─────────────────────────── AggregateRating (standalone) ─────────────────────────── */

/**
 * Builds a standalone AggregateRating node.
 * Useful when you need to reference it from multiple entities.
 */
export function buildAggregateRating(options: {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
  ratingExplanation?: string;
}): Record<string, unknown> {
  const { ratingValue, reviewCount, bestRating = 10, worstRating = 1, ratingExplanation } = options;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue: Number(ratingValue.toFixed(1)),
    bestRating,
    worstRating,
    ratingCount: reviewCount,
  };

  if (ratingExplanation) schema.reviewAspect = ratingExplanation;

  return schema;
}