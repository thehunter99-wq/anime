'use client';

import { useEffect, useRef } from 'react';

const NATIVE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL ??
  'https://pl31577360.profitableratecpmnetwork.com/ebab695606cac21b468c0fe20067b7f6/invoke.js';

const CONTAINER_ID = 'container-ebab695606cac21b468c0fe20067b7f6';

/** Distinguishes successive injections so no script tag is ever removed. */
let injectionCount = 0;

type NativeBannerProps = {
  className?: string;
  label?: string;
  /** Delay before injecting, so it never competes with the player for bandwidth. */
  delayMs?: number;
};

/**
 * Adsterra Native Banner.
 *
 * Isolated client component: the banner div is rendered empty and the network
 * script is attached imperatively only after that div is confirmed to be in the
 * document, which keeps it out of React's hydration path entirely.
 *
 * Two rules below are what actually stop the runtime errors:
 *
 *  1. Never clear the container. The script holds live references to the nodes
 *     it inserted; detaching them (via `innerHTML = ''`) makes it throw
 *     "Cannot read properties of null (reading 'parentNode')".
 *  2. Never move the script inside the React-managed wrapper. The loader does
 *     `script.parentNode.insertBefore(...)`, so if React re-renders and removes a
 *     script nested in the wrapper, `parentNode` is null and the loader throws.
 *     `document.body` is never reconciled by React, so the script stays attached
 *     to a parent that is guaranteed to exist.
 */
export default function NativeBanner({
  className,
  label,
  delayMs = 2500,
}: NativeBannerProps) {
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const inject = () => {
      const banner = bannerRef.current;
      if (!banner) return;

      // Duplicate-injection guard. This is also what repopulates the banner after
      // a client-side navigation back to this route: the new wrapper is empty, so
      // a fresh script is appended and re-executed.
      if (banner.querySelector(`#${CONTAINER_ID}`)) return;

      const container = document.createElement('div');
      container.id = CONTAINER_ID;
      banner.appendChild(container);

      const script = document.createElement('script');
      script.id = `adsterra-native-banner-script-${++injectionCount}`;
      script.src = NATIVE_SCRIPT_URL;
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.onerror = () =>
        console.warn('[Adsterra] Native banner script failed to load.');
      document.body.appendChild(script);
    };

    const timer = window.setTimeout(() => {
      if (document.readyState === 'complete') {
        inject();
      } else {
        window.addEventListener('load', inject, { once: true });
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return (
    <aside
      aria-label={label ?? 'Advertisement'}
      className={className ?? 'my-4 w-full overflow-hidden'}
    >
      {/* Intentionally empty in JSX: React must never own the ad nodes. */}
      <div ref={bannerRef} className="w-full" suppressHydrationWarning />
    </aside>
  );
}
