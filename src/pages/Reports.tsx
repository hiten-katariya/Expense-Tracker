import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMonthlySummary, useExpenses, useBudgets } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatCurrency, cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AnimatePresence, motion } from 'framer-motion';
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
import { 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CircleAlert as AlertCircle, 
  Loader2, 
  ChevronDown, 
  FileText, 
  Database, 
  Layers 
} from 'lucide-react';

const COLORS = ['#E74C3C', '#3498DB', '#9B59B6', '#27AE60', '#E67E22', '#1ABC9C', '#34495E', '#F39C12', '#95A5A6'];

const captureChart = async (id: string): Promise<string | null> => {
  const el = document.getElementById(id);
  if (!el) return null;
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error(`Failed to capture chart ${id}:`, err);
    return null;
  }
};

export function ReportsPage() {
  const { workspace } = useAuthStore();
  const { darkMode } = useUIStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(workspaceId, selectedYear, selectedMonth);
  const { data: allExpenses, isLoading: expensesLoading } = useExpenses(workspaceId, { expense_scope: 'personal' }, 1, 500);
  const { data: budgets } = useBudgets(workspaceId);

  // Prev month summary for trends
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const { data: prevSummary } = useMonthlySummary(workspaceId, prevYear, prevMonth);

  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [exportLoadingPDF, setExportLoadingPDF] = React.useState(false);
  const [exportLoadingCSV, setExportLoadingCSV] = React.useState(false);

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [selectedYear - 2, selectedYear - 1, selectedYear];

  // Date and spend calculations
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;
  const isPastMonth = today.getFullYear() > selectedYear || (today.getFullYear() === selectedYear && today.getMonth() > selectedMonth);
  const daysElapsed = isCurrentMonth 
    ? today.getDate() 
    : (isPastMonth ? daysInMonth : 0);

  const totalSpent = summary?.total_spent || 0;
  const dailyAverage = daysElapsed > 0 ? (totalSpent / daysElapsed) : 0;
  const projectedTotal = daysElapsed > 0 ? (dailyAverage * daysInMonth) : 0;

  const overallBudget = budgets?.find((b) => !b.category_id);
  const isOverBudget = overallBudget && projectedTotal > overallBudget.amount;
  const percentOfBudget = overallBudget ? (projectedTotal / overallBudget.amount) * 100 : 0;

  // Trend comparison
  const prevSpent = prevSummary?.total_spent || 0;
  const trendValue = prevSpent > 0 ? ((projectedTotal - prevSpent) / prevSpent) * 100 : null;
  const trendIsUp = trendValue !== null && trendValue > 0;

  const exportToPDF = async () => {
    if (!summary || !workspaceId) {
      addNotification({ type: 'error', title: 'No data', message: 'No report data available to export' });
      return;
    }
    setExportLoadingPDF(true);
    addNotification({ type: 'info', title: 'Generating PDF', message: 'Preparing your PDF report with charts...' });

    try {
      // Capture charts
      const dailyChartImg = await captureChart('daily-spending-chart');
      const categoryChartImg = await captureChart('category-breakdown-chart');

      // Initialize A4 PDF: 210mm x 297mm
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor = [99, 102, 241]; // Indigo
      const darkColor = [15, 23, 42]; // slate-900
      const grayColor = [100, 116, 139]; // slate-500

      // Page 1 Header
      // Top colored bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 8, 'F');

      // Brand
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("EXPENSO", 15, 20);

      // Report Title
      doc.setFontSize(22);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("Monthly Expense Report", 15, 30);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      const dateStr = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });
      doc.text(`Generated on: ${dateStr} | Workspace: ${workspace?.name || 'Personal'}`, 15, 36);
      doc.text(`Period: ${months[selectedMonth]} ${selectedYear}`, 15, 42);

      // Divider line
      doc.setDrawColor(226, 232, 240); // border-slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 46, 195, 46);

      // Summaries Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("Spending Summary", 15, 54);

      // Draw 4 Summary Cards
      const cardW = 42;
      const cardH = 22;
      const startX = 15;
      const cardY = 58;

      const summaries = [
        { label: "Total Spent", val: formatCurrency(summary.total_spent) },
        { label: "Daily Average", val: formatCurrency(dailyAverage) },
        { label: "Projected Spend", val: formatCurrency(projectedTotal) },
        { label: "Active Categories", val: (summary.category_breakdown.length).toString() }
      ];

      summaries.forEach((s, idx) => {
        const x = startX + idx * (cardW + 4);
        // Draw light grey rounded card background
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'S');

        // Card Labels
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text(s.label, x + 3, cardY + 6);

        // Card Values
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(s.val, x + 3, cardY + 14);
      });

      // Overall Budget report if available
      let nextY = 88;
      if (overallBudget) {
        const isOver = projectedTotal > overallBudget.amount;
        if (isOver) {
          doc.setFillColor(254, 242, 242); // red-50
          doc.setDrawColor(254, 202, 202); // red-200
        } else {
          doc.setFillColor(240, 253, 250); // teal-50
          doc.setDrawColor(204, 251, 241); // teal-200
        }
        doc.roundedRect(15, nextY, 180, 12, 1.5, 1.5, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        if (isOver) {
          doc.setTextColor(185, 28, 28); // red-700
          doc.text(`WARNING: Projected spending (${formatCurrency(projectedTotal)}) exceeds monthly budget (${formatCurrency(overallBudget.amount)}) by ${((projectedTotal - overallBudget.amount) / overallBudget.amount * 100).toFixed(0)}%!`, 18, nextY + 7.5);
        } else {
          doc.setTextColor(15, 118, 110); // teal-700
          doc.text(`ON TRACK: Projected spending (${formatCurrency(projectedTotal)}) is within monthly budget (${formatCurrency(overallBudget.amount)}).`, 18, nextY + 7.5);
        }
        nextY += 18;
      }

      // Add Daily Spending Chart
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("Daily Spending Trends", 15, nextY);
      nextY += 4;

      if (dailyChartImg) {
        doc.addImage(dailyChartImg, 'PNG', 15, nextY, 180, 80);
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text("Chart rendering not available.", 15, nextY + 10);
      }

      // Footer page 1
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text("Page 1 of 3", 105, 287, { align: 'center' });

      // PAGE 2: Category Breakdown
      doc.addPage();
      
      // Top colored bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("Category Spending Breakdown", 15, 20);

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 24, 195, 24);

      if (categoryChartImg) {
        doc.addImage(categoryChartImg, 'PNG', 15, 28, 90, 60);
      }

      // Category Details Table
      let tableY = 96;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("Category Details", 15, tableY);
      tableY += 6;

      doc.setFontSize(9);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text("Category Name", 15, tableY);
      doc.text("Transactions", 95, tableY, { align: 'right' });
      doc.text("Total Spent", 145, tableY, { align: 'right' });
      doc.text("Percentage", 185, tableY, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(15, tableY + 2, 195, tableY + 2);
      tableY += 7;

      summary.category_breakdown.forEach((cat) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

        const colorHex = cat.category_color || '#95A5A6';
        const r = parseInt(colorHex.slice(1, 3), 16) || 149;
        const g = parseInt(colorHex.slice(3, 5), 16) || 165;
        const b = parseInt(colorHex.slice(5, 7), 16) || 166;
        doc.setFillColor(r, g, b);
        doc.rect(15, tableY - 2.5, 3, 3, 'F');

        doc.text(cat.category_name, 20, tableY);
        doc.text(cat.count.toString(), 95, tableY, { align: 'right' });
        doc.text(formatCurrency(cat.total), 145, tableY, { align: 'right' });
        doc.text(`${cat.percentage.toFixed(1)}%`, 185, tableY, { align: 'right' });

        doc.line(15, tableY + 2, 195, tableY + 2);
        tableY += 7;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text("Page 2 of 3", 105, 287, { align: 'center' });

      // PAGE 3: Filtered Expense Transactions List
      doc.addPage();
      
      // Top colored bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("Transactions List", 15, 20);

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 24, 195, 24);

      let listY = 32;
      doc.setFontSize(9);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text("Date", 15, listY);
      doc.text("Description", 40, listY);
      doc.text("Category", 105, listY);
      doc.text("Method", 145, listY);
      doc.text("Amount", 185, listY, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(15, listY + 2, 195, listY + 2);
      listY += 7;

      // Fetch expenses for the month/year
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`;
      
      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('*, category:categories(*)')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false });

      let pageCount = 3;
      if (monthExpenses && monthExpenses.length > 0) {
        monthExpenses.forEach((exp) => {
          if (listY > 270) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.text(`Page ${pageCount} of ${pageCount}`, 105, 287, { align: 'center' });
            
            doc.addPage();
            pageCount++;
            
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, 210, 8, 'F');
            
            listY = 24;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
            doc.text("Date", 15, listY);
            doc.text("Description", 40, listY);
            doc.text("Category", 105, listY);
            doc.text("Method", 145, listY);
            doc.text("Amount", 185, listY, { align: 'right' });
            
            doc.setDrawColor(241, 245, 249);
            doc.line(15, listY + 2, 195, listY + 2);
            listY += 7;
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

          doc.text(exp.expense_date, 15, listY);
          
          const title = exp.title.length > 32 ? exp.title.substring(0, 30) + '...' : exp.title;
          doc.text(title, 40, listY);
          
          doc.text(exp.category?.name || 'Uncategorized', 105, listY);
          doc.text(exp.payment_method.toUpperCase(), 145, listY);
          doc.text(formatCurrency(exp.amount), 185, listY, { align: 'right' });

          doc.line(15, listY + 2, 195, listY + 2);
          listY += 7.5;
        });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text("No expense transactions recorded in this period.", 15, listY + 5);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.text(`Page ${pageCount} of ${pageCount}`, 105, 287, { align: 'center' });

      const filename = `Expense_Report_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}.pdf`;
      doc.save(filename);
      addNotification({ type: 'success', title: 'PDF Export Complete', message: `Downloaded: ${filename}` });
    } catch (error) {
      console.error(error);
      addNotification({ type: 'error', title: 'Export Failed', message: 'Failed to generate PDF. Please try again.' });
    } finally {
      setExportLoadingPDF(false);
    }
  };

  const exportToCSV = async (type: 'all' | 'filtered' | 'categories') => {
    if (!workspaceId) return;
    setExportLoadingCSV(true);
    addNotification({ type: 'info', title: 'Generating CSV', message: 'Retrieving expense details...' });

    try {
      let csvData: any[] = [];
      let filename = '';

      if (type === 'all') {
        const { data, error } = await supabase
          .from('expenses')
          .select('*, category:categories(*)')
          .eq('workspace_id', workspaceId)
          .eq('is_deleted', false)
          .order('expense_date', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
          addNotification({ type: 'error', title: 'No Data', message: 'No expenses available to export' });
          return;
        }

        csvData = data.map((e) => ({
          'Date': e.expense_date,
          'Amount': e.amount,
          'Category': e.category?.name || 'Uncategorized',
          'Description': e.title,
          'Payment Method': e.payment_method,
          'Tags': e.tags || '',
          'Notes': e.notes || '',
          'Created At': new Date(e.created_at).toLocaleString(),
        }));

        const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        filename = `Expenses_${todayStr}.csv`;

      } else if (type === 'filtered') {
        const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
        const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`;
        
        const { data, error } = await supabase
          .from('expenses')
          .select('*, category:categories(*)')
          .eq('workspace_id', workspaceId)
          .eq('is_deleted', false)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate)
          .order('expense_date', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
          addNotification({ type: 'error', title: 'No Data', message: 'No expenses match the current filter' });
          return;
        }

        csvData = data.map((e) => ({
          'Date': e.expense_date,
          'Amount': e.amount,
          'Category': e.category?.name || 'Uncategorized',
          'Description': e.title,
          'Payment Method': e.payment_method,
          'Tags': e.tags || '',
          'Notes': e.notes || '',
          'Created At': new Date(e.created_at).toLocaleString(),
        }));

        filename = `Expenses_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}.csv`;

      } else if (type === 'categories') {
        if (!summary || summary.category_breakdown.length === 0) {
          addNotification({ type: 'error', title: 'No Data', message: 'No category breakdown available' });
          return;
        }

        csvData = summary.category_breakdown.map((cat) => ({
          'Category Name': cat.category_name,
          'Transaction Count': cat.count,
          'Total Spent': cat.total,
          'Percentage (%)': cat.percentage.toFixed(2),
        }));

        filename = `Category_Summary_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}.csv`;
      }

      const csv = Papa.unparse(csvData);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      addNotification({ type: 'success', title: 'CSV Downloaded', message: `Downloaded: ${filename}` });
    } catch (error) {
      console.error(error);
      addNotification({ type: 'error', title: 'Export Failed', message: 'Failed to generate CSV file' });
    } finally {
      setExportLoadingCSV(false);
    }
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
      {/* PDF Export Overlay Loading Indicator */}
      {exportLoadingPDF && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto">
          <div className="bg-card border border-foreground/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
            <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
            <div>
              <p className="font-bold text-foreground">Generating PDF Report</p>
              <p className="text-sm text-foreground/60 mt-1">Capturing charts, gathering database rows, and formatting pages...</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <TextReveal
            text="Reports"
            subtitle="Analyze your spending patterns"
            textSize="text-2xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-foreground/10 bg-card text-foreground px-3 py-2 text-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-foreground/10 bg-card text-foreground px-3 py-2 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Export Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button 
              variant="secondary" 
              leftIcon={(exportLoadingPDF || exportLoadingCSV) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 
              rightIcon={<ChevronDown className="h-3 w-3 opacity-60 ml-1" />}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={exportLoadingPDF || exportLoadingCSV}
            >
              {(exportLoadingPDF || exportLoadingCSV) ? 'Exporting...' : 'Export Reports'}
            </Button>
            
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-card border border-foreground/10 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col p-1.5"
                >
                  <div className="text-[10px] font-bold text-foreground/40 px-3 py-1.5 uppercase tracking-wider">
                    Format Options
                  </div>
                  
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      exportToPDF();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.04] rounded-lg transition-colors text-left"
                  >
                    <FileText className="h-4 w-4 text-rose-500" />
                    <div className="flex-1">
                      <p className="font-semibold">Export PDF Report</p>
                      <p className="text-[10px] text-foreground/50">Includes charts, branding & summary</p>
                    </div>
                  </button>

                  <div className="h-[1px] bg-foreground/5 my-1.5" />

                  <div className="text-[10px] font-bold text-foreground/40 px-3 py-1.5 uppercase tracking-wider">
                    CSV Data Export
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      exportToCSV('filtered');
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.04] rounded-lg transition-colors text-left"
                  >
                    <Database className="h-4 w-4 text-emerald-500" />
                    <div className="flex-1">
                      <p className="font-semibold">Filtered Monthly Expenses</p>
                      <p className="text-[10px] text-foreground/50">Respects month/year selectors</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      exportToCSV('all');
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.04] rounded-lg transition-colors text-left"
                  >
                    <Database className="h-4 w-4 text-primary-500" />
                    <div className="flex-1">
                      <p className="font-semibold">All Workspace Expenses</p>
                      <p className="text-[10px] text-foreground/50">Complete record, all-time</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      exportToCSV('categories');
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-foreground/[0.04] rounded-lg transition-colors text-left"
                  >
                    <Layers className="h-4 w-4 text-amber-500" />
                    <div className="flex-1">
                      <p className="font-semibold">Category Summaries CSV</p>
                      <p className="text-[10px] text-foreground/50">Summarized transaction breakdowns</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
                  <div className="h-10 w-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">Total Spent</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(summary?.total_spent || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">Daily Average</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(dailyAverage)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Projected Spend Card */}
            <Card className="relative overflow-hidden">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", 
                      isOverBudget ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {isOverBudget ? <AlertCircle className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60">Month Projection</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(projectedTotal)}
                      </p>
                    </div>
                  </div>
                  {/* Warning Badge */}
                  {isOverBudget && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 animate-pulse">
                      Exceeds Budget
                    </span>
                  )}
                </div>

                {/* Progress bar comparing projected spend against budget */}
                {overallBudget && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-foreground/50">
                      <span>Projected vs Budget</span>
                      <span>{percentOfBudget.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", 
                          isOverBudget ? "bg-red-500" : percentOfBudget > 80 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(100, percentOfBudget)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-foreground/45 text-right font-medium">
                      Budget: {formatCurrency(overallBudget.amount)}
                    </p>
                  </div>
                )}

                {/* Info and trend */}
                <div className="flex items-center justify-between text-[11px] border-t border-foreground/5 pt-2 mt-auto">
                  <span className="text-foreground/50">
                    {daysElapsed} / {daysInMonth} days elapsed
                  </span>
                  {trendValue !== null && (
                    <span className={cn("inline-flex items-center gap-0.5 font-bold", 
                      trendIsUp ? "text-red-500" : "text-emerald-500"
                    )}>
                      {trendIsUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(trendValue).toFixed(0)}% vs last mo.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">Categories</p>
                    <p className="text-xl font-bold text-foreground">
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
                <div id="daily-spending-chart" className="h-64 bg-card rounded-xl">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-foreground/10" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `₹${v}`}
                        tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Day ${label}`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.15)',
                          background: darkMode ? '#1e293b' : '#ffffff',
                          color: darkMode ? '#ffffff' : '#1e293b',
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
                  <div id="category-breakdown-chart" className="h-64 bg-card rounded-xl">
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
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.15)',
                            background: darkMode ? '#1e293b' : '#ffffff',
                            color: darkMode ? '#ffffff' : '#1e293b',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-foreground/60">
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
                <div className="divide-y divide-foreground/5">
                  {summary.category_breakdown.map((cat) => (
                    <div key={cat.category_id} className="flex items-center gap-4 px-6 py-4">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: cat.category_color || '#95A5A6', color: '#fff' }}
                      >
                        {cat.category_icon || '📦'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{cat.category_name}</p>
                        <p className="text-xs text-foreground/60">{cat.count} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(cat.total)}</p>
                        <p className="text-xs text-foreground/60">{cat.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-foreground/60">
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
