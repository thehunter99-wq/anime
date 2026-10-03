'use client';

import Script from 'next/script';
import { useEffect, useState, useCallback, useRef } from 'react';

import {
  AD_DELAYS,
  MIN_AD_DELAY,
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

function isBotRequest(): boolean {
  if (typeof window === 'undefined') return false;
  const meta = document.querySelector('meta[name="x-is-bot"]');
  return meta?.getAttribute('content') === '1';
}

function waitForInteractionOrIdle(minDelay: number): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    let interactionHandled = false;

    const resolveOnce = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve();
      }
    };

    const handleInteraction = () => {
      if (!interactionHandled) {
        interactionHandled = true;
        setTimeout(resolveOnce, 50);
      }
    };

    const cleanup = () => {
      INTERACTION_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleInteraction);
      });
    };

    INTERACTION_EVENTS.forEach((event) => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    const scheduleIdle = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          if (!interactionHandled) resolveOnce();
        }, { timeout: minDelay });
      } else {
        setTimeout(() => {
          if (!interactionHandled) resolveOnce();
        }, minDelay);
      }
    };

    setTimeout(resolveOnce, minDelay + 3000);
    scheduleIdle();
  });
}

export function AdsterraPopunder() {
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (!POPUNDER_ENABLED) return;
    if (isBotRequest()) return;
    if (isPopunderCapped()) return;

    let cancelled = false;

    const initAd = async () => {
      await waitForInteractionOrIdle(AD_DELAYS.popunder);

      if (cancelled || !mountedRef.current) return;

      if (!isPopunderCapped() && !firedRef.current) {
        firedRef.current = true;
        setReady(true);
        recordPopunderTrigger();
      }
    };

    initAd();

    return () => {
      cancelled = true;
      mountedRef.current = false;
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

export function AdsterraSocialBar() {
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    if (isBotRequest()) return;
    if (isSocialBarCapped()) return;

    let cancelled = false;

    const initAd = async () => {
      await waitForInteractionOrIdle(AD_DELAYS.socialBar);

      if (cancelled || !mountedRef.current) return;

      if (!isSocialBarCapped()) {
        setReady(true);
        recordSocialBarTrigger();
      }
    };

    initAd();

    return () => {
      cancelled = true;
      mountedRef.current = false;
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