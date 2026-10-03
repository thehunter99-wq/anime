export const metadata = {
  title: 'System Status - MovAnime',
  description: 'Real-time system health, API status, and performance metrics for MovAnime.',
};

import { runAllChecks, summarize } from '@/lib/health';

/**
 * Live system status.
 *
 * ── Why this is a Server Component that actually probes ──────────────────────
 * The previous version was a static list of hardcoded green badges ("Adsterra —
 * All zones active", "Latency: 156ms"). It could not fail, which made it
 * worthless as a status page and actively misleading when a zone really was
 * down — the operator saw "operational" next to a page earning nothing.
 *
 * It now runs the same checks the operator would otherwise run by hand:
 * DNS/TLS reachability of each Adsterra zone script, the smartlink target, and
 * the TMDB/AniList upstreams. Ad zones in particular fail in ways that are
 * invisible in the UI (a blocked script and a zone with no fill look identical),
 * so having the HTTP status and body size in one place is the fastest way to
 * tell "misconfigured" from "blocked" from "working".
 *
 * `revalidate = 0` because a cached status page is the same bug in a different
 * shape. The checks are network-bound, so this page is slow by nature; that is
 * acceptable for a page linked from the footer and used by the operator.
 */
export const revalidate = 0;

export default async function DiagnosticsPage() {
  const results = await runAllChecks();
  const summary = summarize(results);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">System Diagnostics</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Live probe of every external dependency this site renders through. Ad zone
        checks report the script&apos;s HTTP status, so a blocked script can be told
        apart from an empty zone.
      </p>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-green-500/15 px-3 py-1 font-medium text-green-600 dark:text-green-400">
          {summary.ok} ok
        </span>
        <span className="rounded-full bg-yellow-500/15 px-3 py-1 font-medium text-yellow-600 dark:text-yellow-400">
          {summary.warn} warn
        </span>
        <span className="rounded-full bg-red-500/15 px-3 py-1 font-medium text-red-600 dark:text-red-400">
          {summary.error} error
        </span>
        <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
          {summary.pending} pending
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <StatusCard
            key={result.id}
            title={result.label}
            status={result.status}
            value={result.value ?? undefined}
            details={result.detail}
            hint={result.hint ?? undefined}
          />
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Recent IndexNow Submissions</h2>
        <div className="bg-card rounded-lg p-4">
          <p className="text-sm text-muted-foreground">IndexNow submissions are logged in production. Enable logging to see history.</p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  status,
  value,
  details,
  hint,
}: {
  title: string;
  status: 'operational' | 'degraded' | 'down' | 'ok' | 'warn' | 'error' | 'pending';
  value?: string;
  details: string;
  hint?: string;
}) {
  const statusConfig = {
    ok: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500', label: 'Operational' },
    operational: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500', label: 'Operational' },
    pending: { bg: 'bg-slate-500/20', text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400', label: 'Not configured' },
    warn: { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Degraded' },
    degraded: { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Degraded' },
    error: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', label: 'Down' },
    down: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', label: 'Down' },
  };

  const config = statusConfig[status];

  return (
    <div className={`p-4 rounded-lg border ${config.bg} dark:bg-opacity-10`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <h3 className="font-semibold">{title}</h3>
        <span className={`ml-auto text-xs font-medium ${config.text}`}>
          {config.label}
        </span>
      </div>
      {value && (
        <div className="mb-1 truncate text-xs text-muted-foreground font-mono">{value}</div>
      )}
      <p className="text-xs text-muted-foreground mt-2 break-words">{details}</p>
      {hint && (
        <p className="mt-2 text-xs italic text-muted-foreground/80">{hint}</p>
      )}
    </div>
  );
}