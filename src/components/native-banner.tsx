'use client';

import Script from 'next/script';

const NATIVE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL ??
  'https://pl31577360.profitableratecpmnetwork.com/ebab695606cac21b468c0fe20067b7f6/invoke.js';

const CONTAINER_ID = 'container-ebab695606cac21b468c0fe20067b7f6';

type NativeBannerProps = {
  className?: string;
  label?: string;
};

/**
 * Adsterra Native Banner, using the network's official container-plus-script
 * markup. Rendered once, globally, in the root layout above the footer.
 *
 * The container id is a build-time constant, so the server and client render
 * identical markup and there is nothing for React to mismatch on. `next/script`
 * hoists the actual injection outside the React tree, so React never owns the
 * script node.
 *
 * This component is a singleton. The Adsterra loader binds to the first element
 * matching CONTAINER_ID, so mounting it twice on one page (for example here and
 * in the player) would emit a duplicate id and leave the second slot empty.
 *
 * The container is never cleared and the script is never moved or removed: the
 * loader does `script.parentNode.insertBefore(...)`, so detaching either one
 * mid-flight is what produces "Cannot read properties of null (reading
 * 'parentNode')".
 */
export default function NativeBanner({ className, label }: NativeBannerProps) {
  return (
    <div
      className={
        className ??
        'my-8 flex min-h-[90px] w-full flex-col items-center justify-center px-4'
      }
    >
      <aside aria-label={label ?? 'Advertisement'} className="w-full">
        <div id={CONTAINER_ID} className="w-full" suppressHydrationWarning />
      </aside>
      <Script
        id="adsterra-native-banner"
        src={NATIVE_SCRIPT_URL}
        strategy="afterInteractive"
        async
        onError={() =>
          console.warn('[Adsterra] Native banner script failed to load.')
        }
      />
    </div>
  );
}
