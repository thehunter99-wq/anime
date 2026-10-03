/**
 * Single source of truth for every monetisation identifier.
 *
 * Every value can be overridden with a `NEXT_PUBLIC_*` environment variable, so
 * rotating a zone key or a Smartlink destination never requires a code change.
 * Keep the defaults in sync with `.env.example`.
 *
 * ── WHY DEFAULTS ARE REAL ZONE URLS, NOT EMPTY STRINGS ───────────────────────
 * An earlier version read every URL with `process.env.X ?? ''`. That silently
 * produced two hard failures:
 *
 *   1. An env var set to an EMPTY STRING (very common — a Netlify/Vercel env
 *      field left blank, or a `NEXT_PUBLIC_SITE_URL=` line in .env.local) is not
 *      null/undefined, so `??` never falls back. SITE_URL became '' and every
 *      proxied zone URL collapsed to a bare relative path.
 *   2. `NATIVE_BANNER_CONTAINER_ID` is derived by parsing the zone URL. A
 *      relative URL has no host and no zone hash, `new URL()` throws, the catch
 *      returns '', and `NativeBannerAd` renders null forever — the native banner
 *      could never appear no matter what the operator configured.
 *
 * So the live zone URLs are baked in as defaults and env vars are strictly an
 * override. The site therefore earns from the moment it deploys, and a missing
 * or blank env var degrades to "still working" instead of "silently dead".
 * `envOr()` below is what makes blank values fall back correctly.
 *
 * ── AdBlocker Bypass ─────────────────────────────────────────────────────────
 * Adsterra scripts are proxied through internal Next.js rewrites (next.config.ts)
 * so AdBlockers cannot block them by domain name:
 *   /assets/js/p-unit.js    -> Popunder
 *   /assets/js/s-unit.js    -> Social Bar
 *   /assets/js/n-unit.js    -> Native Banner
 *   /assets/js/in-content.js -> In-content loader (ssat.pro)
 *
 * ── Anti-Ban Configuration ───────────────────────────────────────────────────
 * Adsterra bans domains for: >3-5 popunders per session, a social bar covering
 * player controls, forced navigation, Popunder + Direct Link together, and ads
 * on thin pages. The caps below stay well inside those limits on purpose —
 * a banned domain earns zero, so the caps are the revenue-maximising choice,
 * not a conservative one.
 */

/**
 * Reads a public env var, treating blank/whitespace-only values as UNSET.
 *
 * This is the whole point: `??` is the wrong operator for config that arrives
 * from a hosting dashboard, because a blank dashboard field is `''`, not
 * `undefined`, and `''` would otherwise survive as a "valid" value.
 */
