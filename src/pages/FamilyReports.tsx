import { useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilies, useFamilyMembers, useFamilyExpenses } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatCurrency, sanitizeName } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import Papa from 'papaparse';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Download, Calendar, TrendingUp, Users, Activity } from 'lucide-react';

const COLORS = ['#6366F1', '#06B6D4', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#14B8A6', '#F43F5E', '#10B981'];

export function FamilyReportsPage() {
  const { user } = useAuthStore();
  const { darkMode } = useUIStore();
  const addNotification = useUIStore((s) => s.addNotification);

  // States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [exportLoading, setExportLoading] = useState(false);

  // Active Family Hook
  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  // Family Members Hook
  const { data: members, isLoading: membersLoading } = useFamilyMembers(familyId);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const years = [selectedYear - 1, selectedYear];

  // Selected period date range
  const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`;

  // Fetch family expenses for the selected month/year
  const { data: expenseData, isLoading: expensesLoading } = useFamilyExpenses(
    familyId,
    { date_from: startDate, date_to: endDate },
    1,
    2000 // Get all expenses in the month
  );

  const rawExpenses = expenseData?.data || [];
  const totalSpent = useMemo(() => rawExpenses.reduce((sum, e) => sum + e.amount, 0), [rawExpenses]);

  // 1. Spender Breakdown Calculations
  const spenderData = useMemo(() => {
    const map: Record<string, number> = {};
    rawExpenses.forEach((e) => {
      map[e.user_id] = (map[e.user_id] || 0) + e.amount;
    });

    return Object.entries(map).map(([uid, amount]) => {
      const profile = members?.find((m) => m.profile_id === uid)?.profile;
      const name = sanitizeName(profile?.full_name) || profile?.email?.split('@')[0] || 'Unknown';
      return { name, amount };
    }).sort((a, b) => b.amount - a.amount);
  }, [rawExpenses, members]);

  // 2. Category Breakdown Calculations
  const categoryData = useMemo(() => {
    const map: Record<string, { total: number; color: string }> = {};
    rawExpenses.forEach((e) => {
      const cname = e.category?.name || 'Uncategorized';
      const color = e.category?.color || '#95A5A6';
      if (!map[cname]) {
        map[cname] = { total: 0, color };
      }
      map[cname].total += e.amount;
    });

    return Object.entries(map).map(([name, val], idx) => ({
      name,
      value: val.total,
      color: val.color || COLORS[idx % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [rawExpenses]);

  // 3. Daily Spending Trend Calculations
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const map: Record<number, number> = {};
    rawExpenses.forEach((e) => {
      const day = new Date(e.expense_date).getDate();
      map[day] = (map[day] || 0) + e.amount;
    });

    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: map[i + 1] || 0
    }));
  }, [rawExpenses, selectedMonth, selectedYear]);

  // Monthly stats
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
  const dailyAverage = daysElapsed > 0 ? (totalSpent / daysElapsed) : 0;

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

  const handleExportCSV = async () => {
    if (!familyId) return;
    setExportLoading(true);
    addNotification({ type: 'info', title: 'Exporting CSV', message: 'Generating report download...' });

    try {
      const formatted = rawExpenses.map((e) => {
        const spenderProfile = members?.find((m) => m.profile_id === e.user_id)?.profile;
        const spenderName = sanitizeName(spenderProfile?.full_name) || spenderProfile?.email || 'Unknown';
        return {
          'Date': e.expense_date,
          'Title': e.title,
          'Amount': e.amount,
          'Category': e.category?.name || 'Uncategorized',
          'Logged By': spenderName,
          'Payment Method': e.payment_method,
          'Notes': e.notes || '',
        };
      });

      const csv = Papa.unparse(formatted);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Family_Report_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      addNotification({ type: 'success', title: 'Export Complete', message: 'CSV successfully downloaded' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to export CSV report' });
    } finally {
      setExportLoading(false);
    }
  };

  if (familiesLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeFamily) {
    return (
      <Card className="py-12 text-center max-w-lg mx-auto">
        <CardContent>
          <Activity className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground">No active family</h2>
          <p className="text-sm text-foreground/60 mt-1 mb-6">
            Join or create a family group first in order to generate spending reports.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <TextReveal
            text="Family Reports"
            subtitle="Analyze collective family expenditures and spender behavior"
            textSize="text-2xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-foreground/10 bg-card text-foreground px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-foreground/10 bg-card text-foreground px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <Button
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExportCSV}
            disabled={exportLoading || rawExpenses.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {expensesLoading ? (
        <div className="p-12 text-center text-foreground/50">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading reports...
        </div>
      ) : rawExpenses.length > 0 ? (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-foreground/50">Total Month Spend</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-foreground/50">Daily Average</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(dailyAverage)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-foreground/50">Top Contributor</p>
                  <p className="text-xl font-bold text-foreground">
                    {spenderData[0]?.name || 'N/A'} ({formatCurrency(spenderData[0]?.amount || 0)})
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Trend Area Chart */}
            <Card>
              <div className="p-5 border-b border-foreground/5">
                <p className="text-sm font-bold text-foreground">Daily Spending Trend</p>
                <p className="text-[10px] text-foreground/45">How collective expenditures evolved over the month</p>
              </div>
              <CardContent className="p-5">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="familySpendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Spent']} contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="amount" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#familySpendGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown Pie Chart */}
            <Card>
              <div className="p-5 border-b border-foreground/5">
                <p className="text-sm font-bold text-foreground">Category Share</p>
                <p className="text-[10px] text-foreground/45">What categories dominated shared expenses</p>
              </div>
              <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-6 justify-center">
                <div className="w-full max-w-[200px] aspect-square">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-2 w-full">
                  {categoryData.slice(0, 5).map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-foreground/70 font-medium truncate max-w-[120px]">{entry.name}</span>
                      </div>
                      <span className="font-bold text-foreground">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Spender Contribution Bar Chart */}
            <Card className="lg:col-span-2">
              <div className="p-5 border-b border-foreground/5">
                <p className="text-sm font-bold text-foreground">Member Contribution Breakdown</p>
                <p className="text-[10px] text-foreground/45">How much money did each member log/contribute this month</p>
              </div>
              <CardContent className="p-5">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={spenderData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Contribution']} contentStyle={tooltipStyle} />
                    <Bar dataKey="amount" fill="#6366F1" radius={[8, 8, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="py-24 text-center">
          <CardContent className="space-y-4">
            <Activity className="h-16 w-16 mx-auto text-foreground/20" />
            <p className="text-sm text-foreground/60">No family expenses logged in {months[selectedMonth]} {selectedYear}.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
