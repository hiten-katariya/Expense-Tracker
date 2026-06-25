import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useMonthlySummary, useExpenses, useCategories, useNotifications } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Button } from '@/components/Button';
import { StatCardSkeleton, ExpenseRowSkeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate, cn, sanitizeName } from '@/lib/utils';
import { Plus, TrendingUp, TrendingDown, Wallet, Layers, ArrowRight, Sparkles, Activity, Target, Bell, CircleAlert as AlertCircle } from 'lucide-react';
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useUIStore } from '@/stores/uiStore';
import { CategoryIcon } from './Categories';

const COLORS = ['#6366F1', '#06B6D4', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#14B8A6'];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  }),
};

function PremiumStatCard({
  title, value, subtitle, icon, gradient, trend, trendValue, delay = 0,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ReactNode; gradient: string; trend?: 'up' | 'down';
  trendValue?: string; delay?: number;
}) {
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="show"
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-glass group cursor-default"
    >
      {/* Gradient top accent */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${gradient}`} />
      {/* Background glow */}
      <div className={`absolute -top-8 -right-8 h-28 w-28 rounded-full opacity-10 blur-2xl ${gradient} group-hover:opacity-20 transition-opacity duration-500`} />
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white ${gradient} shadow-lg`}>
            {icon}
          </div>
          {trend && trendValue && (
            <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              trend === 'up'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendValue}
            </span>
          )}
        </div>
        <p className="text-2xl font-extrabold text-foreground tracking-tight">{value}</p>
        <p className="text-sm font-semibold text-foreground/70 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-foreground/45 mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

// Sparkline-style mini area data for visual decoration
function buildSparklineData(expenses: { expense_date: string; amount: number }[]) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    const day = e.expense_date.slice(8, 10);
    map[day] = (map[day] || 0) + e.amount;
  });
  return Object.entries(map)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, amount]) => ({ day, amount }));
}

