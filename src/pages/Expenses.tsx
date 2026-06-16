import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useExpenses, useCategories, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useQueries';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { ExpenseRowSkeleton } from '@/components/Skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import type { Expense } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, ChevronLeft, ChevronRight, CreditCard as Edit2, Trash2, Calendar, TriangleAlert as AlertTriangle } from 'lucide-react';
import { PAYMENT_METHODS } from '@/types';

const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().optional().nullable(),
  expense_date: z.string(),
  payment_method: z.enum(['cash', 'card', 'upi', 'netbanking', 'other']),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const ITEMS_PER_PAGE = 20;

export function ExpensesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || '';

  const { data: expenseData, isLoading } = useExpenses(workspaceId, {
    search,
    category_id: categoryFilter || undefined,
  }, page, ITEMS_PER_PAGE);

  const { data: categories } = useCategories(workspaceId);
  const deleteExpense = useDeleteExpense();

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense.mutateAsync({ id: expense.id, workspaceId: expense.workspace_id });
      addNotification({ type: 'success', title: 'Expense deleted', message: 'The expense has been moved to trash.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete expense' });
    }
  };

  const totalExpenses = expenseData?.count || 0;
  const totalPages = Math.ceil(totalExpenses / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500">Manage and track all your expenses</p>
        </div>
        <Link to="/expenses/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Add Expense</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  defaultValue={search}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    if (e.target.value) {
                      params.set('search', e.target.value);
                    } else {
                      params.delete('search');
                    }
                    params.set('page', '1');
                    setSearchParams(params);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <Select
              options={categories?.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })) || []}
              placeholder="All Categories"
              value={categoryFilter}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value) {
                  params.set('category', e.target.value);
                } else {
                  params.delete('category');
                }
                params.set('page', '1');
                setSearchParams(params);
              }}
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card>
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <ExpenseRowSkeleton key={i} />
            ))}
          </div>
        ) : expenseData && expenseData.data.length > 0 ? (
          <>
            <div className="divide-y divide-slate-100">
              {expenseData.data.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-4 py-4 px-6 hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-2xl">{expense.category?.icon || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {expense.title}
                      </p>
                      {expense.is_flagged && (
                        <span className="text-red-500" title="Anomaly detected">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(expense.expense_date)}
                      <span>•</span>
                      <span>
                        {PAYMENT_METHODS.find((m) => m.value === expense.payment_method)?.icon}{' '}
                        {PAYMENT_METHODS.find((m) => m.value === expense.payment_method)?.label}
                      </span>
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: expense.category?.color || '#95A5A6',
                      color: '#fff',
                    }}
                  >
                    {expense.category?.name || 'Other'}
                  </span>
                  <span className="text-base font-semibold text-slate-900">
                    {formatCurrency(expense.amount)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton
                      size="sm"
                      onClick={() => navigate(`/expenses/edit/${expense.id}`)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(expense)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(page * ITEMS_PER_PAGE, totalExpenses)} of {totalExpenses} expenses
                </p>
                <div className="flex items-center gap-2">
                  <IconButton
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set('page', String(page - 1));
                      setSearchParams(params);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </IconButton>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <IconButton
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.set('page', String(page + 1));
                      setSearchParams(params);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-slate-500">No expenses found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search || categoryFilter
                ? 'Try adjusting your filters'
                : 'Add your first expense to get started'}
            </p>
            {!search && !categoryFilter && (
              <Link to="/expenses/new">
                <Button variant="ghost" className="mt-4">
                  Add Expense
                </Button>
              </Link>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export function ExpenseFormPage() {
  const navigate = useNavigate();
  const { workspace, profile } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);
  const isEdit = window.location.pathname.includes('/edit/');

  const expenseId = isEdit ? window.location.pathname.split('/').pop() : null;

  const { data: categories } = useCategories(workspaceId);
  const { data: expenseData } = useExpenses(workspaceId, {}, 1, 1);
  const expense = isEdit && expenseId ? expenseData?.data.find((e) => e.id === expenseId) : undefined;

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: expense?.title || '',
      amount: expense?.amount || undefined,
      category_id: expense?.category_id || '',
      expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
      payment_method: expense?.payment_method || 'cash',
      notes: expense?.notes || '',
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      const payload = {
        title: data.title,
        amount: data.amount,
        category_id: data.category_id || null,
        expense_date: data.expense_date,
        payment_method: data.payment_method,
        notes: data.notes || null,
        user_id: profile!.id,
        workspace_id: workspaceId!,
      };

      if (isEdit && expenseId) {
        await updateExpense.mutateAsync({ id: expenseId, updates: payload });
        addNotification({ type: 'success', title: 'Expense updated', message: 'Changes saved successfully.' });
      } else {
        await createExpense.mutateAsync(payload);
        addNotification({ type: 'success', title: 'Expense added', message: 'Your expense has been recorded.' });
      }
      navigate('/expenses');
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to save expense' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? 'Edit Expense' : 'Add Expense'}
        </h1>
        <p className="text-slate-500">
          {isEdit ? 'Update the details of your expense' : 'Record a new expense'}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Title *"
              placeholder="e.g., Grocery shopping at Big Bazaar"
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount *"
                type="number"
                step="0.01"
                placeholder="0.00"
                error={errors.amount?.message}
                leftIcon={<span className="text-slate-400">₹</span>}
                {...register('amount', { valueAsNumber: true })}
              />

              <Input
                label="Date *"
                type="date"
                error={errors.expense_date?.message}
                {...register('expense_date')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Category"
                options={categories?.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })) || []}
                placeholder="Select category"
                {...register('category_id')}
              />

              <Select
                label="Payment Method *"
                options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: `${m.icon} ${m.label}` }))}
                error={errors.payment_method?.message}
                {...register('payment_method')}
              />
            </div>

            <Input
              label="Notes"
              type="textarea"
              placeholder="Add any additional notes..."
              {...register('notes')}
            />

            <div className="flex items-center gap-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {isEdit ? 'Save Changes' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
