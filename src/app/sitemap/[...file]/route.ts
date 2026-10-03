import { buildSitemapChunks, buildSitemapEntries, parseChunkId, renderSitemapUrlset } from '@/lib/sitemap';

/**
 * `/sitemap/<kind>-<page>.xml` — one paginated chunk of the sitemap.
 *
 * A catch-all segment so the `.xml` suffix is part of the id and chunks stay
 * human-readable (`/sitemap/tv-episodes-3.xml`) rather than being opaque
 * integers. That matters in practice: when a crawl error is logged against one
 * of these URLs, the name says which slice to regenerate.
 *
 * The chunk type decides how it is built, so adding a rail means adding a case in
 * `buildSitemapEntries` and a kind in `SitemapChunkKind` — the index picks it up
 * automatically from the catalogue sizes.
 */
export const revalidate = 3600;

type Context = { params: Promise<{ file?: string[] }> };

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
};

export async function GET(_request: Request, { params }: Context) {
  const { file } = await params;

  // The catch-all arrives as an array; a single-element array is the only
  // legitimate shape, and anything deeper would not match a chunk id anyway.
  const ref = parseChunkId(file?.length === 1 ? file[0] : undefined);

  if (!ref) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  /**
   * A chunk id that parses but points past the end of the catalogue is a stale
   * link (the index regenerated after a catalogue shrank), not a real page.
   * Answering with an empty `<urlset>` would be "valid XML" that Google records
   * as a sitemap error, so this is a 404.
   */
  const chunks = await buildSitemapChunks().catch(() => []);
  if (!chunks.some((chunk) => chunk.kind === ref.kind && chunk.page === ref.page)) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  const entries = await buildSitemapEntries(ref);

  return new Response(renderSitemapUrlset(entries), { headers: XML_HEADERS });
}