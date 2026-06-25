import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useFamilies, useFamilyMembers, useFamilyBudgets } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { StatCardSkeleton, ExpenseRowSkeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate, sanitizeName } from '@/lib/utils';
import { Plus, TrendingUp, TrendingDown, Wallet, Users, ArrowRight, Activity, Target } from 'lucide-react';
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useUIStore } from '@/stores/uiStore';
import { CategoryIcon } from './Categories';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

const COLORS = ['#6366F1', '#06B6D4', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#14B8A6'];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
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
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${gradient}`} />
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

function buildSparklineData(expenses: any[]) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    const day = e.expense_date.slice(8, 10);
    map[day] = (map[day] || 0) + e.amount;
  });
  return Object.entries(map)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, amount]) => ({ day, amount }));
}

export function FamilyDashboardPage() {
  const { user } = useAuthStore();
  const { darkMode } = useUIStore();

  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  const { isLoading: membersLoading } = useFamilyMembers(familyId);
  const { data: familyBudgets, isLoading: budgetsLoading } = useFamilyBudgets(familyId);

  // Fetch Family Expenses (both current month and last month to calculate trends/MoM)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const dateFrom = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const dateTo = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`;

  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevDateFrom = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-01`;
  const prevDateTo = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${new Date(prevYear, prevMonthIndex + 1, 0).getDate()}`;

  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['family-dashboard-expenses', familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category:categories(*), profile:profiles!user_id(*)')
        .eq('family_id', familyId!)
        .eq('expense_scope', 'family')
        .eq('is_deleted', false)
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!familyId,
  });

  const { data: prevExpenses } = useQuery({
    queryKey: ['family-dashboard-prev-expenses', familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('family_id', familyId!)
        .eq('expense_scope', 'family')
        .eq('is_deleted', false)
        .gte('expense_date', prevDateFrom)
        .lte('expense_date', prevDateTo);
      if (error) throw error;
      return data;
    },
    enabled: !!familyId,
  });

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

  if (familiesLoading || membersLoading || expensesLoading || budgetsLoading) {
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

  if (!activeFamily) {
    return (
      <Card className="py-12 text-center max-w-lg mx-auto">
        <CardContent>
          <Users className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground">No active family</h2>
          <p className="text-sm text-foreground/60 mt-1 mb-6">
            Join or create a family group first in order to view the family dashboard.
          </p>
          <Link to="/family">
            <Button>Go to Family Setup</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Calculate calculations
  const totalSpent = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const prevTotalSpent = prevExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const momChange = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

  // Spender breakdown calculations
  const spenderMap: Record<string, { name: string; amount: number; email: string }> = {};
  expenses?.forEach((e) => {
    const uid = e.user_id;
    const name = sanitizeName(e.profile?.full_name) || e.profile?.email?.split('@')[0] || 'Unknown Member';
    const email = e.profile?.email || '';
    if (!spenderMap[uid]) {
      spenderMap[uid] = { name, amount: 0, email };
    }
    spenderMap[uid].amount += e.amount;
  });
  const spenderBreakdown = Object.values(spenderMap).sort((a, b) => b.amount - a.amount);

  // Category breakdown calculations
  const categoryMap: Record<string, { total: number; name: string; icon: string; color: string }> = {};
  expenses?.forEach((e) => {
    const cid = e.category_id || 'uncategorized';
    if (!categoryMap[cid]) {
      categoryMap[cid] = {
        total: 0,
        name: e.category?.name || 'Uncategorized',
        icon: e.category?.icon || 'Circle',
        color: e.category?.color || '#94a3b8'
      };
    }
    categoryMap[cid].total += e.amount;
  });
  const categoryBreakdown = Object.values(categoryMap)
    .sort((a, b) => b.total - a.total)
    .map((c) => ({
      name: c.name,
      value: c.total,
      percentage: totalSpent > 0 ? (c.total / totalSpent) * 100 : 0,
      icon: c.icon,
      color: c.color
    }));

  const pieData = categoryBreakdown.slice(0, 6);
  const sparklineData = buildSparklineData(expenses || []);
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Get family monthly budget limit
  const overallBudgetRecord = familyBudgets?.find((b) => b.category_id === null);
  const familyMonthlyBudget = overallBudgetRecord?.amount || 0;
  const budgetUtilization = familyMonthlyBudget > 0 ? (totalSpent / familyMonthlyBudget) * 100 : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-600 dark:text-purple-400">
              <Users className="h-3.5 w-3.5" /> Family Hub • {activeFamily.name}
            </span>
          </div>
          <TextReveal
            text="Family Dashboard"
            subtitle={`Financial overview for your family group in ${monthName}.`}
            textSize="text-3xl"
            variant="plain"
          />
        </div>
        <div className="flex items-center gap-3">
          <Link to="/family/members">
            <Button variant="secondary">Members</Button>
          </Link>
          <Link to="/family/expenses/new">
            <Button leftIcon={<Plus className="h-4 w-4" />} className="shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:shadow-[0_0_32px_rgba(99,102,241,0.45)]">
              Log Family Expense
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <PremiumStatCard
          title="Total Family Spent"
          value={formatCurrency(totalSpent)}
          subtitle={monthName}
          icon={<Wallet className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
          delay={0}
        />
        <PremiumStatCard
          title="Family Budget"
          value={familyMonthlyBudget > 0 ? formatCurrency(familyMonthlyBudget) : 'No Budget Set'}
          subtitle={familyMonthlyBudget > 0 ? `${budgetUtilization.toFixed(0)}% Utilized` : 'Scoped to family'}
          icon={<Target className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
          trend={familyMonthlyBudget > 0 ? (budgetUtilization > 100 ? 'up' : 'down') : undefined}
          trendValue={familyMonthlyBudget > 0 ? `${budgetUtilization.toFixed(0)}%` : undefined}
          delay={1}
        />
        <PremiumStatCard
          title="MoM Trend"
          value={prevTotalSpent > 0 ? `${momChange > 0 ? '+' : ''}${momChange.toFixed(1)}%` : 'N/A'}
          subtitle={`Compared to last month`}
          icon={<TrendingUp className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          trend={momChange > 0 ? 'up' : 'down'}
          trendValue={prevTotalSpent > 0 ? `${Math.abs(momChange).toFixed(0)}%` : undefined}
          delay={2}
        />
        <PremiumStatCard
          title="Top Category"
          value={categoryBreakdown[0]?.name || 'None'}
          subtitle={categoryBreakdown[0] ? `₹${categoryBreakdown[0].value.toLocaleString('en-IN')}` : 'No transactions'}
          icon={<Activity className="h-5 w-5" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          delay={3}
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown */}
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
              <p className="text-xs text-foreground/45 mt-0.5">Family shared expenses</p>
            </div>
            <Target className="h-4 w-4 text-purple-500/60" />
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
                {categoryBreakdown.slice(0, 4).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-xs text-foreground/60 flex-1 truncate">{cat.name}</span>
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
              <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <Target className="h-7 w-7 text-purple-500/50" />
              </div>
              <p className="text-sm font-medium text-center">No shared expenses yet</p>
            </div>
          )}
        </motion.div>

        {/* Spending trend */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Shared Spending Trend</h3>
              <p className="text-xs text-foreground/45 mt-0.5">Daily total family expenses — {monthName}</p>
            </div>
            <Activity className="h-4 w-4 text-purple-500/60" />
          </div>
          {sparklineData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sparklineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <RechartsTooltip
                  formatter={(value: number) => [formatCurrency(value), 'Spent']}
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: 'rgba(139,92,246,0.2)', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="amount" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#spendGrad)" dot={false} activeDot={{ r: 5, fill: '#8B5CF6', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-foreground/40 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/8 flex items-center justify-center">
                <Activity className="h-7 w-7 text-purple-500/50" />
              </div>
              <p className="text-sm font-medium text-center">Add shared expenses to see trend charts</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Spender Breakdown & Recent Family Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spender breakdown list */}
        <motion.div
          custom={6}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="glass-card p-6 flex flex-col h-full"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Spender Breakdown</h3>
              <p className="text-xs text-foreground/45 mt-0.5">Top contributors this month</p>
            </div>
            <Users className="h-4 w-4 text-purple-500/60" />
          </div>
          <div className="space-y-4 flex-grow overflow-y-auto max-h-[300px]">
            {spenderBreakdown.length > 0 ? (
              spenderBreakdown.map((s) => (
                <div key={s.email} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 font-bold text-sm">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-foreground/50 truncate">{s.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-foreground">{formatCurrency(s.amount)}</p>
                    <p className="text-[10px] text-foreground/40">{((s.amount / totalSpent) * 100).toFixed(0)}% contribution</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-foreground/40 py-12 text-center">
                <p className="text-xs font-semibold">No contributors yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent shared expenses */}
        <motion.div
          custom={7}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="glass-card overflow-hidden lg:col-span-2 flex flex-col h-full"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-foreground/5 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Shared Expenses</h3>
              <p className="text-xs text-foreground/45 mt-0.5">Latest family transactions</p>
            </div>
            <Link to="/family/expenses" className="flex items-center gap-1 text-xs font-bold text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group">
              View all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="flex-grow divide-y divide-foreground/5 max-h-[300px] overflow-y-auto">
            {expenses && expenses.length > 0 ? (
              expenses.slice(0, 5).map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-4 py-3.5 px-6 hover:bg-foreground/[0.02] transition-colors duration-200"
                >
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: expense.category?.color || '#8B5CF6' }}
                  >
                    <CategoryIcon iconName={expense.category?.icon || 'Circle'} className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{expense.title}</p>
                    <p className="text-xs text-foreground/50 mt-0.5 flex items-center gap-1.5">
                      {formatDate(expense.expense_date)}
                      <span className="w-1 h-1 rounded-full bg-foreground/25 inline-block" />
                      <span>by {sanitizeName(expense.profile?.full_name) || expense.profile?.email?.split('@')[0]}</span>
                    </p>
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(expense.amount)}</span>
                </div>
              ))
            ) : (
              <div className="py-16 text-center space-y-4">
                <p className="text-xs text-foreground/45">No shared expenses recorded this month.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
