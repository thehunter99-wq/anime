import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * robots.txt for movanime.site
 *
 * ── Why `_next` is NOT disallowed ────────────────────────────────────────────
 * It is tempting to block `/_next/*` as "internal". Do not. That path holds the
 * JS chunks and CSS that render the page: Googlebot needs them to execute the
 * app and see the actual content. Blocking it starves the crawler of the markup,
 * which is a common cause of pages being indexed with an empty body.
 *
 * Those URLs are also never linked from anywhere crawlable, so they add nothing
 * to the crawl budget even while permitted.
 *
 * ── The rules that do matter ────────────────────────────────────────────────
 *  - `/api/` — no search value, and `/api/health` answering crawlers invites
 *    pointless re-fetching.
 *  - `/diagnostics` — an internal status page.
 *  - `/view/` — the player. It is a thin wrapper around a third-party embed, so
 *    letting it compete with the detail page for the same keywords splits
 *    ranking signal across two URLs for one piece of content.
 *
 * Everything else is open, including the legal pages, which carry trust signals
 * that "no such content" pages need.
 *
 * Groups are listed per engine for auditability. They are identical, so the `*`
 * group is what actually governs; the named groups are documentation of intent,
 * not an optimisation. In particular `DuckDuckBot` mostly ignores robots.txt and
 * decides from its own index, so naming it here changes nothing technically.
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
      {
        userAgent: 'DuckDuckBot',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}