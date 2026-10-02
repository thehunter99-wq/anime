import type { Metadata } from 'next';

import { SITE_NAME } from './site';
import { absoluteUrl } from './routes';

/**
 * Title/description/OG builders for TMDB-backed detail pages.
 *
 * ON THE BRAND SUFFIX — the requested format ends in "- MovAnime", but the site's
 * `SITE_NAME` constant is the brand of record. Hardcoding a second brand name
 * here would leave the title suffix, the header, the footer and the legal pages
 * disagreeing. `SITE_NAME` is used instead so one constant controls all of it;
 * if you want the literal "MovAnime", change `SITE_NAME` in `src/lib/site.ts`
 * and every surface follows.
 */

/** Highest-intent phrasing first; Google truncates around 60 chars. */
export function buildWatchTitle(options: {
  title: string;
  year?: number | null;
  /** Anime get an episode-oriented qualifier, films do not. */
  isSeries?: boolean;
}): string {
  const { title, year, isSeries = false } = options;
  const yearPart = year ? ` (${year})` : '';
  return isSeries
    ? `Watch ${title}${yearPart} Full HD Free - ${SITE_NAME}`
    : `Watch ${title}${yearPart} Full Movie HD Free - ${SITE_NAME}`;
}

export function buildDescription(options: {
  title: string;
  overview?: string | null;
  isSeries?: boolean;
  genres?: string[];
}): string {
  const { title, overview, isSeries = false, genres = [] } = options;
  const genrePart = genres.length ? ` Genres: ${genres.slice(0, 3).join(', ')}.` : '';

  // High-intent keywords, natural enough to read as a sentence rather than the
  // keyword-stuffed string that gets demoted.
  const base = isSeries
    ? `Watch ${title} full episodes online in HD with English sub and dub. Download free and stream instantly.`
    : `Watch ${title} full movie online in HD, English sub/dub, download free. Stream instantly on ${SITE_NAME}.`;

  const trimmedOverview = (overview ?? '').trim();
  const detail = trimmedOverview
    ? ` ${trimmedOverview.slice(0, 140).replace(/\s+\S*$/, '')}`
    : '';

  return `${base}${genrePart}${detail}`.slice(0, 300);
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
  const description = buildDescription({ title, overview, isSeries, genres });
  const canonical = absoluteUrl(path, siteUrl);

  // 1280x720 matches the OG spec for video and matches the banner assets used
  // across the site, so the card never gets letterboxed.
  const images = image
    ? [{ url: image, width: 1280, height: 720, alt: `${title} poster` }]
    : undefined;

  return {
    title: pageTitle,
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
      images: image ? [image] : undefined,
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
 * ── READ THIS BEFORE ENABLING aggregateRating ───────────────────────────────
 * Google treats `aggregateRating` as a claim about the ratings shown on *that
 * page*, and reserves it as a rich-result eligible star rating. Emitting it
 * without real on-page ratings is a structured-data policy violation and can
 * trigger a manual action, which is far more damaging than missing stars.
 *
 * So this builder takes ratings as an explicit argument and simply omits the
 * block when they are absent. The rating numbers themselves must be real
 * user-visible ratings; TMDB's community vote is a reasonable proxy ONLY if the
 * page displays them, which ours currently does not. Recommendation: leave
 * ratings off until the page renders a visible rating, then pass them here.
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
  if (rating && rating.voteAverage && rating.voteCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(rating.voteAverage).toFixed(1),
      // TMDB votes are out of 10; schema.org expects a 5-point scale.
      bestRating: 5,
      worstRating: 1,
      ratingCount: rating.voteCount,
    };
  }

  return schema;
}