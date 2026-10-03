'use client';

/**
 * Site-wide Adsterra units: popunder and social bar.
 *
 * These two are separate from the in-page slots because they inject themselves
 * (a new window, a fixed bar) rather than rendering into a container on the
 * page. They are mounted once in the root layout.
 */
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

declare global {
  interface Window {
    /**
     * The Adsterra in-content loader reads this as a QUEUE, so it must be typed
     * as an array. Declaring it as a single object (or in more than one file)
     * breaks the build with a conflicting-property type error.
     */
    atOptions?: {
      key: string;
      format: string;
      height?: number;
      width?: number;
      params?: Record<string, unknown>;
    }[];
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
 *   - a 30-minute spacing floor between fires plus a per-session ceiling of 4,
 *     both enforced in `lib/popunder-cap.ts`, so a long visit keeps earning while
 *     a casual one still sees a single pop
 *   - a minimum dwell before the script is even injected
 *   - never armed on a watch page when a Direct Link is configured
 *
 * ── Why this takes a `rearmKey` ──────────────────────────────────────────────
 * The budget now REFILLS: after the 30-minute gap a returning visitor is
 * eligible again, but with `useEffect(…, [])` the component only ever evaluated
 * that once, at mount, and the script tag stayed absent for the whole session.
 * Re-evaluating on each client-side navigation is what actually collects the
 * second and later impressions the cap permits. The script's own `id` makes
 * `next/script` a no-op once it has loaded, so this cannot double-inject.
 */
export function AdsterraPopunder({ rearmKey }: { rearmKey?: string } = {}) {
  const [ready, setReady] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    if (!POPUNDER_ENABLED) return;
    if (!POPUNDER_URL) return;
    if (isBotRequest()) return;

    // Reset per navigation: `true` here only means "this route already fired",
    // never "the session is over".
    armedRef.current = false;
    setReady(false);

    // Spacing/ceiling re-checked at mount; a capped visitor short-circuits here.
    if (isPopunderCapped()) return;

    let cancelled = false;

    (async () => {
      await waitForEngagementAfterDwell(AD_DELAYS.popunder);
      if (cancelled || armedRef.current) return;

      // Re-check at fire time: the dwell may have outlived the 30-minute gap, or
      // a navigation may have consumed the budget while this page was open.
      if (!isPopunderCapped()) {
        armedRef.current = true;
        recordPopunderTrigger();
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rearmKey]);

  if (!ready) return null;

  return (
    <Script
      id="adsterra-popunder"
      src={POPUNDER_URL}
      strategy="lazyOnload"
      async
      // A silently failing popunder is indistinguishable from "not configured",
      // which is the single hardest thing to debug. Say so loudly, with the URL.
      onError={() =>
        console.error(
          `[adsterra] popunder failed to load from ${POPUNDER_URL}. Check that the zone is active and that CSP script-src/connect-src allow *.profitableratecpmnetwork.com.`
        )
      }
    />
  );
}

/**
 * Social Bar / placement unit.
 *
 * Capped at one per 24 hours: it is the highest-annoyance unit on the site for
 * comparatively little revenue, so it is rationed hard.
 *
 * ── Showing it at the TOP ────────────────────────────────────────────────────
 * The unit is now asked to render at the top of the viewport rather than the
 * default bottom. Two reasons:
 *
 *   1. The bottom strip is where every player puts its own controls and every
 *      phone puts its browser chrome, so a bottom-pinned bar sits on top of the
 *      thing the visitor came to use. At the top it is out of the playback area.
 *   2. `placementKey` is the zone's own documented knob for this (verified in
 *      the live script: `placementKey`, `setCreativePosition`,
 *      `createChildPlacement`). Driving the position through the script's own
 *      config is the supported path; the `!important` CSS override that was tried
 *      earlier fought the script's inline positioning and matched unrelated fixed
 *      elements, and was correctly reverted.
 *
 * NOTE: if the zone has a fixed placement in the Adsterra dashboard, that
 * setting wins. Set the zone to "Top" there as well for the two to agree.
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
      /**
       * `placementKey` asks the zone for its top strip. Harmless if the zone
       * ignores it — the script falls back to its own dashboard setting.
       */
      data-placement-key="top"
      data-placement="top"
      onError={() =>
        console.error(
          `[adsterra] social bar failed to load from ${SOCIAL_BAR_URL}. Check that the zone is active and that CSP script-src/connect-src allow *.profitableratecpmnetwork.com.`
        )
      }
    />
  );
}