import React from 'react';
import { useAdminAnalytics } from '@/hooks/useAdmin';
import { BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminAnalytics() {
  const [days, setDays] = React.useState(30);
  const { data, isLoading } = useAdminAnalytics({ days });

  const chartConfig = [
    { key: 'signupsPerDay', label: 'Signups', color: '#3B82F6', total: data?.totalSignups },
    { key: 'expensesPerDay', label: 'Expenses', color: '#8B5CF6', total: data?.totalExpensesInPeriod },
    { key: 'aiRequestsPerDay', label: 'AI Requests', color: '#F59E0B', total: data?.totalAIRequestsInPeriod },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg"><BarChart3 className="h-5 w-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-sm text-foreground/50">Last {days} days — read-only</p></div>
      </div>

      <div className="flex gap-2">
        {[7, 14, 30, 60, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${days === d ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10'}`}>
            {d}d
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {chartConfig.map(c => (
          <div key={c.key} className="glass-card p-5">
            <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-1">{c.label} ({days}d)</p>
            {isLoading ? <div className="h-7 w-16 bg-foreground/5 rounded animate-pulse" /> :
              <p className="text-2xl font-bold" style={{ color: c.color }}>{c.total || 0}</p>}
          </div>
        ))}
      </div>

      {/* Charts */}
      {chartConfig.map(c => (
        <div key={c.key} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">{c.label} Over Time</h3>
          {isLoading ? (
            <div className="h-48 bg-foreground/5 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={(data as any)?.[c.key] || []}>
                <defs>
                  <linearGradient id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={c.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickFormatter={v => v.substring(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Area type="monotone" dataKey="count" stroke={c.color} fill={`url(#grad-${c.key})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      ))}
    </div>
  );
}
