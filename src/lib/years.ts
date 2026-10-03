/**
 * Release-year catalogue for the `/year/[year]` landing pages.
 *
 * ── Which years ──────────────────────────────────────────────────────────────
 * 1950 → next year. Films before 1950 are real but nobody searches this site for
 * them, and the tail years would be pages with a handful of titles. The upper
 * bound is *next* year rather than the current one: a fair number of titles carry
 * a festival or production year that puts them slightly ahead of the calendar,
 * and excluding them would make those titles unreachable from a page that is
 * otherwise exactly what the visitor wanted.
 *
 * Later years are open-ended on purpose. A fixed 2026 upper bound would 404 the
 * `/year/2027` page the moment the calendar rolled, and it would 404 for good —
 * these pages are generated on demand, not enumerated.
 */

/** Years with enough catalogue depth to be worth a page. */
export const EARLIEST_YEAR = 1950;

/**
 * Ceiling for `/year/[year]`, `null` meaning "no ceiling".
 *
 * `null` rather than a far-future number so `isValidYear` stays a simple range
 * check and there is nothing to update when the calendar moves.
 */
export const LATEST_YEAR: number | null = null;

/** The current year, from the server clock. */
export function currentYear(): number {
  return new Date().getUTCFullYear();
}

/**
 * The last year that gets its own landing page and sitemap entry.
 *
 * Next year inclusive: TMDB and AniList both carry forward-dated entries, and a
 * page for a year that has not started yet still has content.
 */
export function latestCatalogYear(): number {
  return currentYear() + 1;
}

/**
 * Whether `/year/[year]` should render.
 *
 * Anything outside the range 404s rather than redirecting to the nearest year: a
 * redirect would tell Google that `/year/1843` and `/year/1950` are the same
 * page, and the destination is a guess the visitor did not ask for.
 */
export function isValidYear(value: string | number | undefined): boolean {
  const year = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(year)) return false;
  if (year < EARLIEST_YEAR) return false;
  if (LATEST_YEAR !== null && year > LATEST_YEAR) return false;
  return true;
}

/** Every year that gets a landing page, oldest first. */
export function catalogYears(): number[] {
  const years: number[] = [];
  for (let year = EARLIEST_YEAR; year <= latestCatalogYear(); year += 1) {
    years.push(year);
  }
  return years;
}

/** Canonical path for a year page. */
export function yearPath(year: number | string): string {
  return `/year/${year}`;
}