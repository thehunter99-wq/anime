'use client';

import Script from 'next/script';
import { useEffect, useId, useState } from 'react';

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
      onError={() => console.warn('[Adsterra] Social bar script failed to load.')}
    />
  );
}

type AdSlotProps = {
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
  className?: string;
  label?: string;
};

/**
 * In-content ad slot.
 *
 * The inline `atOptions.push` script is rendered in JSX on purpose rather than
 * injected from an effect: its contents are fully determined at build time, so
 * the server and client emit byte-identical markup and there is no hydration
 * mismatch. Keeping it in JSX also guarantees it runs before the `afterInteractive`
 * loader below, which is what registers the slot.
 *
 * `useId()` supplies the slot id. A module-level counter is not safe here: it is
 * render-phase state that can desync between the streaming server pass and
 * hydration, which produces a real `id` mismatch.
 */
export function AdBanner({ format = 'auto', className, label }: AdSlotProps) {
  const reactId = useId();
  const slotId = `adsterra-${format}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (!CLIENT) return null;

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={className ?? 'my-6 w-full overflow-hidden'}
    >
      <div id={slotId} className="adsterra w-full" suppressHydrationWarning>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(atOptions = atOptions || []).push({ key: '${CLIENT}', format: '${format}', params: {} });`,
          }}
        />
      </div>
      <Script
        id="adsterra-loader"
        src={`https://ssat.pro/cdn/client.js?key=${CLIENT}&format=auto`}
        strategy="afterInteractive"
        async
        onError={() => console.warn('[Adsterra] In-content loader failed to load.')}
      />
    </aside>
  );
}
