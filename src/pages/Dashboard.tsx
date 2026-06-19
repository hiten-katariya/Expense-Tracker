import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useMonthlySummary, useExpenses, useCategories } from '@/hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatCardSkeleton, ExpenseRowSkeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, TrendingUp, TrendingDown, Wallet, CircleAlert as AlertCircle, ArrowRight, Layers } from 'lucide-react';
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { useUIStore } from '@/stores/uiStore';
import { CategoryIcon } from './Categories';

const COLORS = ['#6366F1', '#06B6D4', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#14B8A6', '#3B82F6', '#64748B'];

export function Dashboard() {
  const { workspace } = useAuthStore();
  const { darkMode } = useUIStore();
  const workspaceId = workspace?.id;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(
    workspaceId,
    currentYear,
    currentMonth
  );

  const { data: recentExpenses, isLoading: expensesLoading } = useExpenses(workspaceId, {}, 1, 5);

  const { data: categories } = useCategories(workspaceId);

  if (summaryLoading || expensesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><ExpenseRowSkeleton /></CardContent></Card>
          <Card><CardContent className="p-6"><ExpenseRowSkeleton /></CardContent></Card>
        </div>
      </div>
    );
  }

  const pieData = summary?.category_breakdown.slice(0, 6).map((cat) => ({
    name: cat.category_name,
    value: cat.total,
    icon: cat.category_icon,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Overview
          </h1>
          <p className="text-foreground/60 text-sm mt-1">Welcome back! Here's your spending overview for this month.</p>
        </div>
        <Link to="/expenses/new" className="self-start sm:self-auto">
          <Button leftIcon={<Plus className="h-4.5 w-4.5" />} className="shadow-[0_0_20px_rgba(99,102,241,0.25)]">
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Spent This Month"
          value={formatCurrency(summary?.total_spent || 0)}
          subtitle={new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          title="Daily Average"
          value={formatCurrency(summary?.daily_average || 0)}
          subtitle="/ day"
          icon={<TrendingUp className="h-5 w-5" />}
          trend="up"
          trendValue="4.2%"
        />
        <StatCard
          title="Projected Total"
          value={formatCurrency(summary?.projected_total || 0)}
          subtitle="End of month estimate"
          icon={<TrendingDown className="h-5 w-5" />}
          trend="down"
          trendValue="1.8%"
        />
        <StatCard
          title="Categories"
          value={categories?.length || 0}
          subtitle="Active categories"
          icon={<Layers className="h-5 w-5" />}
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            {pieData.length > 0 ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(30, 41, 59, 0.5)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        background: darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(12px)',
                        border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                        color: darkMode ? '#fff' : '#0f172a',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
                No expenses recorded this month
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4 px-4">
              {summary?.category_breakdown.slice(0, 4).map((cat, idx) => (
                <div key={cat.category_id} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-foreground/60 truncate max-w-[80px]">{cat.category_name}</span>
                  <span className="ml-auto font-semibold text-foreground">
                    {cat.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spending Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-foreground/60">
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center mx-auto text-foreground/60">
                  <AlertCircle className="h-6 w-6 opacity-60" />
                </div>
                <p className="text-sm font-medium">Add more expenses to reveal your custom trendlines</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">Recent Expenses</CardTitle>
          <Link to="/expenses" className="text-xs font-semibold text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 flex items-center gap-1 transition-colors">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentExpenses && recentExpenses.data.length > 0 ? (
            <div className="divide-y divide-foreground/5">
              {recentExpenses.data.slice(0, 5).map((expense) => (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  key={expense.id}
                  className="flex items-center gap-4 py-4.5 px-6 hover:bg-foreground/[0.02] transition-colors duration-200"
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: expense.category?.color || '#95A5A6' }}
                  >
                    <CategoryIcon iconName={expense.category?.icon || 'Circle'} className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {expense.title}
                    </p>
                    <p className="text-xs text-foreground/50 mt-0.5">
                      {formatDate(expense.expense_date)}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-foreground/5"
                      style={{
                        backgroundColor: `${expense.category?.color || '#95A5A6'}15`,
                        color: expense.category?.color || '#95A5A6',
                      }}
                    >
                      {expense.category ? (
                        expense.category.parent_id && categories
                          ? `${categories.find((p) => p.id === expense.category!.parent_id)?.name || ''} › ${expense.category.name}`
                          : expense.category.name
                      ) : 'Other'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrency(expense.amount)}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 space-y-4">
              <p className="text-sm">No expenses recorded yet. Let's start tracking!</p>
              <Link to="/expenses/new">
                <Button variant="secondary" size="sm">
                  Add Expense
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
