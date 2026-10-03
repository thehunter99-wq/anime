'use client';

import { usePathname } from 'next/navigation';

import { DIRECT_LINK_URL } from '@/config/ads';
import { AdsterraPopunder, AdsterraSocialBar } from '@/components/ads';

/**
 * Decides which underlays load on which route.
 *
 * Three rules, all about not getting the account banned:
 *
 * 1. The Social Bar is suppressed on the player. It renders as a sticky unit
 *    pinned to a viewport edge, which over a full-screen player lands on the
 *    seek bar, volume and fullscreen controls. That is the worst placement on
 *    the site: it breaks playback and reads as a broken player rather than an
 *    ad. Watch pages still monetise through the in-content slot below the
 *    player and the Smartlink on the detail page.
 *
 * 2. On the player the popunder is suppressed ONLY when a Direct Link is
 *    configured. Both firing together means two new tabs from one click, which
 *    networks read as forced navigation — the fastest route to a ban. With no
 *    Direct Link set the popunder keeps earning.
 *
 * 3. `/download/...` and the legacy `/watch/...` routes are treated as player
 *    routes too. They are terminal conversion pages, and an underlay opening a
 *    tab on the click that starts a download is the single most likely way to
 *    lose a download and a domain at the same time.
 *
 * Browse and detail pages keep both underlays: impressions are cheapest there
 * and the visitor is least likely to be interrupted mid-playback.
 *
 * Caps enforced inside the units themselves: popunder 1/30min
 * (sessionStorage), social bar 1/24h (localStorage).
 */
export default function AdUnderlays() {
  const pathname = usePathname() ?? '';
  const isPlayerRoute =
    pathname.startsWith('/view/') ||
    pathname.startsWith('/watch/') ||
    pathname.startsWith('/download/');

  return (
    <>
      {!isPlayerRoute && <AdsterraSocialBar />}
      {!(isPlayerRoute && DIRECT_LINK_URL) && <AdsterraPopunder />}
    </>
  );
}