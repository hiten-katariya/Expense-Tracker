import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMonthlySummary, useExpenses } from '@/hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Download, Calendar, TrendingUp, TrendingDown, CircleAlert as AlertCircle } from 'lucide-react';

const COLORS = ['#E74C3C', '#3498DB', '#9B59B6', '#27AE60', '#E67E22', '#1ABC9C', '#34495E', '#F39C12', '#95A5A6'];

export function ReportsPage() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(workspaceId, selectedYear, selectedMonth);

  const { data: allExpenses, isLoading: expensesLoading } = useExpenses(workspaceId, {}, 1, 500);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [selectedYear - 2, selectedYear - 1, selectedYear];

  const exportToCSV = () => {
    if (!allExpenses?.data) {
      addNotification({ type: 'error', title: 'No data', message: 'No expenses to export' });
      return;
    }

    const headers = ['Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Notes'];
    const rows = allExpenses.data.map((e) => [
      e.expense_date,
      e.title,
      e.category?.name || 'Other',
      e.amount.toString(),
      e.payment_method,
      e.notes || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${selectedYear}_${selectedMonth + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    addNotification({ type: 'success', title: 'Export complete', message: 'CSV file has been downloaded.' });
  };

  const chartData = summary?.category_breakdown.map((cat, i) => ({
    name: cat.category_name,
    value: cat.total,
    fill: COLORS[i % COLORS.length],
  })) || [];

  const dailyData = React.useMemo(() => {
    if (!allExpenses?.data) return [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const expensesByDay: Record<number, number> = {};

    allExpenses.data
      .filter((e) => {
        const date = new Date(e.expense_date);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      })
      .forEach((e) => {
        const day = new Date(e.expense_date).getDate();
        expensesByDay[day] = (expensesByDay[day] || 0) + e.amount;
      });

    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: expensesByDay[i + 1] || 0,
    }));
  }, [allExpenses, selectedMonth, selectedYear]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500">Analyze your spending patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={exportToCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {summaryLoading || expensesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-24" />
                  <div className="h-64 bg-slate-100 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Spent</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(summary?.total_spent || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Daily Average</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(summary?.daily_average || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Projected</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(summary?.projected_total || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Categories</p>
                    <p className="text-xl font-bold text-slate-900">
                      {summary?.category_breakdown.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Spending */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `₹${v}`}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Day ${label}`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Bar dataKey="amount" fill="#4A90D9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No expenses for {months[selectedMonth]} {selectedYear}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Spending Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {summary?.category_breakdown && summary.category_breakdown.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {summary.category_breakdown.map((cat) => (
                    <div key={cat.category_id} className="flex items-center gap-4 px-6 py-4">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: cat.category_color || '#95A5A6', color: '#fff' }}
                      >
                        {cat.category_icon || '📦'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{cat.category_name}</p>
                        <p className="text-xs text-slate-500">{cat.count} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(cat.total)}</p>
                        <p className="text-xs text-slate-500">{cat.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  No expense data available for this period
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
