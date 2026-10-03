'use client';

/**
 * Adsterra Native Banner.
 *
 * ── WHY THIS COMPONENT RENDERS EXACTLY ONE SLOT ──────────────────────────────
 * You asked for four native banners per page. That is not possible with the
 * zone you supplied, and shipping four anyway would have looked like it worked
 * while quietly earning nothing.
 *
 * The native banner zone is bound to ONE container id — here
 * `container-89898e7af070f78c4da937a6a83f13c7`, the hash from your zone URL. The
 * invoke.js loader walks the document for that id and fills the FIRST match. A
 * second element with the same id is invalid HTML, and the loader will not fill
 * it. So on any given page:
 *
 *   - 1 instance  → fills, earns
 *   - 2+ instances → one fills, the rest stay empty forever
 *
 * There is therefore exactly ONE `NativeBannerAd` in the tree, in the root
 * layout. An earlier version tried to police this at runtime with a module-level
 * `claimed` flag so that extra instances would render `null`. That was wrong in a
 * way worth recording, because the symptom looked unrelated:
 *
 *   - The module is shared across requests on the server. The first request
 *     rendered the ad and set `claimed = true`; every request after it rendered
 *     nothing. Server output therefore depended on request order.
 *   - On the client the flag started `false`, so the first render did not match
 *     whatever the server had emitted. That surfaced as a hydration mismatch on
 *     the homepage, in a component far from the ad code.
 *
 * A guard whose result depends on mutable state outside React cannot be correct
 * under SSR. The duplicate instances are removed instead, and this component is
 * a plain stateless render — no flag, no claim, nothing to desync.
 *
 * To get four banners you need four ZONES. Create three more in the Adsterra
 * dashboard, put their hashes in `src/config/ads.ts` as EXTRA_NATIVE_ZONES, and
 * add them here. Each new zone gets its own container and its own fill.
 *
 * For repeatable slots with the single zone you already have, use `AdSlot` /
 * `BannerSlots` instead — the in-content format explicitly supports many
 * instances on one page because each slot is given a unique container id.
 */
import Script from 'next/script';

import {
  AD_RESERVED_HEIGHT,
  NATIVE_BANNER_CONTAINER_ID,
  NATIVE_BANNER_URL,
} from '@/config/ads';
import { AdFrame, AdSkeleton, useAdFilled } from './primitives';

export function NativeBannerAd({
  className,
  label = 'Advertisement',
}: {
  className?: string;
  label?: string;
}) {
  const { filled } = useAdFilled(NATIVE_BANNER_CONTAINER_ID);

  if (!NATIVE_BANNER_CONTAINER_ID) return null;

  return (
    <>
      <AdFrame label={label} heightClass={AD_RESERVED_HEIGHT.native} className={className}>
        {!filled && <AdSkeleton className={AD_RESERVED_HEIGHT.native} label={label} />}
        <div
          id={NATIVE_BANNER_CONTAINER_ID}
          className="w-full"
          suppressHydrationWarning
        />
      </AdFrame>

      <Script
        id="adsterra-native-banner"
        src={NATIVE_BANNER_URL}
        strategy="lazyOnload"
        async
        onError={() =>
          console.error(
            `[adsterra] native banner failed to load from ${NATIVE_BANNER_URL}. ` +
              'Check the zone is active and that CSP script-src allows *.profitableratecpmnetwork.com.'
          )
        }
      />
    </>
  );
}

export default NativeBannerAd;