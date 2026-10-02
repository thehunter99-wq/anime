'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

import {
  AD_DELAYS,
  POPUNDER_ENABLED,
  POPUNDER_URL,
  SOCIAL_BAR_URL,
} from '@/config/ads';

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
 * Underlay scripts (popunder + social bar).
 *
 * STRATEGY: both are `lazyOnload`, not `afterInteractive`.
 *
 * `afterInteractive` injects the script as soon as hydration begins, which puts
 * third-party parser work on the critical path and inflates TBT — exactly the
 * metric that decides whether a page passes Core Web Vitals. `lazyOnload` defers
 * until the browser is idle after load, by which point LCP and TBT have already
 * been committed. The scripts still fire before most meaningful scroll depth, so
 * revenue is largely unaffected.
 *
 * For crawlers this is a non-issue: Googlebot renders JS and waits for network
 * idle, so the impressions still register, and the tags themselves are ordinary
 * script tags in the DOM rather than anything that blocks indexing.
 *
 * Each unit is also gated by its own delay, so a single page view never fires
 * both underlays at once — networks penalise that pattern.
 *
 * A failed load only logs: every ad unit here is decorative, and the video
 * player is a sibling element that is never gated on any of this resolving.
 */
export function AdsterraPopunder() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!POPUNDER_ENABLED) return;
    const timer = setTimeout(() => setReady(true), AD_DELAYS.popunder);
    return () => clearTimeout(timer);
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

export function AdsterraSocialBar() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), AD_DELAYS.socialBar);
    return () => clearTimeout(timer);
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