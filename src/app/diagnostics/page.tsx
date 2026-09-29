import { runAllChecks, summarize, type CheckResult } from '@/lib/health';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<CheckResult['status'], { label: string; className: string }> = {
  ok: { label: 'OK', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  warn: { label: 'WARN', className: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  error: { label: 'ERROR', className: 'border-red-500/40 bg-red-500/10 text-red-400' },
  pending: { label: 'PENDING', className: 'border-sky-500/40 bg-sky-500/10 text-sky-400' },
};

export const metadata = { title: 'System Status' };

export default async function DiagnosticsPage() {
  const checks = await runAllChecks();
  const summary = summarize(checks);
  const overall =
    summary.error > 0
      ? { label: 'DEGRADED', className: 'border-red-500/40 bg-red-500/10 text-red-400' }
      : summary.pending > 0
        ? { label: 'PARTIAL', className: 'border-amber-500/40 bg-amber-500/10 text-amber-400' }
        : { label: 'HEALTHY', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' };

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <p className="text-sm text-muted-foreground">AniMovie</p>
        <h1 className="text-3xl font-bold">System Status</h1>
        <p className="text-sm text-muted-foreground">
          Live check of every external integration. Refresh to re-run.
        </p>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-lg border px-4 py-4 ${overall.className}`}>
          <p className="text-xs uppercase tracking-wide opacity-80">Overall</p>
          <p className="text-2xl font-bold">{overall.label}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(['ok', 'warn', 'error', 'pending'] as const).map((key) => (
            <div key={key} className={`rounded-lg border px-2 py-3 text-center ${STATUS_STYLE[key].className}`}>
              <p className="text-xl font-bold">{summary[key]}</p>
              <p className="text-[10px] uppercase tracking-wide opacity-80">{key}</p>
            </div>
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {checks.map((check) => {
          const style = STATUS_STYLE[check.status];
          return (
            <li key={check.id} className="rounded-lg border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{check.label}</h2>
                <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${style.className}`}>
                  {style.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
              {check.value && (
                <p className="mt-1 font-mono text-xs text-muted-foreground/70">value: {check.value}</p>
              )}
              {check.hint && (
                <p className="mt-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  Hint: {check.hint}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <section className="mt-8 space-y-2 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Machine-readable</h2>
        <p>
          The same data is available as JSON at <code className="font-mono">/api/health</code>, which
          returns HTTP 503 while any check is failing — useful for uptime monitors and Vercel
          deployment gates.
        </p>
      </section>
    </main>
  );
}
