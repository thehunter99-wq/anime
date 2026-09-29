'use client';

import { useEffect, useRef, useState } from 'react';

const NATIVE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL ??
  'https://pl31577360.profitableratecpmnetwork.com/ebab695606cac21b468c0fe20067b7f6/invoke.js';

/**
 * Adsterra Native Banner.
 *
 * The network script writes directly into the container div, so it is injected
 * via useEffect rather than next/script. A plain <Script> would run before the
 * div exists on first paint, and a client-side re-render would wipe whatever the
 * script injected — appending imperatively avoids both problems.
 */

const CONTAINER_ID = 'container-ebab695606cac21b468c0fe20067b7f6';

const SCRIPT_TAG_ID = 'adsterra-native-banner-script';

type NativeBannerProps = {
  className?: string;
  label?: string;
  /** Delay before injecting, so it never competes with the player for bandwidth. */
  delayMs?: number;
};

/**
 * Adsterra Native Banner.
 *
 * The network script writes directly into the container div, so it is injected
 * via useEffect rather than next/script. A plain <Script> would run before the
 * div exists on first paint, and a client-side re-render would wipe whatever the
 * script injected — appending imperatively avoids both problems.
 */
export default function NativeBanner({
  className,
  label,
  delayMs = 2500,
}: NativeBannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  useEffect(() => {
    if (!ready) return;

    const inject = () => {
      const container = containerRef.current;
      if (!container) return;

      // Clear stale markup, then always re-append a fresh script tag. On client
      // side navigation the previous page's container is gone and the already
      // loaded script will not rescan, so re-running it is what repopulates this
      // container. Clearing before the tag is appended keeps them in order.
      container.innerHTML = '';

      document.getElementById(SCRIPT_TAG_ID)?.remove();

      const script = document.createElement('script');
      script.id = SCRIPT_TAG_ID;
      script.async = true;
      script.src = NATIVE_SCRIPT_URL;
      script.onerror = () =>
        console.warn('[Adsterra] Native banner script failed to load.');
      document.body.appendChild(script);
    };

    // The container must exist before the script runs.
    if (document.readyState === 'complete') {
      inject();
    } else {
      window.addEventListener('load', inject, { once: true });
      return () => window.removeEventListener('load', inject);
    }
  }, [ready]);

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={className ?? 'my-4 w-full overflow-hidden'}
    >
      {/* Adsterra writes ad nodes into this div outside React's control. */}
      <div
        ref={containerRef}
        className="w-full"
        data-adsterra-native={CONTAINER_ID}
        suppressHydrationWarning
      />
    </aside>
  );
}
