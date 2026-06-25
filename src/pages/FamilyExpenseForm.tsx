import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  useFamilies,
  useCategories,
  useCreateExpense,
  useUpdateExpense,
  useFamilyExpenses,
} from '@/hooks/useQueries';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PAYMENT_METHODS } from '@/types';
import { ArrowLeft, Sparkles } from 'lucide-react';

const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().min(1, 'Category is required'),
  expense_date: z.string(),
  payment_method: z.enum(['cash', 'card', 'upi', 'netbanking', 'other']),
  notes: z.string().optional().nullable(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export function FamilyExpenseFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const { user, workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  // Fetch active family
  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  // Categories list
  const { data: categories } = useCategories(workspaceId);

  // Fetch expense if editing
  const { data: familyExpenses } = useFamilyExpenses(familyId, {}, 1, 50);
  const editingExpense = isEdit && familyExpenses?.data ? familyExpenses.data.find((e) => e.id === id) : undefined;

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      amount: undefined,
      category_id: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      notes: '',
    },
  });

  // Populate form if editing
  useEffect(() => {
    if (isEdit && editingExpense) {
      reset({
        title: editingExpense.title,
        amount: editingExpense.amount,
        category_id: editingExpense.category_id || '',
        expense_date: editingExpense.expense_date,
        payment_method: editingExpense.payment_method as any,
        notes: editingExpense.notes || '',
      });
    }
  }, [isEdit, editingExpense, reset]);

  const onSubmit = async (data: ExpenseFormData) => {
    if (!familyId || !workspaceId) {
      toast.error('Active family group not found. Cannot log shared expense.');
      return;
    }

    const toastId = toast.loading(isEdit ? 'Updating shared expense...' : 'Logging shared expense...');
    try {
      const payload = {
        title: data.title,
        amount: data.amount,
        category_id: data.category_id,
        expense_date: data.expense_date,
        payment_method: data.payment_method,
        notes: data.notes || null,
        expense_scope: 'family' as const,
        family_id: familyId,
        user_id: user!.id,
        workspace_id: null,
      };

      if (isEdit) {
        await updateExpense.mutateAsync({ id: id!, updates: payload });
        toast.success('Shared expense updated', { id: toastId });
        addNotification({ type: 'success', title: 'Shared Expense Updated', message: 'Shared expense details have been updated.' });
      } else {
        await createExpense.mutateAsync(payload);
        toast.success('Shared expense logged', { id: toastId });
        addNotification({ type: 'success', title: 'Shared Expense Added', message: 'New family shared expense logged successfully.' });
      }

      navigate('/family/expenses');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save expense', { id: toastId });
    }
  };

  if (familiesLoading) {
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
          <p className="text-foreground/60 mb-6">You must join or create a family group first in order to manage family expenses.</p>
          <Link to="/family">
            <Button>Setup Family Group</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/family/expenses">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {isEdit ? 'Edit Family Expense' : 'Log Family Expense'}
          </h1>
          <p className="text-foreground/60">
            {isEdit ? 'Modify details of this shared family transaction' : 'Record a shared expense for your family group'}
          </p>
        </div>
      </div>

      <Card className="relative overflow-hidden border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-glass">
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-600" />
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Title *"
              placeholder="e.g., Weekly Organic Groceries"
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Amount *"
                type="number"
                step="0.01"
                placeholder="0.00"
                error={errors.amount?.message}
                leftIcon={<span className="text-foreground/45">₹</span>}
                {...register('amount', { valueAsNumber: true })}
              />
              <Input
                label="Date *"
                type="date"
                error={errors.expense_date?.message}
                {...register('expense_date')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Category *"
                options={categories?.map((c) => {
                  const parent = c.parent_id ? categories.find((p) => p.id === c.parent_id) : null;
                  return { value: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name };
                }) || []}
                placeholder="Select category"
                error={errors.category_id?.message}
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
              label="Notes (optional)"
              type="textarea"
              placeholder="e.g., Purchased from Reliance Smart Supermarket"
              error={errors.notes?.message}
              {...register('notes')}
            />

            <div className="flex items-center gap-4 pt-4 justify-end">
              <Link to="/family/expenses">
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" isLoading={isSubmitting} className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 shadow-lg">
                {isEdit ? 'Save Changes' : 'Log Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
