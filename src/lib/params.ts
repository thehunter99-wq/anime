/**
 * Query-string coercion for player routing.
 *
 * `parseInt` returns NaN for junk input, and `parseInt('0')` returns 0. Both
 * values flow straight into embed URLs (`/embed/tv/{id}/NaN/NaN`), which is how
 * a "Video Not Found" 404 happens. Every player number therefore goes through
 * here, so a malformed link degrades to episode 1 instead of a broken player.
 */
export function toPositiveInt(
  value: string | string[] | null | undefined,
  fallback = 1,
  max?: number
): number {
  const raw = Array.isArray(value) ? value[0] : value;

  // `??` then an explicit empty-string check: '0' and 'abc' must not become the
  // fallback silently for genuinely valid-but-zero input, but junk must.
  if (raw === null || raw === undefined || raw === '') return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  if (max !== undefined && parsed > max) return max;
  return parsed;
}

/** Season is 1-based for every provider this project supports. */
export const toSeason = (value: string | string[] | null | undefined, max?: number) =>
  toPositiveInt(value, 1, max);

/** Episode is 1-based. */
export const toEpisode = (value: string | string[] | null | undefined, max?: number) =>
  toPositiveInt(value, 1, max);

/**
 * Parses the TMDB id out of an `{id}-{slug}` route segment, e.g. `1399-breaking-bad`.
 * Returns NaN when the segment carries no usable id.
 */
export function idFromSlug(idSlug: string): number {
  return Number.parseInt(idSlug.split('-')[0], 10);
}

/**
 * Recovers a human-readable title from the slug when TMDB metadata is
 * unavailable, e.g. `1399-breaking-bad` -> `Breaking Bad`.
 *
 * Playback only ever needs the numeric id, so a TMDB outage must not 404 the
 * player — it should degrade to a plainer title and keep streaming. Minor words
 * stay lowercase so the result reads naturally.
 */
export function titleFromSlug(idSlug: string, id: number): string {
  const slug = idSlug.substring(id.toString().length + 1).replace(/-+/g, ' ').trim();
  if (!slug) return `Title ${id}`;

  const minor = new Set([
    'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'vs',
  ]);

  return slug
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}