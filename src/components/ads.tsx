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
 * Both are plain `<Script strategy="afterInteractive">` tags mounted in the root
 * layout, so they load after hydration on every route and never block first
 * paint. Each is deferred by its own delay so a single page view never fires both
 * underlays at once, which networks penalise.
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
      strategy="afterInteractive"
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
      strategy="afterInteractive"
      async
      onError={() => console.warn('[Adsterra] Social bar script failed to load.')}
    />
  );
}