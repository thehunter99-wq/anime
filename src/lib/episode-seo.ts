import type { Metadata } from 'next';

import {
  buildEpisodeBreadcrumbList,
  buildEpisodeMetadata,
  buildEpisodeVideoObject,
  buildTVEpisodeJsonLd,
  episodeLabel,
} from './seo';
import { buildEpisodeSlug, episodePath, type EpisodeIntent, type EpisodeShowType } from './episode-slug';
import { absoluteUrl, animePath, tvPath } from './routes';
import { SITE_URL } from './site';

/**
 * Everything the four episode routes (`/watch` + `/download` × `tv` + `anime`)
 * need to agree on.
 *
 * These routes were four near-copies of each other, each with its own private copy
 * of the same slug-keyword parser and JSON-LD assembly. They had already drifted:
 * the anime pair omitted `seasonNumber` from the breadcrumb while the TV pair
 * hardcoded a "TV Shows" crumb, and only one of the four produced distinct titles
 * for watch versus download. Anything that has to be right for all four belongs
 * here rather than being copied four times.
 *
 * Note what is *not* here: slug validation and the canonical redirect. Those live
 * in `middleware.ts`, because only middleware can answer with a real HTTP status
 * before the response has started streaming.
 */

export interface EpisodePageSeoInput {
  showType: EpisodeShowType;
  intent: EpisodeIntent;
  /** TMDB id for TV, AniList id for anime. */
  id: number | string;
  seriesTitle: string;
  seriesOverview?: string | null;
  seasonNumber: number;
  episodeNumber: number;
  /** Upstream episode title. Anime has none, so pass '' for it. */
  episodeName?: string | null;
  episodeOverview?: string | null;
  airDate?: string | null;
  /** TMDB still path (TV) or absolute poster URL (anime). */
  image?: string | null;
  /** Runtime in minutes, when upstream reports one. */
  durationMinutes?: number | null;
  voteAverage?: number | null;
  voteCount?: number | null;
}

/** ISO-8601 duration from a minute count, e.g. 42 → `PT42M`. */
export function isoDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours <= 0) return `PT${rest}M`;
  return rest ? `PT${hours}H${rest}M` : `PT${hours}H`;
}

/** The canonical slug for an episode. Read by the page only to keep the log honest. */
export function episodeIdentity(input: EpisodePageSeoInput): {
  slug: string;
  path: string;
  label: string;
} {
  const { showType, intent, id, seasonNumber, episodeNumber } = input;

  return {
    slug: buildEpisodeSlug({ showType, intent, seasonNumber, episodeNumber }),
    path: episodePath({ showType, intent, id, seasonNumber, episodeNumber }),
    label: episodeLabel(showType, seasonNumber, episodeNumber),
  };
}

/** Canonical series path for the parent of an episode page. */
export function seriesPathFor(showType: EpisodeShowType, id: number | string): string {
  return showType === 'anime' ? animePath(id) : tvPath(id);
}

/**
 * `<head>` metadata for an episode page.
 *
 * `episodeUrl` is always the generated canonical path. Middleware has already
 * redirected anything else here, so by the time this runs the URL and the
 * canonical agree — but deriving both from `episodeIdentity` keeps that true even
 * for a direct render that skipped middleware.
 */
export function buildEpisodePageMetadata(input: EpisodePageSeoInput): Metadata {
  const identity = episodeIdentity(input);

  return buildEpisodeMetadata({
    seriesTitle: `${input.seriesTitle} ${identity.label}`,
    seriesName: input.seriesTitle,
    episodeName: input.showType === 'anime' ? '' : (input.episodeName ?? ''),
    episodeNumber: input.episodeNumber,
    seasonNumber: input.seasonNumber,
    overview: input.episodeOverview ?? input.seriesOverview ?? null,
    airDate: input.airDate,
    stillPath: input.showType === 'tv' ? input.image : null,
    image: input.showType === 'anime' ? input.image : null,
    episodeUrl: identity.path,
    siteUrl: SITE_URL,
    seriesUrl: seriesPathFor(input.showType, input.id),
    showType: input.showType,
    intent: input.intent,
  });
}

