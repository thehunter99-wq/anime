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
 *
 * ── AdBlocker Bypass ─────────────────────────────────────────────────────────
 * All external Adsterra scripts are now proxied through internal Next.js rewrites
 * (configured in next.config.ts) so AdBlockers cannot block them by domain name:
 *   /assets/js/p-unit.js   -> Popunder
 *   /assets/js/s-unit.js   -> Social Bar
 *   /assets/js/n-unit.js   -> Native Banner
 *   /assets/js/in-content.js -> In-content loader (ssat.pro)
 *
 * ── Anti-Ban Configuration ───────────────────────────────────────────────────
 * Adsterra and other networks ban domains that show:
 * - Too many popunders per session (>3-5 per session)
 * - Social bar covering player controls
 * - Direct links firing on every click (forced navigation)
 * - Popunder + Direct Link simultaneously
 * - Ads on pages with no content (thin content)
 *
 * This config enforces conservative defaults that maximize revenue while keeping
 * the domain safe. Override via env vars only if you understand the risks.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://movanime.site';

/** Adsterra zone key. Required for the repeatable in-content banner slots. */
export const ADSTERRA_KEY = process.env.NEXT_PUBLIC_ADSTERRA_KEY ?? '';

/**
 * Popunder. Proxied through /assets/js/p-unit.js to bypass AdBlockers.
 * 
 * CRITICAL: Only enable in production. Adsterra requires verified referrers.
 * Never fire more than 1 popunder per 30 minutes per user session.
 */
export const POPUNDER_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_URL ??
  `${SITE_URL}/assets/js/p-unit.js`;

/**
 * Social Bar (sticky overlay). Proxied through /assets/js/s-unit.js.
 * 
 * CRITICAL: Suppress on watch pages (covers player controls = ban risk).
 * Delay 3+ seconds after load to not impact Core Web Vitals.
 */
export const SOCIAL_BAR_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_URL ??
  `${SITE_URL}/assets/js/s-unit.js`;

/**
 * Native Banner. Proxied through /assets/js/n-unit.js.
 * 
 * Single instance only (singleton). Loader binds to first matching container ID.
 * Place above footer, below fold - lazyOnload safe.
 */
export const NATIVE_BANNER_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL ??
  `${SITE_URL}/assets/js/n-unit.js`;

/**
 * In-content loader. Proxied through /assets/js/in-content.js.
 * 
 * Multiple instances allowed - each gets unique slot ID via useId().
 * Format: 'auto' | 'fluid' | 'rectangle' | 'vertical'
 */
export const IN_CONTENT_LOADER_URL = ADSTERRA_KEY
  ? `${SITE_URL}/assets/js/in-content.js?key=${encodeURIComponent(ADSTERRA_KEY)}&format=auto`
  : '';

/**
 * Adsterra binds popunders to a verified referrer allowlist, so traffic from
 * localhost is silently dropped. Keeping it production-only avoids a pointless
 * request and keeps the dev console clean.
 */
export const POPUNDER_ENABLED = process.env.NODE_ENV === 'production';

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

/**
 * Smartlink behind the primary "Fast HD Download" button on movie and TV pages.
 * 
 * MUST be set via NEXT_PUBLIC_ADSTERRA_SMARTLINK_URL env var.
 * No default - if not set, smartlink button is hidden (better than broken link).
 */
export const SMARTLINK_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_SMARTLINK_URL ?? '';

/**
 * Direct Link used by the player overlay. Set this to your Adsterra Direct Link
 * or PropellerAds Direct Link URL. When empty the overlay never renders, so the
 * player behaves exactly as if no monetisation were present.
 * 
 * CRITICAL: Frequency capped at 3 triggers per 10 minutes per user.
 * Only fires on watch pages (not browse/detail).
 */
export const DIRECT_LINK_URL = process.env.NEXT_PUBLIC_ADSTERRA_DIRECT_LINK_URL ?? '';

