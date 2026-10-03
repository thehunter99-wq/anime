export const INDIAN_LANGUAGE_LABELS: Record<string, string> = {
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  bn: 'Bengali',
  mr: 'Marathi',
  pa: 'Punjabi',
  gu: 'Gujarati',
  ur: 'Urdu',
};

export function languageLabel(code?: string | null): string | null {
  if (!code) return null;
  return INDIAN_LANGUAGE_LABELS[code] ?? code.toUpperCase();
}

export function isIndianLanguage(code?: string | null): boolean {
  return Boolean(code && code in INDIAN_LANGUAGE_LABELS);
}

/* ────────────────────── Dubbed landing-page registry ────────────────────── */

/**
 * Dubbed-language registry — the one place a `/dub/[lang]` slug maps to an ISO
 * 639-1 code and to the words a searcher would actually use.
 *
 * ── Why a registry and not a live lookup ─────────────────────────────────────
 * `/dub` needs three things per language: a URL slug, the TMDB
 * `with_original_language` value, and human copy. TMDB's
 * `/configuration/languages` returns ~180 languages, most of which would be
 * landing pages for queries nobody types, and it says nothing about catalogue
 * depth. Fetching it per render would add an upstream call to every dub page and
 * take all of them down whenever the API hiccupped.
 *
 * So the list is deliberate: the languages this site's audience actually
 * searches for — "hindi dubbed movies" is by far the largest — each with real
 * catalogue behind it. Anything else is a 404, which is the honest answer for a
 * page that would otherwise be empty.
 *
 * ── Same shape as `genres.ts`, on purpose ────────────────────────────────────
 * `resolveDubLanguage` mirrors `resolveGenreSlug` so middleware can validate the
 * slug on the edge using nothing but constants: no import of an upstream-backed
 * module, no network call, and no way for the guard itself to fail.
 */
export interface DubLanguageEntry {
  /** URL segment. Stable: changing it orphans every link to the page. */
  slug: string;
  /** Label used in headings and titles, e.g. "Hindi". */
  label: string;
  /** ISO 639-1 code, passed straight to TMDB `with_original_language`. */
  code: string;
  /** Extra phrases describing what a searcher for this page actually wants. */
  intent: string;
}

/**
 * ISO 639-1 codes only. TMDB's `with_original_language` documents ISO 639-1, and
 * a regional variant such as `pt-BR` is silently ignored rather than corrected —
 * which would produce an empty page that still looks like a working one.
 */
export const DUB_LANGUAGES: readonly DubLanguageEntry[] = [
  { slug: 'hindi', label: 'Hindi', code: 'hi', intent: 'hindi dubbed movies and web series' },
  { slug: 'english', label: 'English', code: 'en', intent: 'english movies and english dubbed series' },
  { slug: 'tamil', label: 'Tamil', code: 'ta', intent: 'tamil dubbed movies and tamil web series' },
  { slug: 'telugu', label: 'Telugu', code: 'te', intent: 'telugu dubbed movies and telugu web series' },
  { slug: 'malayalam', label: 'Malayalam', code: 'ml', intent: 'malayalam movies and malayalam dubbed series' },
  { slug: 'kannada', label: 'Kannada', code: 'kn', intent: 'kannada dubbed movies and kannada series' },
  { slug: 'japanese', label: 'Japanese', code: 'ja', intent: 'japanese movies, anime and series' },
  { slug: 'korean', label: 'Korean', code: 'ko', intent: 'korean drama and korean movies' },
  { slug: 'spanish', label: 'Spanish', code: 'es', intent: 'spanish movies and spanish-language series' },
];

/**
 * Aliases so a human-typed or legacy slug still lands on the right page.
 *
 * `hindi-dubbed` and `dubbed-hindi` are the two orderings people actually write,
 * and both are plausible inbound links. Resolving them here instead of 404ing
 * keeps the page reachable from the phrasing a visitor guessed at.
 */
const DUB_SLUG_ALIASES: Record<string, string> = {
  'hindi-dubbed': 'hindi',
  'dubbed-hindi': 'hindi',
  hi: 'hindi',
  'tamil-dubbed': 'tamil',
  'telugu-dubbed': 'telugu',
  'english-dubbed': 'english',
  en: 'english',
  'korean-drama': 'korean',
  kor: 'korean',
  jpn: 'japanese',
  eng: 'english',
};

const DUB_BY_SLUG = new Map(DUB_LANGUAGES.map((language) => [language.slug, language]));

export interface DubLanguageResolution {
  /** The language, or null when the slug is not one we publish a page for. */
  entry: DubLanguageEntry | null;
  /** The slug the page actually lives at. Equals the request when canonical. */
  canonicalSlug: string;
  /** Whether the slug is canonical or merely an alias for one. */
  known: boolean;
}

/**
 * Resolves a `/dub/[lang]` slug against the registry, following aliases.
 *
 * Returns `known: false` for anything outside the registry so the caller can
 * answer with a real 404. `canonicalSlug` differs from the request only for
 * aliases, which is what lets `/dub/hindi-dubbed` be a 301 rather than a second
 * crawlable URL for the same page splitting its own ranking signal.
 *
 * Pure constant lookups only — safe to run on the edge in middleware.
 */
export function resolveDubLanguage(raw: string | undefined): DubLanguageResolution {
  const slug = (raw ?? '').toLowerCase().trim();
  const canonical = DUB_SLUG_ALIASES[slug] ?? slug;
  const entry = DUB_BY_SLUG.get(canonical) ?? null;

  return { entry, canonicalSlug: entry ? entry.slug : canonical, known: entry !== null };
}

/** Convenience wrapper for callers that only need the language entry. */
export function findDubLanguage(slug: string | undefined): DubLanguageEntry | null {
  return resolveDubLanguage(slug).entry;
}
