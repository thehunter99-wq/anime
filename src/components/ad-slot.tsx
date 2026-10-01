'use client';

import Script from 'next/script';
import { useId } from 'react';

import {
  AD_RESERVED_HEIGHT,
  ADSTERRA_KEY,
  IN_CONTENT_LOADER_URL,
  NATIVE_BANNER_CONTAINER_ID,
  NATIVE_BANNER_URL,
} from '@/config/ads';
import { cn } from '@/lib/utils';

/* ────────────────────────── In-content slot ────────────────────────── */

type AdSlotProps = {
  /**
   * Repeats freely: each instance gets its own id via `useId()`, which the
   * ssat.pro loader binds to. Safe below the player, inside grids and on detail
   * pages.
   */
  className?: string;
  label?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
};

/**
 * In-content Adsterra banner.
 *
 * The inline `atOptions.push` script is rendered in JSX on purpose rather than
 * injected from an effect: its contents are fixed at build time, so the server
 * and client emit byte-identical markup and there is no hydration mismatch.
 * Keeping it in JSX also guarantees it runs before the `afterInteractive`
 * loader below, which is what actually registers the slot.
 *
 * `useId()` supplies the slot id. A module-level counter is not safe here: it is
 * render-phase state that can desync between the streaming server pass and
 * hydration, producing a real `id` mismatch.
 */
export function AdSlot({ className, label, format = 'auto' }: AdSlotProps) {
  const reactId = useId();
  const slotId = `adsterra-${format}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // No zone key means no loader to register against, so render nothing rather
  // than an empty reserved box.
  if (!ADSTERRA_KEY) return null;

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={cn('w-full overflow-hidden', AD_RESERVED_HEIGHT.inContent, className)}
    >
      <div id={slotId} className="adsterra w-full" suppressHydrationWarning>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(atOptions = atOptions || []).push({ key: '${ADSTERRA_KEY}', format: '${format}', params: {} });`,
          }}
        />
      </div>
      <Script
        id={`adsterra-loader-${slotId}`}
        src={IN_CONTENT_LOADER_URL}
        strategy="afterInteractive"
        async
        onError={() => console.warn('[Adsterra] In-content loader failed to load.')}
      />
    </aside>
  );
}

/* ───────────────────────── Native banner ───────────────────────── */

type NativeBannerAdProps = {
  className?: string;
  label?: string;
};

/**
 * Adsterra Native Banner.
 *
 * THIS IS A SINGLETON. The loader binds to the first element matching
 * `NATIVE_BANNER_CONTAINER_ID`, so mounting it twice on one page emits a
 * duplicate id and leaves the second slot permanently empty. Keep the single
 * instance in the root layout and use `AdSlot` everywhere you need another ad.
 *
 * The container is never cleared and the script is never moved or removed: the
 * loader does `script.parentNode.insertBefore(...)`, so detaching either one
 * mid-flight produces "Cannot read properties of null (reading 'parentNode')".
 */
export function NativeBannerAd({ className, label }: NativeBannerAdProps) {
  if (!NATIVE_BANNER_CONTAINER_ID) return null;

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center',
        AD_RESERVED_HEIGHT.native,
        className
      )}
    >
      <aside aria-label={label ?? 'Advertisement'} className="w-full">
        <div id={NATIVE_BANNER_CONTAINER_ID} className="w-full" suppressHydrationWarning />
      </aside>
      <Script
        id="adsterra-native-banner"
        src={NATIVE_BANNER_URL}
        strategy="afterInteractive"
        async
        onError={() =>
          console.warn('[Adsterra] Native banner script failed to load.')
        }
      />
    </div>
  );
}