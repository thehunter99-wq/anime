import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from './site';

/**
 * OpenGraph / Twitter metadata for a title page.
 *
 * Telegram, WhatsApp, X, Discord and Slack all read OG tags first, and several
 * of them ignore the Twitter block entirely, so both are always emitted with the
 * same image and text. Images must be absolute URLs or the preview silently
 * renders blank on every one of those platforms.
 *
 * A missing or unrecognisable title should degrade to a site-wide card rather
 * than a broken one, so callers can pass partial data safely.
 */

const OG_SUFFIX = `Watch Free in HD on ${SITE_NAME}`;

/** OpenGraph truncates around 200 chars; 160 keeps previews on one clean line. */
function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export type MediaMetadataInput = {
  title: string;
  description?: string | null;
  /** Absolute poster or backdrop URL. */
  image?: string | null;
  /** Absolute or site-relative path; normalised to absolute here. */
  path: string;
  ogType?: 'video.movie' | 'video.episode' | 'video.other';
  /** Appends season/episode context, e.g. "S2 E5". */
  episodeLabel?: string;
};

export function buildMediaMetadata({
  title,
  description,
  image,
  path,
  ogType = 'video.movie',
  episodeLabel,
}: MediaMetadataInput): Metadata {
  const cleanTitle = title?.trim() || SITE_NAME;
  const heading = episodeLabel ? `${cleanTitle} ${episodeLabel}` : cleanTitle;
  const fullTitle = `${heading} - ${OG_SUFFIX}`;

  const summary = truncate(
    description?.trim() || `Watch ${heading} free in HD on ${SITE_NAME}.`
  );

  const url = path.startsWith('http') ? path : `${SITE_URL}${path}`;
  const images = image ? [{ url: image, width: 1280, height: 720 }] : [];

  return {
    title: heading,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: ogType,
      siteName: SITE_NAME,
      title: fullTitle,
      description: summary,
      url,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: summary,
      images: image ? [image] : [],
    },
  };
}