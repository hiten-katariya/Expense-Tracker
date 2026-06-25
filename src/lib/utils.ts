import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'full' = 'short'): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = format === 'short'
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : format === 'long'
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString('en-IN', options);
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function getMonthName(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function getBudgetPercentage(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(Math.round((spent / budget) * 100), 100);
}

export function getBudgetStatus(percentage: number): 'success' | 'warning' | 'danger' {
  if (percentage < 50) return 'success';
  if (percentage < 80) return 'warning';
  return 'danger';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function getRandomColor(): string {
  const colors = ['#E74C3C', '#3498DB', '#9B59B6', '#27AE60', '#E67E22', '#1ABC9C', '#34495E', '#F39C12'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function calculateMonthlyTrend(expenses: { expense_date: string; amount: number }[]): number {
  if (expenses.length < 2) return 0;
  const sortedExpenses = [...expenses].sort((a, b) =>
    new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
  );
  const firstHalf = sortedExpenses.slice(0, Math.floor(sortedExpenses.length / 2));
  const secondHalf = sortedExpenses.slice(Math.floor(sortedExpenses.length / 2));
  const firstTotal = firstHalf.reduce((sum, e) => sum + e.amount, 0);
  const secondTotal = secondHalf.reduce((sum, e) => sum + e.amount, 0);
  if (firstTotal === 0) return secondTotal > 0 ? 100 : 0;
  return Math.round(((secondTotal - firstTotal) / firstTotal) * 100);
}

export function calculateDailyAverage(expenses: { amount: number }[], daysInPeriod: number): number {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return daysInPeriod > 0 ? Math.round(total / daysInPeriod) : 0;
}

export function generateDailyHeatmapData(
  expenses: { expense_date: string; amount: number }[],
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth()
): { date: string; amount: number; level: number }[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: { date: string; amount: number; level: number }[] = [];

  const expensesByDate = expenses.reduce((acc, e) => {
    const date = e.expense_date;
    acc[date] = (acc[date] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const maxAmount = Math.max(...Object.values(expensesByDate), 1);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = expensesByDate[date] || 0;
    const level = amount > 0 ? Math.ceil((amount / maxAmount) * 4) : 0;
    data.push({ date, amount, level });
  }

  return data;
}

export function sanitizeName(name: string | null | undefined): string {
  if (!name) return '';
  // Remove Unicode replacement character \uFFFD and trim trailing question marks/whitespace
  let clean = name.replace(/\uFFFD/g, '');
  clean = clean.replace(/[?\s]+$/, '').trim();
  return clean;
}

