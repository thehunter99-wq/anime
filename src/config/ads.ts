/**
 * Single source of truth for every monetisation identifier.
 *
 * Every value can be overridden with a `NEXT_PUBLIC_*` environment variable, so
 * rotating a zone key or a Smartlink destination never requires a code change.
 * Keep the defaults in sync with `.env.example`.
 *
 * ── Pasting your own keys ────────────────────────────────────────────────────
 * The defaults below are already filled in with the live zone scripts. If you
 * create new zones in the Adsterra dashboard, paste the URLs here or set the
 * matching environment variable — no other file needs editing.
 */

/** Adsterra zone key. Required for the repeatable in-content banner slots. */
export const ADSTERRA_KEY = process.env.NEXT_PUBLIC_ADSTERRA_KEY ?? '';

/**
 * Social Bar (sticky overlay). The only ad unit that needs no zone key, so it
 * renders even when everything else is unconfigured.
 */
export const SOCIAL_BAR_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_URL ??
  'https://pl31625876.profitableratecpmnetwork.com/77/43/d2/7743d209f9e5ab47329ac706ebe9fa56.js';

/**
 * Popunder. Loaded later than the social bar so a single page view never fires
 * both underlays at once — networks penalise that pattern.
 */
export const POPUNDER_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_URL ??
  'https://pl31625875.profitableratecpmnetwork.com/be/f0/3c/bef03cbd6a8d7712fde3e921125ecc00.js';

/**
 * Adsterra binds popunders to a verified referrer allowlist, so traffic from
 * localhost is silently dropped. Keeping it production-only avoids a pointless
 * request and keeps the dev console clean.
 */
export const POPUNDER_ENABLED = process.env.NODE_ENV === 'production';

/**
 * Native Banner. `NATIVE_BANNER_CONTAINER_ID` is derived from the zone and MUST
 * stay in sync with the script URL: the loader binds to the first element with
 * this exact id, so a mismatch renders an empty box.
 */
export const NATIVE_BANNER_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL ??
  'https://pl31625878.profitableratecpmnetwork.com/89898e7af070f78c4da937a6a83f13c7/invoke.js';

/**
 * Derived from NATIVE_BANNER_URL rather than hardcoded separately. The zone hash
 * is the segment after the hostname, so a rotated script updates the container
 * id automatically and can never drift out of sync.
 */
export const NATIVE_BANNER_CONTAINER_ID = (() => {
  try {
    const hash = new URL(NATIVE_BANNER_URL).pathname.split('/').filter(Boolean)[0];
    return hash ? `container-${hash}` : '';
  } catch {
    return '';
  }
})();

/** Loader for the repeatable in-content slots (below the player, in grids). */
export const IN_CONTENT_LOADER_URL = ADSTERRA_KEY
  ? `https://ssat.pro/cdn/client.js?key=${encodeURIComponent(ADSTERRA_KEY)}&format=auto`
  : '';

/**
 * Smartlink behind the primary "Fast HD Download" button on movie and TV pages.
 */
export const SMARTLINK_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_SMARTLINK_URL ??
  'https://www.profitableratecpmnetwork.com/tguhgg4ee?key=b0ad7e27ed01791677110762cfb5d058';

/**
 * Direct Link used by the player overlay. Set this to your Adsterra Direct Link
 * or PropellerAds Direct Link URL. When empty the overlay never renders, so the
 * player behaves exactly as if no monetisation were present.
 */
export const DIRECT_LINK_URL = process.env.NEXT_PUBLIC_ADSTERRA_DIRECT_LINK_URL ?? '';

/** Load delays, in ms after hydration. */
export const AD_DELAYS = {
  /** Social bar sits under the fold on first paint, so it can wait. */
  socialBar: 1200,
  /** Deliberately later than the social bar so the two never stack. */
  popunder: 4500,
} as const;

/**
 * Reserved heights. Every ad container declares one before the network responds
 * so a late or blocked script cannot shift the page (CLS).
 */
export const AD_RESERVED_HEIGHT = {
  /** ssat.pro in-content slots render a fluid unit of roughly this height. */
  inContent: 'min-h-[250px]',
  /** The native banner zone currently serves a ~90px row. */
  native: 'min-h-[90px]',
} as const;

/**
 * Anti-ban guardrail for the player overlay.
 *
 * Direct-link networks invalidate publishers whose traffic produces forced
 * navigation without engagement, so triggers are capped and the overlay then
 * stays hidden for the rest of the window rather than nagging.
 */
export const DIRECT_LINK_CAP = {
  /** Maximum overlay triggers per window. */
  maxTriggers: 3,
  /** Rolling window length in ms. */
  windowMs: 10 * 60 * 1000,
  /** localStorage key holding the trigger timestamps. */
  storageKey: 'cineverse:directlink:v1',
} as const;