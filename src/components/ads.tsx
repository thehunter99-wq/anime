'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

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

const CLIENT = process.env.NEXT_PUBLIC_ADSTERRA_KEY;

/**
 * Social bar (sticky bottom/top overlay). Loaded once per session and after a
 * short idle window so it never competes with the player for bandwidth.
 */
const SOCIAL_BAR_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_BAR_URL ??
  'https://pl31576647.profitableratecpmnetwork.com/ac/65/79/ac65794ec051ffa9b7ab68ab5027f1d2.js';

/**
 * Popunder. Deliberately delayed further than the social bar so a single page
 * view never triggers both underlays at once, which networks penalise.
 */
const POPUNDER_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_POPUNDER_URL ??
  'https://pl31576876.profitableratecpmnetwork.com/fa/79/81/fa7981af9d98b11f335221786bc8b090.js';

/**
 * Adsterra binds popunders to a referrer/landing-page allowlist. A localhost or
 * unverifiable origin gets silently dropped, so it stays off in dev.
 */
const POPUNDER_ENABLED = process.env.NODE_ENV === 'production';

export function AdsterraPopunder() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!POPUNDER_ENABLED) return;
    const timer = setTimeout(() => setReady(true), 4500);
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
    const timer = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <Script
      id="adsterra-social-bar"
      src={SOCIAL_BAR_URL}
      strategy="afterInteractive"
      async
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError={() => console.warn('[Adsterra] Social bar script failed to load.')}
    />
  );
}

let nativeLoaded = false;

function loadNativeTag() {
  if (!CLIENT || nativeLoaded || typeof window === 'undefined') return;
  nativeLoaded = true;

  if (document.getElementById('adsterra-loader')) return;

  const script = document.createElement('script');
  script.id = 'adsterra-loader';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://ssat.pro/cdn/client.js?key=${CLIENT}&format=auto`;
  document.head.appendChild(script);
}

type AdSlotProps = {
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
  className?: string;
  label?: string;
};

let adCounter = 0;

export function AdBanner({ format = 'auto', className, label }: AdSlotProps) {
  const [slotId] = useState(() => `adsterra-${format}-${++adCounter}`);

  useEffect(() => {
    loadNativeTag();
  }, []);

  if (!CLIENT) return null;

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={className ?? 'my-6 w-full overflow-hidden'}
    >
      <div className="adsterra w-full" id={slotId}>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(atOptions = atOptions || []).push({ key: '${CLIENT}', format: '${format}', params: {} });`,
          }}
        />
      </div>
    </aside>
  );
}
