import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * robots.txt for movanime.site
 *
 * ── Why this is verbose on purpose ───────────────────────────────────────────
 * A short `User-agent: *` block is legal and usually sufficient. Spelling out
 * the engines that actually matter is not a trick — it makes intent auditable
 * and guarantees the two rules that must not drift (see below) are stated once,
 * rather than being re-derived per crawler.
 *
 * The rules that genuinely matter:
 *  - `/api/` and `/diagnostics` are disallowed: no search value, and
 *    `/api/health` returning 200 to a crawler just invites it into a loop.
 *  - `/view/` is disallowed. It is a thin wrapper around a third-party embed;
 *    letting it compete with the detail page for the same keywords splits
 *    ranking signal across two URLs for one piece of content.
 *  - Everything else is open, including the ad and legal pages, which carry
 *    trust signals.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ['/api/', '/diagnostics', '/view/'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      {
        userAgent: ['Googlebot', 'Bingbot', 'Googlebot-Image', 'Googlebot-Video'],
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}