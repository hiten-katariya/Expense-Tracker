import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMonthlySummary, useExpenses, useCategories } from '@/hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatCardSkeleton, ExpenseRowSkeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, TrendingUp, TrendingDown, Wallet, CircleAlert as AlertCircle, ArrowRight } from 'lucide-react';
import {
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#E74C3C', '#3498DB', '#9B59B6', '#27AE60', '#E67E22', '#1ABC9C', '#34495E', '#F39C12', '#95A5A6'];

export function Dashboard() {
  const { workspace } = useAuthStore();
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    <div className="space-y-6">
      <>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Welcome back! Here's your spending overview.</p>
          </div>
          <Link to="/expenses/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Expense</Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          />
          <StatCard
            title="Projected Total"
            value={formatCurrency(summary?.projected_total || 0)}
            subtitle="End of month estimate"
            icon={<TrendingDown className="h-5 w-5" />}
          />
          <StatCard
            title="Categories"
            value={categories?.length || 0}
            subtitle="Active categories"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Breakdown */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500">
                  No expenses this month
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {summary?.category_breakdown.slice(0, 4).map((cat) => (
                  <div key={cat.category_id} className="flex items-center gap-2 text-sm">
                    <span>{cat.category_icon}</span>
                    <span className="text-slate-600 truncate">{cat.category_name}</span>
                    <span className="ml-auto font-medium text-slate-900">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Spending Trend (placeholder for now) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Add more expenses to see your spending trend</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Expenses</CardTitle>
            <Link to="/expenses" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentExpenses && recentExpenses.data.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentExpenses.data.slice(0, 5).map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-4 py-3 px-6 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-lg">
                      {expense.category?.icon || '📦'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {expense.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(expense.expense_date)}
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: expense.category?.color || '#95A5A6',
                        color: '#fff',
                      }}
                    >
                      {expense.category?.name || 'Other'}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <p>No expenses yet. Add your first expense to get started!</p>
                <Link to="/expenses/new">
                  <Button variant="ghost" className="mt-4">
                    Add Expense
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    </div>
  );
}
