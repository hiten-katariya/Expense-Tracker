
import { Link } from 'react-router-dom';
import { useAdminStats } from '@/hooks/useAdmin';
import {
  Users, Receipt, Target, Users2, Building2, Brain, ScanLine,
  Mail, Activity, TrendingUp, Shield, AlertTriangle, Clock, Zap
} from 'lucide-react';

const formatNumber = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString();
const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'from-blue-500 to-cyan-500', link: '/admin/users' },
    { label: 'Daily Active Users', value: stats?.dailyActiveUsers, icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
    { label: 'Expenses Today', value: stats?.expensesToday, icon: Receipt, color: 'from-violet-500 to-purple-500', link: '/admin/expenses' },
    { label: 'Total Expenses', value: stats?.totalExpenses, icon: Receipt, color: 'from-indigo-500 to-blue-500', link: '/admin/expenses' },
    { label: 'Total Budgets', value: stats?.totalBudgets, icon: Target, color: 'from-amber-500 to-orange-500', link: '/admin/budgets' },
    { label: 'Families', value: stats?.totalFamilies, icon: Users2, color: 'from-pink-500 to-rose-500', link: '/admin/families' },
    { label: 'Workspaces', value: stats?.totalWorkspaces, icon: Building2, color: 'from-cyan-500 to-blue-500', link: '/admin/workspaces' },
    { label: 'Emails Sent', value: stats?.totalEmailsSent, icon: Mail, color: 'from-green-500 to-emerald-500', link: '/admin/email-logs' },
    { label: 'AI Requests', value: stats?.totalAIRequests, icon: Brain, color: 'from-purple-500 to-violet-500', link: '/admin/ai-usage' },
    { label: 'OCR Requests', value: stats?.totalOCRRequests, icon: ScanLine, color: 'from-orange-500 to-red-500', link: '/admin/ocr-usage' },
    { label: 'Server Status', value: stats?.serverStatus || 'N/A', icon: Activity, color: stats?.serverStatus === 'UP' ? 'from-emerald-500 to-green-500' : 'from-red-500 to-rose-500', link: '/admin/system-health' },
    { label: 'Error Rate', value: stats?.errorRate !== undefined ? `${stats.errorRate.toFixed(1)}%` : 'N/A', icon: AlertTriangle, color: (stats?.errorRate || 0) > 5 ? 'from-red-500 to-rose-500' : 'from-emerald-500 to-green-500' },
    { label: 'Uptime', value: stats?.uptimeSeconds ? formatUptime(stats.uptimeSeconds) : 'N/A', icon: Clock, color: 'from-sky-500 to-blue-500', link: '/admin/system-health' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-foreground/50">Platform overview — read-only</p>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const CardWrapper = card.link ? Link : 'div';
          const wrapperProps = card.link ? { to: card.link } : {};

          return (
            <CardWrapper
              key={card.label}
              {...(wrapperProps as any)}
              className="glass-card p-5 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center shadow-lg opacity-90`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                {card.link && (
                  <Zap className="h-3.5 w-3.5 text-foreground/20 group-hover:text-foreground/40 transition-colors" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider">{card.label}</p>
                {isLoading ? (
                  <div className="h-7 w-20 bg-foreground/5 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {typeof card.value === 'number' ? formatNumber(card.value) : card.value}
                  </p>
                )}
              </div>
            </CardWrapper>
          );
        })}
      </div>
    </div>
  );
}
