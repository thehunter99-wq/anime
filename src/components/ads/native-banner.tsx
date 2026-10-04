'use client';

/**
 * Native Banner — isolated inside an iframe.
 *
 * ── WHY THE IFRAME ────────────────────────────────────────────────────────
 * Adsterra's zone scripts resolve their mount point from
 * `document.currentScript.parentNode` (or re-query it later from a timer). That
 * reference only survives while React leaves the host DOM node alone. On a
 * client-side navigation React unmounts the old page, the node is detached, and
 * the script then dereferences a dead parent:
 *
 *   Uncaught TypeError: Cannot read properties of null (reading 'parentNode')
 *
 * That kills the script mid-fill, so the creative never appears.
 *
 * Running the same zone inside an `<iframe srcDoc>` gives the script its own
 * document. React never touches a node inside another document, so the parent
 * lookup can never return null, no matter how often the user navigates. The
 * only React-owned node is the iframe element itself, which has no children.
 *
 * ── WHY srcDoc IS BUILT AFTER MOUNT ───────────────────────────────────────
 * This app sends a per-request CSP nonce and `'strict-dynamic'`
 * (src/middleware.ts). A strict-dynamic browser ignores `'unsafe-inline'` and
 * host allowlists in `script-src`, so the script tag inside the iframe needs
 * that request's nonce or it is blocked and the iframe stays empty. The nonce
 * is only knowable in the browser, so the frame is created once, on mount,
 * with the nonce attached. Until then a height-reserving placeholder is shown,
 * which also keeps the layout stable (no CLS).
 *
 * ── THE MECHANISM INSIDE ──────────────────────────────────────────────────
 * The zone on this account is the container-scan format: it fills the first
 * element whose id is `container-<zone-hash>`. The hash is parsed from the zone
 * URL in `@/config/ads`, so there is no inline `atOptions` config and nothing
 * for CSP to block.
 *
 * The iframe is intentionally NOT sandboxed. Without `allow-same-origin` the
 * frame gets an opaque origin, and ad-zone code commonly touches
 * localStorage/cookies, which throws on an opaque origin in Chrome — the ad
 * would break again. Isolation from React does not require the sandbox.
 */
import { useEffect, useState } from 'react';

import { NATIVE_BANNER_CONTAINER_ID, NATIVE_BANNER_ZONE_URL } from '@/config/ads';
import { cn } from '@/lib/utils';

const DEFAULT_HEIGHT = 100;

function buildSrcDoc(nonce: string): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8">',
    '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}',
    `#${NATIVE_BANNER_CONTAINER_ID}{display:block;width:100%;text-align:center}`,
    '</style></head><body>',
    `<div id="${NATIVE_BANNER_CONTAINER_ID}"></div>`,
    `<script${nonceAttr} async src="${NATIVE_BANNER_ZONE_URL}"></script>`,
    '</body></html>',
  ].join('');
}

export function NativeBannerAd({
  className,
  label = 'Advertisement',
  height = DEFAULT_HEIGHT,
}: {
  className?: string;
  label?: string;
  height?: number;
}) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null);

  useEffect(() => {
    // `HTMLScriptElement.nonce` reads the value even though the attribute itself
    // is hidden from getAttribute(), which is why this cannot be done at build
    // time or from the server.
    const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ?? '';
    setSrcDoc(buildSrcDoc(nonce));
  }, []);

  if (!NATIVE_BANNER_CONTAINER_ID || !NATIVE_BANNER_ZONE_URL) return null;

  return (
    <div
      className={cn('my-4 w-full', className)}
      data-ad-slot="native-banner"
      aria-label={label}
    >
      {srcDoc ? (
        <iframe
          srcDoc={srcDoc}
          title={label}
          className="w-full border-0"
          style={{ height }}
          scrolling="no"
        />
      ) : (
        <div aria-hidden="true" style={{ height }} />
      )}
    </div>
  );
}

export default NativeBannerAd;