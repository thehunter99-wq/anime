
import { type AniListResponse, type AniListMediaResponse, type Media } from './types';
import { fetchWithRetry } from './health';
import { DATA_REVALIDATE_SECONDS } from './cache-constants';

const ANILIST_API_URL = 'https://graphql.anilist.co';

const MEDIA_FRAGMENT = `
  fragment MediaFragment on Media {
    id
    type
    format
    status
    title {
      romaji
      english
    }
    coverImage {
      extraLarge
      large
    }
    bannerImage
    episodes
    chapters
    # Community score on a 0-100 scale. Requested so the detail page can display
    # a rating, which is a precondition for declaring aggregateRating in JSON-LD.
    averageScore
    description(asHtml: false)
    startDate {
      year
      month
      day
    }
    genres
  }
`;

const MEDIA_QUERY = `
  query ($id: Int, $page: Int, $perPage: Int, $search: String, $sort: [MediaSort], $type: MediaType, $genre_in: [String], $startDate_greater: FuzzyDateInt, $startDate_lesser: FuzzyDateInt, $isAdult: Boolean) {
    Page(page: $page, perPage: $perPage) {
      media(id: $id, search: $search, sort: $sort, type: $type, genre_in: $genre_in, startDate_greater: $startDate_greater, startDate_lesser: $startDate_lesser, isAdult: $isAdult) {
        ...MediaFragment
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

const SINGLE_MEDIA_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      ...MediaFragment
      relations {
        edges {
          relationType(version: 2)
          node {
            ...MediaFragment
          }
        }
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

interface FetchOptions {
  search?: string;
  page?: number;
  perPage?: number;
  sort?: string[];
  type?: 'ANIME' | 'MANGA';
  genre_in?: string[];
  /**
   * Inclusive lower bound on the start date, as `{ year }` or `{ year, month, day }`.
   * AniList's `FuzzyDateInt` leaves the omitted components unconstrained, so
   * `{ year: 2015 }` means "sometime in 2015 onwards", not "1 Jan 2015".
   */
  startDate_greater?: FuzzyDateInput;
  /** Exclusive upper bound, same shape. Used to close off the end of a year. */
  startDate_lesser?: FuzzyDateInput;
  /** `false` excludes adult titles. Passed explicitly rather than left to AniList's default. */
  isAdult?: boolean;
}

export interface FuzzyDateInput {
  year?: number;
  month?: number;
  day?: number;
}

/**
 * Whether AniList is currently failing to answer, as opposed to genuinely
 * reporting "no such media".
 *
 * Same rationale as `isTMDBUnavailable` in `lib/tmdb.ts`: `fetchMediaById`
 * returns `null` for both a real 404 and an unreachable host, and `/anime/[id]`
 * is an ISR route whose `notFound()` output is cached. Without this flag a
 * momentary AniList outage would 404 real anime pages for a full revalidation
 * window, which is how a long-tail catalog gets deindexed.
 *
 * GraphQL answers `200` with `errors` and `data: null` when an id does not
 * exist, so a null result with a successful response counts as "not found".
 */
let upstreamUnavailable = false;

export function isAniListUnavailable(): boolean {
  return upstreamUnavailable;
}

async function anilistFetch(query: string, variables: object) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    // Same reason as TMDB: Next 15 caches nothing by default, which would keep
    // every `/anime/[id]` page dynamic and defeat its `revalidate`. GraphQL POSTs
    // are cached by URL+body, so this is safe — the body is part of the key.
    next: { revalidate: DATA_REVALIDATE_SECONDS },
  };

  try {
    const response = await fetchWithRetry(ANILIST_API_URL, options);

    if (!response.ok) {
      console.warn(`[AniList] responded with HTTP ${response.status}`);
      // 4xx is AniList rejecting the query/id (a genuine "no such media");
      // 5xx and 429 mean the upstream is broken and the id may still be real.
      upstreamUnavailable = response.status >= 500 || response.status === 429;
      return { data: null }; // Return a consistent shape on error
    }

    upstreamUnavailable = false;
    return response.json();
  } catch {
    console.warn('[AniList] graphql.anilist.co unreachable. Check /diagnostics.');
    upstreamUnavailable = true;
    return { data: null }; // Return a consistent shape on error
  }
}

export async function fetchFromAniList(options: FetchOptions = {}): Promise<Media[]> {
  const {
    search,
    page = 1,
    perPage = 20,
    sort,
    type,
    genre_in,
    startDate_greater,
    startDate_lesser,
    isAdult,
  } = options;

  const variables = {
    search,
    page,
    perPage,
    sort,
    type,
    genre_in,
    startDate_greater,
    startDate_lesser,
    isAdult,
  };

  const json: AniListResponse = await anilistFetch(MEDIA_QUERY, variables);

  if (json.data && json.data.Page && json.data.Page.media) {
    // Filter out items with null description as they are often not useful
    return json.data.Page.media.filter(item => item && item.description);
  }

  return [];
}

/**
 * Anime that began in a single calendar year.
 *
 * The two bounds are inclusive/exclusive on purpose: `startDate_lesser` is
 * exclusive in AniList, so passing `{ year: year + 1 }` closes the range exactly
 * at 1 January of the following year. A single `startDate_greater` with no upper
 * bound would return every anime ever since, which is a different page entirely.
 */
export async function fetchAnimeByYear(year: number, page = 1, perPage = 20): Promise<Media[]> {
  return fetchFromAniList({
    type: 'ANIME',
    sort: ['POPULARITY_DESC'],
    startDate_greater: { year },
    startDate_lesser: { year: year + 1 },
    isAdult: false,
    page,
    perPage,
  });
}

export async function fetchMediaById(id: number): Promise<Media | null> {
    const variables = { id };
    const json: AniListMediaResponse = await anilistFetch(SINGLE_MEDIA_QUERY, variables);

    if (json.data && json.data.Media) {
        return json.data.Media;
    }

    return null;
}