/**
 * The `@graph` nodes for an episode page: `TVEpisode`, `VideoObject` and
 * `BreadcrumbList`.
 *
 * `VideoObject` points its `embedUrl` at the player for the whole series
 * (`/view/tv/1399?season=1&episode=1`), not at this page. The player is `noindex`
 * and disallowed in robots.txt, so an `embedUrl` pointing at the page it lives on
 * would be asserting a self-referential, uncrawlable embed. See the long note on
 * `buildVideoObject` in `seo.ts` for the full reasoning.
 */
export function buildEpisodePageJsonLd(input: EpisodePageSeoInput): Array<Record<string, unknown>> {
  const identity = episodeIdentity(input);
  const seriesPath = seriesPathFor(input.showType, input.id);

  const episodeNode = buildTVEpisodeJsonLd({
    seriesTitle: `${input.seriesTitle} ${identity.label}`,
    seriesName: input.seriesTitle,
    episodeName: input.showType === 'anime' ? '' : (input.episodeName ?? ''),
    episodeNumber: input.episodeNumber,
    seasonNumber: input.seasonNumber,
    overview: input.episodeOverview ?? input.seriesOverview ?? null,
    airDate: input.airDate,
    stillPath: input.showType === 'tv' ? input.image : null,
    image: input.showType === 'anime' ? input.image : null,
    episodeUrl: identity.path,
    siteUrl: SITE_URL,
    seriesUrl: seriesPath,
    showType: input.showType,
    intent: input.intent,
  });

  const verb = input.intent === 'download' ? 'Download' : 'Watch';
  const videoNode = buildEpisodeVideoObject({
    name: `${verb} ${input.seriesTitle} ${identity.label}${
      input.showType === 'anime' ? '' : ` ${input.episodeName ?? ''}`
    }`,
    description: input.episodeOverview ?? input.seriesOverview ?? null,
    thumbnailUrl: input.image,
    uploadDate: input.airDate,
    embedUrl: absoluteUrl(playerPathFor(input), SITE_URL),
    duration: isoDuration(input.durationMinutes),
    episodeNumber: input.episodeNumber,
    seasonNumber: input.showType === 'anime' ? undefined : input.seasonNumber,
    partOfSeries: input.seriesTitle,
  });

  const breadcrumbNode = buildEpisodeBreadcrumbList({
    siteUrl: SITE_URL,
    seriesName: input.seriesTitle,
    seriesUrl: seriesPath,
    seasonNumber: input.seasonNumber,
    episodeNumber: input.episodeNumber,
    episodeName: input.episodeName ?? '',
    showType: input.showType,
  });

  return [episodeNode, videoNode, breadcrumbNode];
}

/** Where the episode actually plays, one hop away from the SEO landing page. */
export function playerPathFor(input: EpisodePageSeoInput): string {
  if (input.showType === 'anime') {
    return `/view/anime/${input.id}?item=${input.episodeNumber}`;
  }
  return `/view/tv/${input.id}?season=${input.seasonNumber}&episode=${input.episodeNumber}`;
}

/**
 * Human-readable H1 for the page body.
 *
 * Kept free of slug keywords. The previous implementation spliced whatever words
 * the URL happened to carry into the heading, which meant the H1 changed for the
 * same episode depending on the inbound link — the visible text and the served
 * content disagreed, which is how Google recognises a doorway page.
 */
export function episodeHeading(input: EpisodePageSeoInput): string {
  const identity = episodeIdentity(input);
  const base = `${input.seriesTitle} ${identity.label}`;
  if (input.showType === 'anime' || !input.episodeName) return base;
  return `${base}: ${input.episodeName}`;
}