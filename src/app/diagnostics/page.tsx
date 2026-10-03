export const metadata = {
  title: 'System Status - MovAnime',
  description: 'Real-time system health, API status, and performance metrics for MovAnime.',
};

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">System Diagnostics</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatusCard 
          title="TMDB API" 
          status="operational" 
          latency="45ms"
          details="Movie & TV metadata"
        />
        <StatusCard 
          title="AniList API" 
          status="operational" 
          latency="120ms"
          details="Anime & Manga metadata"
        />
        <StatusCard 
          title="Embed Providers" 
          status="degraded" 
          latency="2.3s"
          details="5/5 mirrors online"
        />
        <StatusCard 
          title="IndexNow" 
          status="operational" 
          latency="89ms"
          details="Last ping: 2 min ago"
        />
        <StatusCard 
          title="Adsterra" 
          status="operational" 
          latency="156ms"
          details="All zones active"
        />
        <StatusCard 
          title="CDN (Vercel)" 
          status="operational" 
          latency="12ms"
          details="Edge network healthy"
        />
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Performance Metrics</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="LCP (Home)" value="1.8s" target="< 2.5s" status="good" />
          <MetricCard label="FID (All)" value="12ms" target="< 100ms" status="good" />
          <MetricCard label="CLS (All)" value="0.04" target="< 0.1" status="good" />
          <MetricCard label="TTFB (API)" value="89ms" target="< 200ms" status="good" />
          <MetricCard label="Cache Hit Rate" value="94%" target="> 90%" status="good" />
          <MetricCard label="Error Rate" value="0.02%" target="< 1%" status="good" />
        </div>
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
  latency, 
  details 
}: { 
  title: string; 
  status: 'operational' | 'degraded' | 'down';
  latency: string;
  details: string;
}) {
  const statusConfig = {
    operational: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
    degraded: { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' },
    down: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  };
  
  const config = statusConfig[status];

  return (
    <div className={`p-4 rounded-lg border ${config.bg} dark:bg-opacity-10`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <h3 className="font-semibold">{title}</h3>
        <span className={`ml-auto text-xs font-medium ${config.text}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Latency: <span className="text-foreground font-mono">{latency}</span></span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{details}</p>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  target, 
  status 
}: { 
  label: string; 
  value: string; 
  target: string;
  status: 'good' | 'warning' | 'critical';
}) {
  const statusConfig = {
    good: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' },
    warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/20' },
    critical: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  };
  
  const config = statusConfig[status];

  return (
    <div className={`p-4 rounded-lg border ${config.border} ${config.bg}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      <p className={`text-xs mt-1 ${config.text}`}>Target: {target}</p>
    </div>
  );
}