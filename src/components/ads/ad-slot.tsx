'use client';

/**
 * In-content banner slot (Adsterra).
 *
 * ── HOW THIS ZONE ACTUALLY WORKS ─────────────────────────────────────────────
 * The Adsterra in-content zone is served by the same CDN as the native banner,
 * parameterised by zone hash, and it fills by SCANNING THE DOM FOR
 * `container-<hash>`. It does not consume `atOptions`; there is no queue and no
 * `ssat.pro`.
 *
 * Two earlier assumptions were both wrong and together made every slot dead:
 *
 *  1. `IN_CONTENT_LOADER_URL` pointed at `https://ssat.pro/cdn/client.js?key=…`.
 *     That host has no DNS record, so the loader never loaded.
 *  2. The slot pushed its config via an inline `<script>` that set `atOptions`.
 *     Even with a working loader, `script-src` here contains `strict-dynamic`,
 *     which makes browsers IGNORE `'unsafe-inline'`; inline scripts are then
 *     allowed only with the request nonce, and `dangerouslySetInnerHTML` cannot
 *     carry one. The push was silently blocked.
 *
 * The container-scan mechanism sidesteps both: the zone hash lives in the script
 * URL (allowed by the host list in `script-src`) and the container id is a plain
 * DOM attribute, so nothing inline is needed.
 *
 * ── ONE ZONE, MANY SLOTS ─────────────────────────────────────────────────────
 * Unlike the native banner, this mechanism binds per container element, so
 * several slots on one page each fill independently. That is what makes the four
 * placements possible from the single zone key.
 *
 * NOTE: this format is filled by the zone script at runtime. Server-rendered HTML
 * shows the empty container only; that is expected and not a failure.
 */
import Script from 'next/script';
import { useId } from 'react';

import {
  AD_RESERVED_HEIGHT,
  ADSTERRA_KEY,
  IN_CONTENT_ZONE_URL,
} from '@/config/ads';
import { AdFrame, AdSkeleton, useAdFilled } from './primitives';

export type AdSlotProps = {
  className?: string;
  label?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
};

export function AdSlot({ className, label, format = 'auto' }: AdSlotProps) {
  const reactId = useId();
  const slotId = `adsterra-${format}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const { filled } = useAdFilled(slotId);
  const enabled = ADSTERRA_KEY.length > 0 && IN_CONTENT_ZONE_URL.length > 0;

  // Unconditional render guard: every hook above has already run.
  if (!enabled) return null;

  return (
    <AdFrame label={label} heightClass={AD_RESERVED_HEIGHT.inContent} className={className}>
      {!filled && <AdSkeleton className={AD_RESERVED_HEIGHT.inContent} label={label} />}

      {/*
        Always visible. An earlier version held this at `opacity-0` until the
        fill poll succeeded, so a blocked or dead zone produced a silently empty
        box — indistinguishable from "no ad configured". A visible grey
        placeholder at least tells you the slot exists and is waiting.

        `z-10` keeps the creative above the skeleton while both are present.

        ── The id must be PER-SLOT, not the shared zone id ────────────────────
        An earlier revision set `id={IN_CONTENT_CONTAINER_ID}`, which is a module
        constant. Every slot therefore rendered the SAME id, so a page with four
        slots shipped four elements with one duplicate id. Two consequences, both
        observed live:

          - `getElementById` returns only the first match, so slots 2-4 polled
            element #1 forever and could never reach their own filled state.
          - Duplicate ids are invalid HTML and are a classic trigger for React's
            "tree will be regenerated on the client" recovery — which wipes the
            ad container the zone script had just filled.

        The per-slot id from `useId` is unique and stable across SSR and client,
        so the container the script fills is the container the poll watches.
        The zone is selected by the SCRIPT URL, not by the container id, so a
        per-slot container costs nothing: one zone script fills every matching
        container on the page.
      */}
      <div
        id={slotId}
        data-ad-slot-id={slotId}
        data-ad-format={format}
        data-ad-zone={ADSTERRA_KEY}
        className="adsterra relative z-10 w-full"
        suppressHydrationWarning
      />

      <Script
        id={`adsterra-loader-${slotId}`}
        src={IN_CONTENT_ZONE_URL}
        strategy="lazyOnload"
        async
        onError={() =>
          console.error(
            `[adsterra] in-content loader failed to load from ${IN_CONTENT_ZONE_URL}. ` +
              'Check the zone is active and that CSP script-src allows ' +
              '*.profitableratecpmnetwork.com.'
          )
        }
      />
    </AdFrame>
  );
}

export default AdSlot;