'use client';

import { usePathname } from 'next/navigation';

import { DIRECT_LINK_URL } from '@/config/ads';
import { AdsterraPopunder, AdsterraSocialBar } from '@/components/ads';

/**
 * Decides which underlays load on which page.
 *
 * Two rules, both about not burning the account:
 *
 * 1. The Social Bar is suppressed on the watch route. It renders as a sticky
 *    bar pinned to the viewport edge, which on a full-screen player sits directly
 *    over the seek bar, volume and fullscreen controls. That is the single worst
 *    placement on the site: it breaks playback and reads as a broken player
 *    rather than an ad. Monetisation there comes from the in-content slot below
 *    the player and, when configured, the Direct Link overlay.
 *
 * 2. On the watch route the popunder is suppressed only when a Direct Link is
 *    configured. Both firing at once would open two new tabs from one click,
 *    which is the pattern networks treat as forced navigation and the fastest
 *    route to a ban. With no Direct Link configured the popunder keeps earning.
 *
 * Browse and detail pages keep both underlays, which is where impressions are
 * cheapest and the visitor is least likely to be interrupted mid-playback.
 *
 * Both underlays now have their own frequency caps enforced internally:
 * - Popunder: 1 per 30 minutes (sessionStorage)
 * - Social Bar: 1 per 24 hours (localStorage)
 */
export default function AdUnderlays() {
  const pathname = usePathname();
  const isWatchPage = pathname?.startsWith('/view/') ?? false;

  return (
    <>
      {!isWatchPage && <AdsterraSocialBar />}
      {!(isWatchPage && DIRECT_LINK_URL) && <AdsterraPopunder />}
    </>
  );
}