
import { useAdminSystemHealth } from '@/hooks/useAdmin';
import { Activity, Server, Database, Cpu, HardDrive, Wifi, AlertTriangle, Clock } from 'lucide-react';

const formatBytes = (bytes: number) => {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(1)} KB`;
};

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

export default function AdminSystemHealth() {
  const { data, isLoading } = useAdminSystemHealth();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-foreground/5 rounded-lg animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-foreground/5 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const statusColor = data?.status === 'UP' ? 'text-emerald-400' : 'text-red-400';
  const dbColor = data?.database?.status === 'UP' ? 'text-emerald-400' : data?.database?.status === 'DEGRADED' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-500 flex items-center justify-center shadow-lg"><Activity className="h-5 w-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold">System Health</h1><p className="text-sm text-foreground/50">Live metrics — auto-refreshing</p></div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Server Status */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><Server className="h-4 w-4 text-foreground/50" /><span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">Server</span></div>
          <p className={`text-2xl font-bold ${statusColor}`}>{data?.status || '—'}</p>
          <p className="text-xs text-foreground/40 mt-1">Uptime: {data?.uptimeSeconds ? formatUptime(data.uptimeSeconds) : '—'}</p>
        </div>

        {/* Database */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><Database className="h-4 w-4 text-foreground/50" /><span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">Database</span></div>
          <p className={`text-2xl font-bold ${dbColor}`}>{data?.database?.status || '—'}</p>
          <p className="text-xs text-foreground/40 mt-1">Supabase PostgreSQL</p>
        </div>

        {/* API Metrics */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><Wifi className="h-4 w-4 text-foreground/50" /><span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">API</span></div>
          <p className="text-2xl font-bold text-foreground">{data?.api?.totalRequests || 0}</p>
          <p className="text-xs text-foreground/40 mt-1">Total requests since restart</p>
        </div>

        {/* Error Rate */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-foreground/50" /><span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">Error Rate</span></div>
          <p className={`text-2xl font-bold ${(data?.api?.failureRatePercentage || 0) > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
            {data?.api?.failureRatePercentage?.toFixed(2) || '0.00'}%
          </p>
          <p className="text-xs text-foreground/40 mt-1">{data?.api?.failedRequests || 0} failed of {data?.api?.totalRequests || 0}</p>
        </div>

        {/* Response Time */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-foreground/50" /><span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">Avg Response</span></div>
          <p className="text-2xl font-bold text-foreground">{data?.api?.averageResponseTimeMs?.toFixed(0) || '0'}ms</p>
          <p className="text-xs text-foreground/40 mt-1">Slow queries: {data?.api?.slowQueriesCount || 0}</p>
        </div>

        {/* Memory */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3"><HardDrive className="h-4 w-4 text-foreground/50" /><span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">Memory</span></div>
          <p className="text-2xl font-bold text-foreground">{data?.memory?.heapUsed ? formatBytes(data.memory.heapUsed) : '—'}</p>
          <p className="text-xs text-foreground/40 mt-1">of {data?.memory?.heapTotal ? formatBytes(data.memory.heapTotal) : '—'} heap</p>
        </div>

        {/* CPU */}
        <div className="glass-card p-5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3"><Cpu className="h-4 w-4 text-foreground/50" /><span className="text-xs font-medium text-foreground/50 uppercase tracking-wider">CPU</span></div>
          <p className="text-lg font-bold text-foreground">{data?.cpu?.model || '—'}</p>
          <p className="text-xs text-foreground/40 mt-1">{data?.cpu?.cores || 0} cores · Load: {data?.cpu?.loadAvg?.map((l: number) => l.toFixed(2)).join(', ') || '—'}</p>
        </div>
      </div>

      {/* Recent Errors */}
      {data?.api?.recentErrors?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" /> Recent Errors</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.api.recentErrors.map((err: string, i: number) => (
              <p key={i} className="text-xs text-foreground/60 font-mono bg-foreground/[0.03] px-3 py-2 rounded-lg break-all">{err}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
