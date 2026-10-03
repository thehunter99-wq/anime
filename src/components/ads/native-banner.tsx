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
 * This component also GUARDS against mounting twice: the first instance claims
 * the container id and later ones render nothing, so a duplicate id can never
 * reach the DOM in the first place.
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
import { useEffect } from 'react';

import {
  AD_RESERVED_HEIGHT,
  NATIVE_BANNER_CONTAINER_ID,
  NATIVE_BANNER_URL,
} from '@/config/ads';
import { AdFrame, AdSkeleton, useAdFilled } from './primitives';

/** Set once per page load by whichever instance mounts first. */
let claimed = false;

export function NativeBannerAd({
  className,
  label = 'Advertisement',
}: {
  className?: string;
  label?: string;
}) {
  const { filled } = useAdFilled(NATIVE_BANNER_CONTAINER_ID);
  const owns = NATIVE_BANNER_CONTAINER_ID !== '' && !claimed;

  // Claim in an effect, never during render: render must stay free of side
  // effects so the server HTML and the first client render agree.
  useEffect(() => {
    if (owns) claimed = true;
  }, [owns]);

  if (!NATIVE_BANNER_CONTAINER_ID || !owns) return null;

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