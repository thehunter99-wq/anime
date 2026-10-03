'use client';

import Script from 'next/script';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import {
  AD_RESERVED_HEIGHT,
  ADSTERRA_KEY,
  IN_CONTENT_LOADER_URL,
  NATIVE_BANNER_CONTAINER_ID,
  NATIVE_BANNER_URL,
} from '@/config/ads';
import { cn } from '@/lib/utils';

/**
 * Polls a container until the ad network has injected children into it.
 *
 * Returns a cleanup function. Two details matter:
 *
 *  - It gives up after `timeoutMs`. The previous version polled forever, so a
 *    blocked or empty zone left an infinite interval running and the skeleton
 *    never went away — the page kept a permanent 250px grey box that looked
 *    broken. Timing out and collapsing the slot is the correct failure mode: an
 *    unfilled reserved space reads as "ad did not load", a permanent skeleton
 *    reads as "this site is broken".
 *  - It never sets state after unmount, which would warn on every navigation.
 */
function useAdFilled(getContainer: () => HTMLElement | null, timeoutMs = 6000): boolean {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      if (cancelled) return;
      const el = getContainer();
      if (el && el.children.length > 0) {
        setFilled(true);
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        // Zone never filled (blocked, or no fill for this geo). Collapse rather
        // than hold the space open forever.
        setFilled(true);
      }
    };

    const startedAt = Date.now();
    const timer = window.setInterval(check, 400);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutMs]);

  return filled;
}

function AdSkeleton({ height }: { height: string }) {
  return (
    <div
      className={cn(
        'flex w-full animate-pulse items-center justify-center overflow-hidden rounded-xl',
        'bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50',
        height
      )}
      aria-hidden="true"
    >
      <div className="h-2 w-1/2 rounded-full bg-slate-200" />
    </div>
  );
}

type AdSlotProps = {
  className?: string;
  label?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
};

/**
 * In-content banner slot (Adsterra via ssat.pro).
 *
 * Two bugs fixed here, both of which made every in-content slot dead:
 *
 *  1. `if (!ADSTERRA_KEY) return null` sat BETWEEN `useId`/`useState` and
 *     `useEffect`. That is a conditional hook, so whenever the key went from
 *     unset to set (or back) React threw "Rendered fewer hooks than expected"
 *     and tore down the subtree. Hooks are now unconditional; the early return
 *     happens after them.
 *  2. The skeleton was shown whenever the ad had not yet filled, and the old
 *     poll never resolved on failure. Slots now collapse after a timeout.
 */
export function AdSlot({ className, label, format = 'auto' }: AdSlotProps) {
  const reactId = useId();
  const slotId = `adsterra-${format}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const containerRef = useCallback(
    () => document.getElementById(slotId) as HTMLElement | null,
    [slotId]
  );
  const settled = useAdFilled(containerRef);
  const adLoaded = settled && containerRef()?.children.length !== 0;

  // Unconditional render guard: all hooks above have already run.
  if (!ADSTERRA_KEY || !IN_CONTENT_LOADER_URL) return null;

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50/40',
        AD_RESERVED_HEIGHT.inContent,
        className
      )}
    >
      {!adLoaded && <AdSkeleton height={AD_RESERVED_HEIGHT.inContent} />}
      <div
        id={slotId}
        className={cn(
          'adsterra w-full transition-opacity duration-300',
          adLoaded ? 'opacity-100' : 'opacity-0'
        )}
        suppressHydrationWarning
      >
        <script
          type="text/javascript"
          // ADSTERRA_KEY is a 32-char hex zone id owned by the site operator;
          // the surrounding quotes are fixed, so this cannot break out.
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
        onError={() => console.warn('[Adsterra] In-content loader failed to load.')}
      />
    </aside>
  );
}

type NativeBannerAdProps = {
  className?: string;
  label?: string;
};

/**
 * Native Banner (Adsterra).
 *
 * SINGLETON — the loader binds to the first element whose id is
 * `container-<zone-hash>`, so mounting twice on one page emits a duplicate id
 * and leaves the second slot permanently empty. Keep the single instance in the
 * root layout and use `AdSlot` for every additional position.
 *
 * The same conditional-hook bug as `AdSlot` is fixed here: the container-id
 * check now runs after the hooks.
 */
export function NativeBannerAd({ className, label }: NativeBannerAdProps) {
  const containerRef = useCallback(
    () =>
      (NATIVE_BANNER_CONTAINER_ID
        ? document.getElementById(NATIVE_BANNER_CONTAINER_ID)
        : null) as HTMLElement | null,
    []
  );
  const settled = useAdFilled(containerRef);
  const adLoaded = settled && containerRef()?.children.length !== 0;

  if (!NATIVE_BANNER_CONTAINER_ID) return null;

  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl',
        'border border-slate-200/60 bg-slate-50/40',
        AD_RESERVED_HEIGHT.native,
        className
      )}
    >
      {!adLoaded && <AdSkeleton height={AD_RESERVED_HEIGHT.native} />}
      <aside
        aria-label={label ?? 'Advertisement'}
        className={cn(
          'w-full transition-opacity duration-300',
          adLoaded ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div id={NATIVE_BANNER_CONTAINER_ID} className="w-full" suppressHydrationWarning />
      </aside>
      <Script
        id="adsterra-native-banner"
        src={NATIVE_BANNER_URL}
        strategy="lazyOnload"
        async
        onError={() => console.warn('[Adsterra] Native banner script failed to load.')}
      />
    </div>
  );
}