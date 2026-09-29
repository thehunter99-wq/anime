'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const NATIVE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL ??
  'https://pl31577360.profitableratecpmnetwork.com/ebab695606cac21b468c0fe20067b7f6/invoke.js';

const CONTAINER_ID = 'container-ebab695606cac21b468c0fe20067b7f6';

type NativeBannerProps = {
  className?: string;
  label?: string;
  /** Delay before rendering, so the banner never competes with the player. */
  delayMs?: number;
};

/**
 * Adsterra Native Banner, using the network's official container-plus-script
 * markup.
 *
 * The container id is a build-time constant, so the server and client render
 * identical markup. Nothing is emitted during the hydration pass: `ready` is
 * false on the first client render, matching the server, and flips only after
 * `delayMs` has elapsed in a post-hydration effect.
 *
 * Note the container is never cleared and the script is never moved or removed.
 * The loader does `script.parentNode.insertBefore(...)`, so detaching either the
 * container or the script mid-flight is what produces
 * "Cannot read properties of null (reading 'parentNode')".
 */
export default function NativeBanner({
  className,
  label,
  delayMs = 2500,
}: NativeBannerProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={className ?? 'my-4 w-full overflow-hidden'}
    >
      {ready ? (
        <>
          <div id={CONTAINER_ID} className="w-full" suppressHydrationWarning />
          <Script
            id="adsterra-native-banner"
            src={NATIVE_SCRIPT_URL}
            strategy="afterInteractive"
            async
            onError={() =>
              console.warn('[Adsterra] Native banner script failed to load.')
            }
          />
        </>
      ) : null}
    </aside>
  );
}