/** Load delays, in ms after hydration.
 * 
 * CONSERVATIVE DELAYS to avoid Core Web Vitals impact and network penalties:
 * - socialBar: 3500ms (3.5s) - after LCP committed, minimum for Lighthouse
 * - popunder: 30000ms (30s) - user engaged, not bounce
 * - nativeBanner: lazyOnload (browser idle)
 * - inContent: lazyOnload (browser idle)
 * - directLink: immediate on first click (user intent)
 */
export const AD_DELAYS = {
  socialBar: 3500,
  popunder: 30000,
} as const;

/** Minimum delay before any ad script can load (3.5s for Lighthouse 90+) */
export const MIN_AD_DELAY = 3500;

/** User interaction events that trigger ad loading */
export const INTERACTION_EVENTS = ['scroll', 'mousemove', 'touchstart', 'keydown', 'click'] as const;

/** Reserved heights. Every ad container declares one before the network responds.
 * Prevents CLS (Cumulative Layout Shift) when ads load or are blocked.
 */
export const AD_RESERVED_HEIGHT = {
  inContent: 'min-h-[250px]',
  native: 'min-h-[90px]',
} as const;

/** Anti-ban guardrail for the player overlay (Direct Link).
 * 
 * CONSERVATIVE: 3 triggers per 10 minutes = max ~43/day per user.
 * Networks ban at ~5-10 per session. This stays well under.
 * 
 * Storage: localStorage (persists across sessions)
 * Fallback: in-memory (private mode/quota exceeded)
 */
export const DIRECT_LINK_CAP = {
  maxTriggers: 3,
  windowMs: 10 * 60 * 1000,
  storageKey: 'cineverse:directlink:v1',
} as const;

/** Popunder frequency cap - separate from Direct Link.
 * 
 * Adsterra allows ~1 popunder per 30 min per IP.
 * We enforce 1 per 30 min via sessionStorage (session-only).
 * This prevents accidental double-fires from navigation.
 */
export const POPUNDER_CAP = {
  maxTriggers: 1,
  windowMs: 30 * 60 * 1000,
  storageKey: 'cineverse:popunder:v1',
} as const;

/** Social Bar frequency cap.
 * 
 * Show once per session. Sticky bar = high annoyance, low revenue.
 * Only on browse/detail pages (never watch).
 */
export const SOCIAL_BAR_CAP = {
  maxTriggers: 1,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  storageKey: 'cineverse:socialbar:v1',
} as const;

/** Revenue optimization: ad viewability tracking endpoints.
 * 
 * Set NEXT_PUBLIC_AD_VIEWABILITY_ENDPOINT to your analytics endpoint.
 * Payload: { slotId, viewable: boolean, timestamp, userAgent }
 */
export const AD_VIEWABILITY_ENDPOINT = process.env.NEXT_PUBLIC_AD_VIEWABILITY_ENDPOINT ?? '';

/** Fallback ad network configuration.
 * 
 * If Adsterra blocks domain, swap to backup network via env var.
 * Format: 'adsterra' | 'propellerads' | 'hilltopads' | 'none'
 */
export const FALLBACK_AD_NETWORK = (process.env.NEXT_PUBLIC_FALLBACK_AD_NETWORK as 'adsterra' | 'propellerads' | 'hilltopads' | 'none') ?? 'none';

/** PropellerAds backup zone IDs (set if using fallback) */
export const PROPELLERADS_ZONES = {
  popunder: process.env.NEXT_PUBLIC_PROPELLERADS_POPUNDER_ZONE ?? '',
  directLink: process.env.NEXT_PUBLIC_PROPELLERADS_DIRECT_LINK_ZONE ?? '',
  interstitial: process.env.NEXT_PUBLIC_PROPELLERADS_INTERSTITIAL_ZONE ?? '',
} as const;

/** HilltopAds backup zone IDs (set if using fallback) */
export const HILLTOPADS_ZONES = {
  popunder: process.env.NEXT_PUBLIC_HILLTOPADS_POPUNDER_ZONE ?? '',
  directLink: process.env.NEXT_PUBLIC_HILLTOPADS_DIRECT_LINK_ZONE ?? '',
  banner: process.env.NEXT_PUBLIC_HILLTOPADS_BANNER_ZONE ?? '',
} as const;