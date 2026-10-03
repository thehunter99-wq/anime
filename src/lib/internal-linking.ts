import { SITE_URL } from './site';
import { slugify } from './utils';

/**
 * Internal Linking Engine
 *
 * Automatically converts entity mentions in synopses and tags into
 * internal links to /genre/[slug], /year/[year], and /person/[slug] pages.
 *
 * This passes PageRank to deep pages and helps Google crawl the entire site.
 */

/** Known genre mappings from TMDB genre IDs to our canonical slugs */
export const GENRE_SLUG_MAP: Record<number, string> = {
  28: 'action',
  12: 'adventure',
  16: 'animation',
  35: 'comedy',
  80: 'crime',
  99: 'documentary',
  18: 'drama',
  10751: 'family',
  14: 'fantasy',
  36: 'history',
  27: 'horror',
  10402: 'music',
  9648: 'mystery',
  10749: 'romance',
  878: 'sci-fi',
  10770: 'tv-movie',
  53: 'thriller',
  10752: 'war',
  37: 'western',
};

/** Reverse mapping for looking up genre ID from slug */
export const GENRE_SLUG_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(GENRE_SLUG_MAP).map(([id, slug]) => [slug, Number(id)])
);

/**
 * Auto-link genre names in text to /genre/[slug] pages.
 * Matches whole words only to avoid false positives.
 */