export function Dashboard() {
  const { user, workspace, profile } = useAuthStore();
  const { darkMode } = useUIStore();
  const workspaceId = workspace?.id;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(workspaceId, currentYear, currentMonth);
  const { data: recentExpenses, isLoading: expensesLoading } = useExpenses(workspaceId, { expense_scope: 'personal' }, 1, 5);
  const { data: categories } = useCategories(workspaceId);
  const { data: allMonthExpenses } = useExpenses(workspaceId, {
    expense_scope: 'personal',
    date_from: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
    date_to: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`,
  }, 1, 200);

  const { data: notifications } = useNotifications(user?.id);
  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const tooltipStyle = {
    background: darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    color: darkMode ? '#fff' : '#0f172a',
    fontSize: '12px',
    fontWeight: 600,
  };

  if (summaryLoading || expensesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6"><ExpenseRowSkeleton /></div>
          <div className="glass-card p-6 lg:col-span-2"><ExpenseRowSkeleton /></div>
        </div>
      </div>
    );
  }

  const pieData = summary?.category_breakdown.slice(0, 6).map((cat) => ({
    name: cat.category_name, value: cat.total, icon: cat.category_icon,
  })) || [];

  const sparklineData = buildSparklineData(allMonthExpenses?.data || []);
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs font-bold text-primary-600 dark:text-primary-400">
              <Sparkles className="h-3 w-3" /> {monthName}
            </span>
          </div>
          <TextReveal
            text={`Welcome back, ${sanitizeName(profile?.full_name).split(' ')[0] || 'there'}`}
            subtitle="Here's your financial snapshot for this month."
            textSize="text-3xl"
            variant="plain"
          />
        </div>
        <Link to="/expenses/new" className="self-start sm:self-auto">
          <Button leftIcon={<Plus className="h-4 w-4" />} className="shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:shadow-[0_0_32px_rgba(99,102,241,0.45)]">
            Add Expense
          </Button>
        </Link>
      </motion.div>

      {/* Notifications Banner Alert */}
      {unreadCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-primary-500/30 bg-gradient-to-r from-primary-500/10 to-primary-600/5 backdrop-blur-xl p-4 flex items-center justify-between gap-4 group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">You have new alerts</p>
              <p className="text-xs text-foreground/60 mt-0.5">There are {unreadCount} unread system notifications requiring your attention.</p>
            </div>
          </div>
          <Link to="/notifications">
            <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>
              View Center
            </Button>
          </Link>
        </motion.div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <PremiumStatCard
          title="Total Spent"
          value={formatCurrency(summary?.total_spent || 0)}
          subtitle={monthName}
          icon={<Wallet className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-primary-500 to-primary-700"
          delay={0}
        />
        <PremiumStatCard
          title="Daily Average"
          value={formatCurrency(summary?.daily_average || 0)}
          subtitle="per day this month"
          icon={<Activity className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-secondary-500 to-secondary-600"
          delay={1}
        />
        <PremiumStatCard
          title="Month Projection"
          value={formatCurrency(summary?.projected_total || 0)}
          subtitle="estimated end-of-month"
          icon={<TrendingUp className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-accent-pink to-accent-pink-dark"
          delay={2}
        />
        <PremiumStatCard
          title="Categories"
          value={categories?.length || 0}
          subtitle="active this month"
          icon={<Layers className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          delay={3}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut chart */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="glass-card p-6 lg:col-span-1"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Category Breakdown</h3>
              <p className="text-xs text-foreground/45 mt-0.5">By spending amount</p>
            </div>
            <Target className="h-4 w-4 text-primary-500/60" />
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [formatCurrency(value), '']}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {summary?.category_breakdown.slice(0, 4).map((cat, idx) => (
                  <div key={cat.category_id} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-xs text-foreground/60 flex-1 truncate">{cat.category_name}</span>
                    <span className="text-xs font-bold text-foreground">{cat.percentage.toFixed(0)}%</span>
                    <div className="w-16 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-foreground/40 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                <Target className="h-7 w-7 text-primary-500/50" />
              </div>
              <p className="text-sm font-medium text-center">No spending data yet<br /><span className="text-xs font-normal">Add an expense to see breakdown</span></p>
            </div>
          )}
        </motion.div>

        {/* Spending trend area chart */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Spending Trend</h3>
              <p className="text-xs text-foreground/45 mt-0.5">Daily total — {monthName}</p>
            </div>
            <Activity className="h-4 w-4 text-primary-500/60" />
          </div>
          {sparklineData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sparklineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <RechartsTooltip
                  formatter={(value: number) => [formatCurrency(value), 'Spent']}
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: 'rgba(99,102,241,0.2)', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366F1" strokeWidth={2.5} fill="url(#spendGrad)" dot={false} activeDot={{ r: 5, fill: '#6366F1', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-foreground/40 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-primary-500/8 flex items-center justify-center">
                <Activity className="h-7 w-7 text-primary-500/50" />
              </div>
              <p className="text-sm font-medium text-center">Not enough data yet<br /><span className="text-xs font-normal">Add more expenses to unlock trend charts</span></p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Recent Actions & Alerts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Expenses (col-span-2) */}
        <motion.div
          custom={6}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="glass-card overflow-hidden lg:col-span-2 flex flex-col h-full"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-foreground/5 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Expenses</h3>
              <p className="text-xs text-foreground/45 mt-0.5">Latest transactions</p>
            </div>
            <Link to="/expenses" className="flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group">
              View all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="flex-grow">
            {recentExpenses && recentExpenses.data.length > 0 ? (
              <div className="divide-y divide-foreground/5">
                {recentExpenses.data.slice(0, 5).map((expense, idx) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 + 0.3, duration: 0.4 }}
                    className="flex items-center gap-4 py-4 px-6 hover:bg-foreground/[0.02] transition-colors duration-200 group"
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: expense.category?.color || '#6366F1' }}
                    >
                      <CategoryIcon iconName={expense.category?.icon || 'Circle'} className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{expense.title}</p>
                      <p className="text-xs text-foreground/50 mt-0.5 flex items-center gap-1.5">
                        {formatDate(expense.expense_date)}
                        {expense.category && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-foreground/25 inline-block" />
                            <span style={{ color: expense.category.color || undefined }}>{expense.category.name}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(expense.amount)}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto">
                  <Wallet className="h-7 w-7 text-foreground/25" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/60">No expenses yet</p>
                  <p className="text-xs text-foreground/40 mt-1">Start tracking to see your spending here</p>
                </div>
                <Link to="/expenses/new">
                  <Button variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>Add First Expense</Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Notifications Widget (col-span-1) */}
        <motion.div
          custom={7}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="glass-card overflow-hidden lg:col-span-1 flex flex-col h-full"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-foreground/5 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              <p className="text-xs text-foreground/45 mt-0.5">Recent updates</p>
            </div>
            <Link to="/notifications" className="flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group">
              View all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="flex-grow overflow-y-auto max-h-[360px] scrollbar-thin divide-y divide-foreground/5">
            {notifications && notifications.length > 0 ? (
              notifications.slice(0, 4).map((notification) => {
                let iconBg = 'bg-primary-500/10 text-primary-500';
                let Icon = Bell;
                if (notification.type === 'budget') {
                  iconBg = 'bg-red-500/10 text-red-500';
                  Icon = Target;
                } else if (notification.type === 'anomaly') {
                  iconBg = 'bg-rose-500/10 text-rose-500';
                  Icon = AlertCircle;
                } else if (notification.type === 'summary') {
                  iconBg = 'bg-purple-500/10 text-purple-500';
                  Icon = Activity;
                }
                return (
                  <div key={notification.id} className="p-4 flex gap-3 hover:bg-foreground/[0.01] transition-colors duration-200">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", iconBg)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-xs font-semibold truncate", !notification.is_read ? "text-foreground font-bold" : "text-foreground/70")}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse" />
                        )}
                      </div>
                      <p className="text-[11px] text-foreground/50 line-clamp-2 mt-0.5">{notification.message}</p>
                      <p className="text-[9px] text-foreground/40 mt-1">{new Date(notification.created_at).toLocaleDateString('en-IN', { dateStyle: 'short' })}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-foreground/40 p-6 text-center space-y-2 py-16">
                <Bell className="h-8 w-8 text-foreground/25 mx-auto" />
                <p className="text-xs font-semibold text-foreground/60">All caught up!</p>
                <p className="text-[10px] text-foreground/40 font-normal">No recent notifications</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
