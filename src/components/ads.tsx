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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError={() => console.warn('[Adsterra] Social bar script failed to load.')}
    />
  );
}

let nativeLoaded = false;

/**
 * Appends the Adsterra loader once per document.
 *
 * Loading is deferred until the window load event (plus an idle callback) so the
 * loader can never inject ad nodes into a container React is still hydrating.
 * With streaming SSR, effects for early components fire while later Suspense
 * boundaries are still hydrating; injecting during that window is what produces
 * the "extra DOM node" hydration mismatch.
 */
function loadNativeTag() {
  if (!CLIENT || nativeLoaded || typeof window === 'undefined') return;

  const inject = () => {
    if (document.getElementById('adsterra-loader')) return;
    nativeLoaded = true;

    const script = document.createElement('script');
    script.id = 'adsterra-loader';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://ssat.pro/cdn/client.js?key=${CLIENT}&format=auto`;
    document.head.appendChild(script);
  };

  const runWhenIdle =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 1);

  if (document.readyState === 'complete') {
    runWhenIdle(inject);
  } else {
    window.addEventListener('load', () => runWhenIdle(inject), { once: true });
  }
}

type AdSlotProps = {
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical';
  className?: string;
  label?: string;
};

/**
 * In-content ad slot.
 *
 * Hydration safety rules this component follows:
 *  - `useId()` (never a module-level counter) so the slot id is identical on the
 *    server and the client. A render-phase counter can desync between the
 *    streaming server pass and hydration, producing a real id mismatch.
 *  - The `atOptions.push` script is only rendered after mount, so the server HTML
 *    and the first client render are byte-identical (empty container).
 *  - `suppressHydrationWarning` is scoped to this one container, because Adsterra
 *    injects ad DOM into it outside React's control. This is the only legitimate
 *    use of the prop — putting it on <html>/<body> would mask unrelated bugs.
 */
export function AdBanner({ format = 'auto', className, label }: AdSlotProps) {
  const reactId = useId();
  const slotId = `adsterra-${format}-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadNativeTag();
  }, []);

  if (!CLIENT) return null;

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={className ?? 'my-6 w-full overflow-hidden'}
    >
      <div id={slotId} className="adsterra w-full" suppressHydrationWarning>
        {mounted ? (
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `(atOptions = atOptions || []).push({ key: '${CLIENT}', format: '${format}', params: {} });`,
            }}
          />
        ) : null}
      </div>
    </aside>
  );
}