export function linkGenres(text: string): string {
  let result = text;
  const sortedGenres = Object.values(GENRE_SLUG_MAP).sort((a, b) => b.length - a.length);

  for (const genreSlug of sortedGenres) {
    // Match genre name with various capitalizations
    const genreName = genreSlug.replace(/-/g, ' ');
    const regex = new RegExp(`\\b(${genreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');

    result = result.replace(regex, (match) => {
      const encodedSlug = genreSlug;
      return `<a href="${SITE_URL}/genre/${encodedSlug}" class="internal-link genre-link" data-genre="${encodedSlug}" rel="nofollow">${match}</a>`;
    });
  }

  return result;
}

/**
 * Auto-link year mentions (1900-2099) to /year/[year] pages.
 */
export function linkYears(text: string): string {
  // Match 4-digit years between 1900-2099
  const yearRegex = /\b(19\d{2}|20\d{2})\b/g;

  return text.replace(yearRegex, (match) => {
    const year = parseInt(match, 10);
    if (year >= 1900 && year <= 2099) {
      return `<a href="${SITE_URL}/year/${year}" class="internal-link year-link" data-year="${year}" rel="nofollow">${match}</a>`;
    }
    return match;
  });
}

/**
 * Auto-link person names (actors, directors) to /person/[slug] pages.
 * Accepts an array of person objects with name and optional role.
 */
export function linkPeople(
  text: string,
  people: Array<{ name: string; role?: 'actor' | 'director' | 'creator' }>
): string {
  let result = text;

  // Sort by name length descending to match longer names first
  const sortedPeople = [...people].sort((a, b) => b.name.length - a.name.length);

  for (const person of sortedPeople) {
    const name = person.name;
    const regex = new RegExp(`\\b(${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');

    result = result.replace(regex, (match) => {
      const slug = slugify(name);
      const roleLabel = person.role ? ` ${person.role}` : '';
      return `<a href="${SITE_URL}/person/${slug}" class="internal-link person-link" data-person="${slug}" data-role="${person.role ?? ''}" rel="nofollow">${match}</a>`;
    });
  }

  return result;
}

/**
 * Master function to apply all internal linking to a text.
 * Order matters: people first (longest names), then genres, then years.
 */
export function applyInternalLinks(
  text: string,
  options: {
    genres?: Array<{ id: number; name: string }>;
    people?: Array<{ name: string; role?: 'actor' | 'director' | 'creator' }>;
  } = {}
): string {
  let result = text;

  // Link people first (most specific)
  if (options.people?.length) {
    result = linkPeople(result, options.people);
  }

  // Link genres from provided list or auto-detect
  if (options.genres?.length) {
    for (const genre of options.genres) {
      const slug = GENRE_SLUG_MAP[genre.id];
      if (slug) {
        const genreName = genre.name;
        const regex = new RegExp(`\\b(${genreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
        result = result.replace(regex, (match) => {
          return `<a href="${SITE_URL}/genre/${slug}" class="internal-link genre-link" data-genre="${slug}" rel="nofollow">${match}</a>`;
        });
      }
    }
  } else {
    // Auto-detect genres from text
    result = linkGenres(result);
  }

  // Link years last
  result = linkYears(result);

  return result;
}

/**
 * Generate SEO-rich anchor text for a recommendation.
 * Creates diverse long-tail keyword variations.
 */
export function generateSeoAnchors(options: {
  title: string;
  year?: number | null;
  type?: 'movie' | 'tv' | 'anime';
  quality?: string;
}): string[] {
  const { title, year, type = 'movie', quality = '1080p' } = options;
  const baseTitle = year ? `${title} (${year})` : title;
  const noun = type === 'anime' ? 'anime' : type === 'tv' ? 'TV series' : 'movie';

  return [
    // Watch variations (high intent)
    `Watch ${baseTitle} Online Free`,
    `Watch ${baseTitle} Full ${noun}`,
    `Watch ${baseTitle} English Sub HD`,
    `Watch ${baseTitle} ${quality} Free Streaming`,
    `Stream ${baseTitle} Online Free`,
    `Stream ${baseTitle} English Subbed`,
    `Stream ${baseTitle} ${quality}`,

    // Download variations
    `${baseTitle} Download ${quality}`,
    `${baseTitle} Free Download`,
    `${baseTitle} Direct Download HD`,

    // Long-tail informational
    `${baseTitle} Full ${noun} Online`,
    `${baseTitle} Free Streaming No Sign Up`,
    `${baseTitle} Watch Now Free`,
    `${baseTitle} ${quality} Stream`,
  ];
}

/**
 * Get a deterministic SEO anchor by index for consistent rotation.
 */
export function getSeoAnchorByIndex(
  title: string,
  index: number,
  options: { year?: number | null; type?: 'movie' | 'tv' | 'anime'; quality?: string } = {}
): string {
  const anchors = generateSeoAnchors({ title, ...options });
  return anchors[index % anchors.length];
}

/**
 * Build internal linking data for a detail page.
 * Returns structured data for the JSON-LD schema.
 */
export function buildInternalLinkingData(options: {
  genres?: Array<{ id: number; name: string }>;
  year?: number | null;
  actors?: Array<{ name: string }>;
  directors?: Array<{ name: string }>;
  creators?: Array<{ name: string }>;
}) {
  const { genres = [], year, actors = [], directors = [], creators = [] } = options;

  const genreLinks = genres
    .map((g) => {
      const slug = GENRE_SLUG_MAP[g.id];
      return slug ? { name: g.name, url: `${SITE_URL}/genre/${slug}` } : null;
    })
    .filter(Boolean);

  const yearLink = year ? { name: String(year), url: `${SITE_URL}/year/${year}` } : null;

  const actorLinks = actors.map((a) => ({
    name: a.name,
    url: `${SITE_URL}/person/${slugify(a.name)}`,
    role: 'actor',
  }));

  const directorLinks = directors.map((d) => ({
    name: d.name,
    url: `${SITE_URL}/person/${slugify(d.name)}`,
    role: 'director',
  }));

  const creatorLinks = creators.map((c) => ({
    name: c.name,
    url: `${SITE_URL}/person/${slugify(c.name)}`,
    role: 'creator',
  }));

  return {
    genreLinks,
    yearLink,
    actorLinks,
    directorLinks,
    creatorLinks,
    allLinks: [...genreLinks, yearLink, ...actorLinks, ...directorLinks, ...creatorLinks].filter(Boolean),
  };
}