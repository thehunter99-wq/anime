import { buildSitemapChunks, renderSitemapIndex } from '@/lib/sitemap';

/**
 * `/sitemap.xml` — the sitemap **index**.
 *
 * Not `app/sitemap.ts`, because Next 15.5's metadata serializer only emits a
 * `<urlset>`; see the long note in `lib/sitemap.ts`. A route handler named
 * `sitemap.xml` claims the same path the metadata convention would have.
 *
 * Regenerated hourly rather than on the six-hour cadence the old flat sitemap
 * used. The index now lists chunks whose contents change on the popular/trending
 * rails, and an index that lags by six hours delays discovery of every URL inside
 * it. The cost is a few cached reads, not upstream requests.
 */
export const revalidate = 3600;

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  // Sitemaps are re-fetched on Google's own schedule; a short browser cache only
  // helps during a local inspection.
  'Cache-Control': 'public, max-age=0, must-revalidate',
};

export async function GET() {
  /**
   * A failing collection must not take `/sitemap.xml` down. Google treats an
   * unreachable sitemap as "this site has nothing to crawl right now" and backs
   * off, so a 500 here is worse than a thin-but-valid index. The chunks fall back
   * to their own error handling; the index degrades to whatever could be listed.
   */
  let chunks;
  try {
    chunks = await buildSitemapChunks();
  } catch (error) {
    console.error('[sitemap] index generation failed', error);
    chunks = [{ kind: 'static' as const, page: 1 }];
  }

  return new Response(renderSitemapIndex(chunks), { headers: XML_HEADERS });
}