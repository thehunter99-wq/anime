import { NextResponse } from 'next/server';
import { runAllChecks, summarize } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = await runAllChecks();
  const summary = summarize(checks);
  const healthy = summary.error === 0;

  return NextResponse.json(
    { healthy, summary, checks },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
