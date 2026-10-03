import { NextRequest, NextResponse } from 'next/server';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? 'your-indexnow-key-here';
const INDEXNOW_KEY_LOCATION = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/${INDEXNOW_KEY}.txt`
  : 'https://movanime.site/your-indexnow-key.txt';

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://searchadvisor.naver.com/indexnow',
  'https://webmaster.yandex.com/indexnow',
];

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * Ping IndexNow API to notify search engines of URL changes
 * Supports bulk submission (up to 10,000 URLs per request)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, host } = body as { urls?: string[]; host?: string };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'urls array is required' },
        { status: 400 }
      );
    }

    const targetHost = host ?? new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://movanime.site').host;
    const urlList = urls.map(url => url.startsWith('http') ? url : `https://${targetHost}${url.startsWith('/') ? url : `/${url}`}`);

    const payload: IndexNowPayload = {
      host: targetHost,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList,
    };

    // Fire-and-forget to all IndexNow endpoints
    const results = await Promise.allSettled(
      INDEXNOW_ENDPOINTS.map(endpoint =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(res => ({ endpoint, status: res.status, ok: res.ok }))
      )
    );

    const responses = results.map(r =>
      r.status === 'fulfilled'
        ? r.value
        : { endpoint: 'unknown', status: 0, ok: false, error: r.reason?.message }
    );

    return NextResponse.json({
      success: true,
      submitted: urlList.length,
      endpoints: responses,
    });
  } catch (error) {
    console.error('[IndexNow] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing and health checks
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoints: INDEXNOW_ENDPOINTS,
    keyLocation: INDEXNOW_KEY_LOCATION,
    usage: 'POST { "urls": ["https://example.com/page1", "/page2"] }',
  });
}