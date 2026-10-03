'use client';

/**
 * In-content banner slot (Adsterra via ssat.pro).
 *
 * Unlike the native banner, THIS format genuinely supports many slots per page:
 * the loader keys off the unique container id pushed in `atOptions`, so two
 * instances never collide. That is why the four requested placements can all
 * run off the single zone key.
 *
 * Two bugs fixed here, both of which made every in-content slot dead:
 *
 *  1. `if (!ADSTERRA_KEY) return null` used to sit BETWEEN `useId`/`useState` and
 *     `useEffect`. That is a conditional hook, so whenever the key went from
 *     unset to set (or back) React threw "Rendered fewer hooks than expected" and
 *     tore down the subtree. All hooks now run unconditionally; the early return
 *     happens after them.
 *  2. The skeleton showed whenever the ad had not yet filled and the old poll
 *     never resolved on failure. Slots now collapse after a timeout.
 */
import Script from 'next/script';
import { useId } from 'react';

import { AD_RESERVED_HEIGHT, ADSTERRA_KEY, IN_CONTENT_LOADER_URL } from '@/config/ads';
import { AdFrame, AdSkeleton, useAdFilled } from './primitives';

export type AdSlotProps = {
  className?: string;
  label?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
};

export function AdSlot({ className, label, format = 'auto' }: AdSlotProps) {
  const reactId = useId();
  // Strip the colons React puts in useId output — they are legal in an id but
  // make the id awkward to reference from the network's loader.
  const slotId = `adsterra-${format}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const { filled } = useAdFilled(slotId);
  const enabled = ADSTERRA_KEY.length > 0 && IN_CONTENT_LOADER_URL.length > 0;

  // Unconditional render guard: every hook above has already run.
  if (!enabled) return null;

  return (
    <AdFrame label={label} heightClass={AD_RESERVED_HEIGHT.inContent} className={className}>
      {!filled && <AdSkeleton className={AD_RESERVED_HEIGHT.inContent} label={label} />}

      <div
        id={slotId}
        className={
          filled
            ? 'adsterra w-full transition-opacity duration-300 opacity-100'
            : 'adsterra w-full transition-opacity duration-300 opacity-0'
        }
        suppressHydrationWarning
      >
        <script
          type="text/javascript"
          // ADSTERRA_KEY is a 32-char hex zone id owned by the site operator; the
          // surrounding quotes are fixed, so this cannot break out.
          dangerouslySetInnerHTML={{
            __html: `(atOptions = atOptions || []).push({ key: '${ADSTERRA_KEY}', format: '${format}', params: {} });`,
          }}
        />
      </div>

      <Script
        id={`adsterra-loader-${slotId}`}
        src={IN_CONTENT_LOADER_URL}
        strategy="lazyOnload"
        async
        onError={() =>
          console.warn(
            `[adsterra] in-content loader failed to load from ${IN_CONTENT_LOADER_URL}. ` +
              'Check NEXT_PUBLIC_ADSTERRA_KEY is a valid in-content zone key and that CSP ' +
              'script-src allows ssat.pro.'
          )
        }
      />
    </AdFrame>
  );
}

export default AdSlot;