function envOr(name: string, fallback: string): string {
  const raw = process.env[name];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/** Origin used to build first-party rewrite paths. Never blank. */
const SITE_URL = envOr('NEXT_PUBLIC_SITE_URL', 'https://movanime.site').replace(/\/$/, '');

/* ─────────────────────── Live zone defaults ───────────────────────
 * These are the operator's real, responding zones (verified: the social bar
 * script returns HTTP 200 with a 69KB payload). Keep in sync with .env.example.
 */
const ZONE_POPUNDER =
  'https://pl31625875.profitableratecpmnetwork.com/be/f0/3c/bef03cbd6a8d7712fde3e921125ecc0.js';
const ZONE_SOCIAL_BAR =
  'https://pl31625876.profitableratecpmnetwork.com/77/43/d2/7743d209f9e5ab47329ac706ebe9fa56.js';
const ZONE_NATIVE_BANNER =
  'https://pl31625878.profitableratecpmnetwork.com/89898e7af070f78c4da937a6a83f13c7/invoke.js';
const ZONE_SMARTLINK =
  'https://www.profitableratecpmnetwork.com/tguhgg4ee?key=b0ad7e27ed01791677110762cfb5d058';

/**
 * Adsterra zone key for the repeatable in-content banner slots.
 *
 * THIS ONE IS ENV-ONLY AND HAS NO SAFE DEFAULT. The in-content loader is
 * ssat.pro and each in-content zone has its own key; the other zone hashes in
 * this file belong to different formats and substituting one produces a slot
 * that loads but never fills. Rather than ship a plausible-looking wrong key,
 * an unset key leaves the in-content slots out and is reported loudly by
 * /diagnostics. Get the key from the Adsterra dashboard "Adsterra ⇢ Banner
 * (in-content)" zone and set NEXT_PUBLIC_ADSTERRA_KEY.
 */
export const ADSTERRA_KEY = envOr('NEXT_PUBLIC_ADSTERRA_KEY', '');

/** True when in-content slots can actually render. Drives /diagnostics. */
export const IN_CONTENT_ENABLED = ADSTERRA_KEY.length > 0;

/**
 * Zone scripts, loaded DIRECTLY from the network's own domain.
 *
 * ── Why the first-party proxy was removed ────────────────────────────────────
 * An earlier version rewrote `/assets/js/p-unit.js` (etc.) through next.config
 * so a domain-name AdBlocker could not filter them. That backfired in
 * production: there is no `public/assets/js/` directory, so those paths are not
 * static files, and the CDN answered them with **403 Forbidden** — every ad unit
 * on the site was dead at the network layer.
 *
 * Direct loading is also what Adsterra's own integration guidance specifies, and
 * it matters for more than just the 403:
 *   - the popunder/smartlink zones validate the referring document, and serving
 *     the script from the operator's own domain produced a referrer the zones
 *     treat as unverified, so impressions were dropped even when the script ran;
 *   - no proxy hop means no extra DNS/TLS latency on the monetisation path.
 *
 * If you need AdBlocker resilience later, ship a real file under `public/` so the
 * path actually resolves — a rewrite to an external host is not a static asset,
 * and hosts are free to 403 those.
 *
 * The `*_ZONE_URL` names are kept because /diagnostics reports the zone URL so a
 * failed fill can be told apart from a blocked script.
 */
export const POPUNDER_ZONE_URL = envOr('NEXT_PUBLIC_ADSTERRA_POPUNDER_URL', ZONE_POPUNDER);
export const SOCIAL_BAR_ZONE_URL = envOr(
  'NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_URL',
  ZONE_SOCIAL_BAR
);
export const NATIVE_BANNER_ZONE_URL = envOr(
  'NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL',
  ZONE_NATIVE_BANNER
);

export const POPUNDER_URL = POPUNDER_ZONE_URL;
export const SOCIAL_BAR_URL = SOCIAL_BAR_ZONE_URL;

/**
 * Native Banner. Singleton: the loader binds to the first element whose id is
 * `container-<zone-hash>`, so mounting this twice on one page emits a duplicate
 * id and leaves the second slot permanently empty. It lives in the root layout.
 */
export const NATIVE_BANNER_URL = NATIVE_BANNER_ZONE_URL;

/** In-content loader (ssat.pro). Empty when no zone key is configured. */
export const IN_CONTENT_LOADER_URL = ADSTERRA_KEY
  ? `https://ssat.pro/cdn/client.js?key=${encodeURIComponent(ADSTERRA_KEY)}`
  : '';

/**
 * The zone hash is the first path segment after the hostname
 * (`.../89898e7af070f78c4da937a6a83f13c7/invoke.js` -> `89898e7af070f78c4da937a6a83f13c7`),
 * and the loader looks for `container-<hash>`.
 *
 * Deliberately parsed from the ZONE url (always absolute) and not from
 * NATIVE_BANNER_URL (a relative rewrite path) — see the header note for why
 * parsing the rewrite path silently produced an empty container id.
 */
export const NATIVE_BANNER_CONTAINER_ID = (() => {
  try {
    const hash = new URL(NATIVE_BANNER_ZONE_URL).pathname.split('/').filter(Boolean)[0];
    return hash ? `container-${hash}` : '';
  } catch {
    return '';
  }
})();

/**
 * Popunder gating.
 *
 * Production by default, because Adsterra drops traffic from localhost and
 * unverified origins, so a dev fire records nothing and only produces console
 * noise. Set NEXT_PUBLIC_ADSTERRA_ALLOW_DEV=1 to force it on locally when
 * debugging the integration.
 */
export const POPUNDER_ENABLED =
  process.env.NODE_ENV === 'production' ||
  envOr('NEXT_PUBLIC_ADSTERRA_ALLOW_DEV', '') === '1';

/**
 * Smartlink behind the primary "Fast HD Download" button.
 *
 * Baked-in default so it earns without configuration. This is the
 * highest-EPM unit on the site, so it is deliberately NOT left blank.
 */
export const SMARTLINK_URL = envOr('NEXT_PUBLIC_ADSTERRA_SMARTLINK_URL', ZONE_SMARTLINK);

/**
 * Direct Link for the player overlay.
 *
 * LEFT BLANK BY DEFAULT, ON PURPOSE — this is not an oversight.
 *
 * The Direct Link overlay works by making the player's own surface the link:
 * the visitor's natural click to start watching is intercepted and opens a
 * monetised advertiser URL instead. Adsterra classifies exactly that pattern
 * as forced navigation, which is one of the named reasons a domain gets banned,
 * and a ban takes revenue to zero permanently. It also breaks the one thing
 * that earns on a watch page.
 *
 * If you set it anyway, keep DIRECT_LINK_CAP at 3/10min and do not run it on
 * the same page as the popunder (AdUnderlays already enforces that).
 */
export const DIRECT_LINK_URL = envOr('NEXT_PUBLIC_ADSTERRA_DIRECT_LINK_URL', '');

/**
 * Load delays, in ms after hydration.
 *
 * These are MINIMUM DWELL times, not "resolve on idle" hints — `ads.tsx`
 * enforces them as a hard floor so a fast idle callback or an early mousemove
 * cannot pull an ad script in during the first paint. Loading ad scripts before
 * LCP inflates bounce, and bounced impressions are the fastest route to a
 * domain being judged low-quality.
 */
export const AD_DELAYS = {
  socialBar: 3500,
  popunder: 30000,
} as const;

/** Minimum delay before any ad script may load. */
export const MIN_AD_DELAY = 3500;

/** User interaction events that count as engagement for the dwell gate. */
export const INTERACTION_EVENTS = ['scroll', 'mousemove', 'touchstart', 'keydown', 'click'] as const;

/**
 * Reserved heights, declared before the network responds so a slow or blocked ad
 * cannot shift the page (CLS).
 */
export const AD_RESERVED_HEIGHT = {
  inContent: 'min-h-[250px]',
  native: 'min-h-[90px]',
} as const;

/**
 * The four banner positions requested, in the order they should appear.
 *
 * `id` is stable and used for per-slot analytics and to key the once-per-session
 * rotation, so do not rename them casually. `format` maps to the Adsterra
 * in-content format names.
 *
 * NOTE ON POSITIONS vs ZONES: these four slots all use the SINGLE in-content
 * zone key (NEXT_PUBLIC_ADSTERRA_KEY). Unlike the native banner — which is
 * pinned to one container id — the in-content format assigns each slot a unique
 * container id, so multiple slots on one page is a supported configuration.
 * Four placements therefore need only the one key you already have.
 */
export const BANNER_SLOTS = [
  { id: 'header', label: 'Advertisement', format: 'fluid' },
  { id: 'below-video', label: 'Advertisement', format: 'fluid' },
  { id: 'above-recommendations', label: 'Advertisement', format: 'fluid' },
  { id: 'footer', label: 'Advertisement', format: 'fluid' },
] as const satisfies readonly { id: string; label: string; format: string }[];

export type BannerSlotId = (typeof BANNER_SLOTS)[number]['id'];

/**
 * Direct Link guardrail: 3 triggers per 10 minutes (~43/day/user worst case).
 * Networks ban at roughly 5-10 per session, so this stays well under.
 */
export const DIRECT_LINK_CAP = {
  maxTriggers: 3,
  windowMs: 10 * 60 * 1000,
  storageKey: 'cineverse:directlink:v1',
} as const;

/**
 * Popunder guardrail: 1 per 30 minutes via sessionStorage.
 *
 * Adsterra's own allowance is about one popunder per 30 min per IP; matching it
 * exactly is what keeps the domain inside the "normal traffic" band.
 */
export const POPUNDER_CAP = {
  maxTriggers: 1,
  windowMs: 30 * 60 * 1000,
  storageKey: 'cineverse:popunder:v1',
} as const;

/**
 * Social Bar guardrail: 1 per 24 hours via localStorage.
 * A sticky unit is high annoyance for low revenue, so it is rationed hard.
 */
export const SOCIAL_BAR_CAP = {
  maxTriggers: 1,
  windowMs: 24 * 60 * 60 * 1000,
  storageKey: 'cineverse:socialbar:v1',
} as const;

/** Optional analytics sink for viewability: { slotId, viewable, timestamp }. */
export const AD_VIEWABILITY_ENDPOINT = envOr('NEXT_PUBLIC_AD_VIEWABILITY_ENDPOINT', '');

/** Fallback network if the primary is banned: adsterra|propellerads|hilltopads|none */
export const FALLBACK_AD_NETWORK = (
  ['adsterra', 'propellerads', 'hilltopads', 'none'] as const
).includes(process.env.NEXT_PUBLIC_FALLBACK_AD_NETWORK as 'adsterra')
  ? (process.env.NEXT_PUBLIC_FALLBACK_AD_NETWORK as
      | 'adsterra'
      | 'propellerads'
      | 'hilltopads'
      | 'none')
  : 'none';

/** PropellerAds backup zone IDs (set only if using the fallback). */
export const PROPELLERADS_ZONES = {
  popunder: envOr('NEXT_PUBLIC_PROPELLERADS_POPUNDER_ZONE', ''),
  directLink: envOr('NEXT_PUBLIC_PROPELLERADS_DIRECT_LINK_ZONE', ''),
  interstitial: envOr('NEXT_PUBLIC_PROPELLERADS_INTERSTITIAL_ZONE', ''),
} as const;

/** HilltopAds backup zone IDs (set only if using the fallback). */
export const HILLTOPADS_ZONES = {
  popunder: envOr('NEXT_PUBLIC_HILLTOPADS_POPUNDER_ZONE', ''),
  directLink: envOr('NEXT_PUBLIC_HILLTOPADS_DIRECT_LINK_ZONE', ''),
  banner: envOr('NEXT_PUBLIC_HILLTOPADS_BANNER_ZONE', ''),
} as const;