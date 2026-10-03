/**
 * Shared cache lifetimes for upstream data.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 * Next.js 15 changed `fetch` to be **uncached by default**. A detail route that
 * awaits an uncached fetch is therefore not eligible for the route cache, and
 * `export const revalidate` silently does nothing — the page is re-rendered on
 * every single request and every one of them hits TMDB/AniList again.
 *
 * That failure is invisible in the build output: the route still compiles and
 * still reports `revalidate`, but the served responses come back with
 * `Cache-Control: private, no-cache, no-store` and no `x-nextjs-cache` header.
 *
 * Both upstreams are therefore given an explicit `next.revalidate`, which opts
 * them into the data cache and makes the route ISR-eligible in the same move.
 * The value is shared so the fetch TTL and the route `revalidate` cannot drift
 * apart into two different caching stories.
 *
 * Matched to the `revalidate = 3600` exported by `/movie/[id]`, `/tv/[id]` and
 * `/anime/[id]`: released films, finished series and aired anime change their
 * metadata rarely, so an hour is both fresher than necessary and cheap.
 */
export const DATA_REVALIDATE_SECONDS = 3600;

/**
 * Cache lifetime for data that is genuinely volatile — trending, now-playing and
 * popularity lists. These must stay current to rank, so they are refreshed far
 * more often than a settled title.
 */
export const RAILS_REVALIDATE_SECONDS = 1800;