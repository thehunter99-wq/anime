'use client';

import { usePathname } from 'next/navigation';

import { AdsterraPopunder, AdsterraSocialBar } from '@/components/ads';

/**
 * Site-wide underlays: the popunder and the social bar.
 *
 * ── Both now run on EVERY route, including the player ────────────────────────
 * The previous version removed the social bar on `/view|/watch|/download` and
 * removed the popunder when a Direct Link was configured. Watch pages are the
 * highest-traffic pages on the site, so those exclusions were throwing away
 * most of the available impressions on exactly the pages worth the most.
 *
 * Both units are still constrained, just by budget rather than by route:
 *   - Social bar: 1 per 24h (localStorage), site-wide.
 *   - Popunder: a 30-minute spacing floor plus a 4-per-session ceiling
 *     (sessionStorage), both in `lib/popunder-cap.ts`.
 *
 * Neither cap is route-dependent, so removing the route gate does not raise how
 * often a given visitor is monetised — it only decides WHICH page gets the single
 * social-bar impression and which page gets each popunder. The first page a
 * visitor lands on is now eligible, which is the impression that was previously
 * being dropped.
 *
 * ── Anti-ban ─────────────────────────────────────────────────────────────────
 * The one pattern Adsterra names that is avoided by construction: a popunder and
 * a forced-navigation Direct Link firing from the SAME click. The Direct Link
 * overlay (`player-overlay.tsx`) stays off unless `DIRECT_LINK_URL` is set, which
 * is blank by default, so today there is no Direct Link and nothing to collide
 * with. If one is ever configured, the popunder's 30-minute gap is what keeps two
 * tabs from opening at once.
 *
 * `rearmKey` is the pathname: it re-evaluates the popunder's refillable budget on
 * every client-side navigation, which is how the second and later permitted
 * impressions are actually collected in a long session.
 */
export default function AdUnderlays() {
  const pathname = usePathname() ?? '';

  return (
    <>
      <AdsterraSocialBar />
      <AdsterraPopunder rearmKey={pathname} />
    </>
  );
}