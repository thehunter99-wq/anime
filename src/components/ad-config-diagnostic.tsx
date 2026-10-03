'use client';

import { useEffect } from 'react';

import {
  ADSTERRA_KEY,
  DIRECT_LINK_URL,
  IN_CONTENT_ENABLED,
  NATIVE_BANNER_CONTAINER_ID,
  POPUNDER_ENABLED,
  SMARTLINK_URL,
} from '@/config/ads';

/**
 * One-time console report of the monetisation configuration.
 *
 * Written because the single most common cause of "my ads do not show up" is a
 * blank or missing env var, which is invisible in the UI: the slots simply do
 * not render. This prints exactly which variable is unset and what to do about
 * it, in development, and is stripped from production builds.
 *
 * Deliberately logs *what is missing*, never the value of a secret.
 */
export function AdConfigDiagnostic() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const missing: string[] = [];
    if (!ADSTERRA_KEY) {
      missing.push(
        'NEXT_PUBLIC_ADSTERRA_KEY — required for all in-content banner slots. ' +
          'Adsterra dashboard → create a "Banner (in-content)" zone → copy its key. ' +
          'Without it the 4 banner slots render nothing.'
      );
    }
    if (!SMARTLINK_URL) {
      missing.push(
        'NEXT_PUBLIC_ADSTERRA_SMARTLINK_URL — required for the highest-earning ' +
          'download button. A default is compiled in, so this only fires if you ' +
          'explicitly blanked it.'
      );
    }
    if (!NATIVE_BANNER_CONTAINER_ID) {
      missing.push(
        'NEXT_PUBLIC_ADSTERRA_NATIVE_BANNER_URL — the native banner container id ' +
          'is derived from this URL and could not be parsed.'
      );
    }

    console.groupCollapsed(
      `%c[adsterra] monetisation config — ${missing.length === 0 ? 'ready' : `${missing.length} issue(s)`}`,
      'color:#0ea5e9;font-weight:600'
    );
    console.log(
      'in-content slots:',
      IN_CONTENT_ENABLED ? `enabled (key ${ADSTERRA_KEY.slice(0, 6)}…)` : 'DISABLED — no zone key'
    );
    console.log('native banner container:', NATIVE_BANNER_CONTAINER_ID || '(unresolved)');
    console.log('popunder:', POPUNDER_ENABLED ? 'enabled' : 'disabled outside production');
    console.log('smartlink:', SMARTLINK_URL ? 'configured' : 'MISSING');
    console.log('direct link overlay:', DIRECT_LINK_URL ? 'configured' : 'off (recommended)');
    if (missing.length > 0) {
      console.warn('%cSet these environment variables:', 'color:#f59e0b;font-weight:600');
      missing.forEach((m) => console.warn(`  • ${m}`));
    }
    console.groupEnd();
  }, []);

  return null;
}

export default AdConfigDiagnostic;