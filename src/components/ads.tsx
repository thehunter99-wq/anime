'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

import {
  AD_DELAYS,
  INTERACTION_EVENTS,
  POPUNDER_ENABLED,
  POPUNDER_URL,
  SOCIAL_BAR_URL,
} from '@/config/ads';
import { isPopunderCapped, recordPopunderTrigger } from '@/lib/popunder-cap';
import { isSocialBarCapped, recordSocialBarTrigger } from '@/lib/social-bar-cap';

export { AdSlot as AdBanner, AdSlot, NativeBannerAd } from '@/components/ad-slot';

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height?: number;
      width?: number;
      params?: Record<string, unknown>;
    };
  }
}

/**
 * Crawlers are excluded from monetisation entirely.
 *
 * Reads the meta tag the root layout writes from the `x-is-bot` request header
 * set by middleware. Ad impressions from bots are pure downside: they inflate
 * the impression count without ever converting and are exactly what a network
 * uses to spot a domain serving ads to non-human traffic.
 */
function isBotRequest(): boolean {
  if (typeof window === 'undefined') return false;
  return document.querySelector('meta[name="x-is-bot"]')?.getAttribute('content') === '1';
}

/**
 * `requestIdleCallback` is missing in Safari, which is a large share of the
 * traffic on a site like this, so it cannot be assumed. TS types it as
 * non-optional, hence the cast.
 */
type IdleCapableWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleIdle(cb: () => void, timeoutMs: number): number {
  const w = window as IdleCapableWindow;
  if (typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(cb, { timeout: timeoutMs });
  }
  return window.setTimeout(cb, timeoutMs);
}

function cancelIdle(handle: number): void {
  const w = window as IdleCapableWindow;
  if (typeof w.cancelIdleCallback === 'function') {
    w.cancelIdleCallback(handle);
    return;
  }
  window.clearTimeout(handle);
}

/**
 * Resolves after BOTH conditions hold:
 *   1. at least `minDwellMs` of real page time has passed, and
 *   2. the visitor has interacted, or the browser went idle after that.
 *
 * The previous version resolved on whichever came first, and
 * `requestIdleCallback(cb, { timeout })` fires almost immediately on a quiet
 * page — `timeout` is an upper bound, not a delay. Combined with listening for
 * `mousemove`, that meant the popunder script was injected within a few hundred
 * milliseconds of the first mouse twitch on an idle page, so the configured
 * 30-second dwell never actually happened. Loading ad scripts before LCP
 * inflates bounce rate, and bounce-heavy sessions are what get a domain's
 * traffic judged low quality.
 */
function waitForEngagementAfterDwell(minDwellMs: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let dwellPassed = false;
    let dwellTimer = 0;
    let ceilingTimer = 0;
    let idleHandle: number | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(dwellTimer);
      window.clearTimeout(ceilingTimer);
      if (idleHandle !== null) cancelIdle(idleHandle);
      INTERACTION_EVENTS.forEach((event) =>
        window.removeEventListener(event, onEngagement)
      );
      window.removeEventListener('touchmove', onEngagement);
      resolve();
    };

    const tryFinish = () => {
      if (dwellPassed) finish();
    };

    function onEngagement() {
      tryFinish();
    }

    // Passive: this is an observation listener, and must never eat scroll or
    // tap performance on a page whose whole job is playing video.
    INTERACTION_EVENTS.forEach((event) =>
      window.addEventListener(event, onEngagement, { passive: true })
    );
    window.addEventListener('touchmove', onEngagement, { passive: true });

    dwellTimer = window.setTimeout(() => {
      dwellPassed = true;
      // A visitor who scrolls once and then sits reading still gets a
      // monetised impression via the idle path.
      idleHandle = scheduleIdle(() => finish(), 15000);
      tryFinish();
    }, minDwellMs);

    // Hard ceiling so a backgrounded tab can never leave this pending forever.
    ceilingTimer = window.setTimeout(finish, minDwellMs + 30000);
  });
}

/**
 * Popunder.
 *
 * Highest-earning unit after the Smartlink, and the one most likely to get a
 * domain banned, so it is deliberately the most constrained:
 *   - production only (Adsterra drops unverified referrers)
 *   - one per 30 min via sessionStorage, matching Adsterra's own allowance
 *   - 30s minimum dwell before the script is even injected
 *   - never armed on a watch page when a Direct Link is configured
 */
export function AdsterraPopunder() {
  const [ready, setReady] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    if (!POPUNDER_ENABLED) return;
    if (!POPUNDER_URL) return;
    if (isBotRequest()) return;
    if (isPopunderCapped()) return;

    let cancelled = false;

    (async () => {
      await waitForEngagementAfterDwell(AD_DELAYS.popunder);
      if (cancelled || armedRef.current) return;

      // Re-check at fire time: a client-side navigation may have consumed the
      // budget while this page was open.
      if (!isPopunderCapped()) {
        armedRef.current = true;
        recordPopunderTrigger();
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <Script
      id="adsterra-popunder"
      src={POPUNDER_URL}
      strategy="lazyOnload"
      async
      onError={() => console.warn('[Adsterra] Popunder script failed to load.')}
    />
  );
}

/**
 * Social Bar / placement unit.
 *
 * Capped at one per 24 hours: it is the highest-annoyance unit on the site for
 * comparatively little revenue, so it is rationed hard.
 *
 * POSITION IS NOT SET HERE ON PURPOSE. The zone script reads its own
 * `placementKey` config and positions itself (verified in the live script:
 * `placementKey`, `setCreativePosition`, `createChildPlacement`). Forcing it
 * with `!important` CSS was tried and reverted — it fought the script's own
 * inline positioning and the broad selector that was required also matched
 * every fixed-position modal, dropdown and toast on the site. Choosing bottom
 * placement is a zone setting in the Adsterra dashboard.
 */
export function AdsterraSocialBar() {
  const [ready, setReady] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    if (!SOCIAL_BAR_URL) return;
    if (isBotRequest()) return;
    if (isSocialBarCapped()) return;

    let cancelled = false;

    (async () => {
      await waitForEngagementAfterDwell(AD_DELAYS.socialBar);
      if (cancelled || armedRef.current) return;

      if (!isSocialBarCapped()) {
        armedRef.current = true;
        recordSocialBarTrigger();
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <Script
      id="adsterra-social-bar"
      src={SOCIAL_BAR_URL}
      strategy="lazyOnload"
      async
      onError={() => console.warn('[Adsterra] Social bar script failed to load.')}
    />
  );
}