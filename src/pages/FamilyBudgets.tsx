import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  useFamilies,
  useFamilyMembers,
  useFamilyBudgets,
  useCategories,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useFamilyExpenses,
  useUpdateFamily
} from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { formatCurrency } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CategoryIcon } from './Categories';
import { Plus, Target, Edit, Trash2, Lock, AlertTriangle } from 'lucide-react';
import type { Budget } from '@/types';
import { cn } from '@/lib/utils';

const budgetSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().min(1, 'Category is required'),
  budget_type: z.enum(['monthly', 'yearly']).default('monthly'),
  name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

export function FamilyBudgetsPage() {
  const { user, workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Overall Family Budget Modal State
  const [isOverallModalOpen, setIsOverallModalOpen] = useState(false);
  const [overallAmount, setOverallAmount] = useState<number | ''>('');

  // Active Family Hook
  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  // Family Members (for role permission verification)
  const { data: members, isLoading: membersLoading } = useFamilyMembers(familyId);
  const currentMember = members?.find((m) => m.profile_id === user?.id);
  const isOwner = currentMember?.member_role === 'owner';
  const isAdmin = currentMember?.member_role === 'admin';
  const canManageBudgets = isOwner || isAdmin;

  // Categories list
  const { data: categories } = useCategories(workspaceId);

  // Fetch family budgets
  const { data: familyBudgets, isLoading: budgetsLoading } = useFamilyBudgets(familyId);

  // Fetch current month's expenses to calculate utilization
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const { data: expenseData, isLoading: expensesLoading } = useFamilyExpenses(
    familyId,
    { date_from: currentMonthStart },
    1,
    1000 // Get current month's expenses (up to 1000)
  );

  // Mutations
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const updateFamily = useUpdateFamily();

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
  });

  const handleOpenAddModal = () => {
    if (!canManageBudgets) {
      toast.error('Only owners and admins can create family budgets.');
      return;
    }
    setEditingBudget(null);
    reset({
      amount: undefined,
      category_id: '',
      budget_type: 'monthly',
      name: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (budget: Budget) => {
    if (!canManageBudgets) {
      toast.error('Only owners and admins can edit family budgets.');
      return;
    }
    setEditingBudget(budget);
    reset({
      amount: budget.amount,
      category_id: budget.category_id || '',
      budget_type: budget.budget_type,
      name: budget.name || '',
      notes: budget.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    reset();
  };

  const handleOpenOverallBudgetModal = () => {
    if (!canManageBudgets) {
      toast.error('Only owners and admins can configure overall family budgets.');
      return;
    }
    const overallBudgetRecord = familyBudgets?.find((b) => b.category_id === null);
    setOverallAmount(overallBudgetRecord?.amount || '');
    setIsOverallModalOpen(true);
  };

  const handleSaveOverallBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId) return;

    const amountNum = overallAmount === '' ? null : Number(overallAmount);
    if (amountNum !== null && (isNaN(amountNum) || amountNum <= 0)) {
      toast.error('Please enter a valid positive number.');
      return;
    }

    const toastId = toast.loading('Saving overall budget limit...');
    try {
      const overallBudgetRecord = familyBudgets?.find((b) => b.category_id === null);
      if (amountNum !== null) {
        if (overallBudgetRecord) {
          await updateBudget.mutateAsync({
            id: overallBudgetRecord.id,
            updates: {
              amount: amountNum,
            },
          });
        } else {
          await createBudget.mutateAsync({
            amount: amountNum,
            category_id: null,
            budget_type: 'monthly',
            workspace_id: null, // Scoped to family, no workspace dependency!
            family_id: familyId,
            currency_code: 'INR',
            starts_on: currentMonthStart,
            name: 'Overall Family Budget',
            notes: 'Configured from family budgets page',
            scope: 'family',
          });
        }
      } else if (overallBudgetRecord) {
        await deleteBudget.mutateAsync({ id: overallBudgetRecord.id, workspaceId: '' });
      }

      toast.success('Overall budget limit updated successfully!', { id: toastId });
      addNotification({
        type: 'success',
        title: 'Budget Configured',
        message: amountNum ? `Overall monthly budget limit set to ${formatCurrency(amountNum)}.` : 'Overall monthly budget limit cleared.',
      });
      setIsOverallModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save overall budget', { id: toastId });
    }
  };

  const handleDeleteBudget = async (id: string, budgetName: string) => {
    if (!canManageBudgets) {
      toast.error('Only owners and admins can delete family budgets.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the budget "${budgetName}"?`)) return;

    const toastId = toast.loading('Deleting budget...');
    try {
      await deleteBudget.mutateAsync({ id, workspaceId: workspaceId! });
      toast.success('Budget deleted successfully', { id: toastId });
      addNotification({ type: 'success', title: 'Budget Deleted', message: `Family budget for ${budgetName} was deleted.` });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete budget', { id: toastId });
    }
  };

  const onSubmit = async (data: BudgetFormData) => {
    if (!familyId || !workspaceId) return;

    const toastId = toast.loading(editingBudget ? 'Updating budget...' : 'Creating budget...');
    try {
      const budgetCategory = categories?.find((c) => c.id === data.category_id);
      const categoryName = budgetCategory?.name || 'Category';

      if (editingBudget) {
        await updateBudget.mutateAsync({
          id: editingBudget.id,
          updates: {
            amount: data.amount,
            category_id: data.category_id || null,
            budget_type: data.budget_type,
            name: data.name || null,
            notes: data.notes || null,
            scope: 'family',
          },
        });
        toast.success('Budget updated successfully', { id: toastId });
        addNotification({ type: 'success', title: 'Budget Updated', message: `Family budget for ${categoryName} updated.` });
      } else {
        await createBudget.mutateAsync({
          amount: data.amount,
          category_id: data.category_id || null,
          budget_type: data.budget_type,
          workspace_id: null, // Scoped to family, no workspace dependency!
          family_id: familyId,
          currency_code: 'INR',
          starts_on: currentMonthStart,
          name: data.name || null,
          notes: data.notes || null,
          scope: 'family',
        });
        toast.success('Budget created successfully', { id: toastId });
        addNotification({ type: 'success', title: 'Budget Created', message: `New family budget for ${categoryName} established.` });
      }
      handleCloseModal();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save budget', { id: toastId });
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
          <Target className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground">No active family</h2>
          <p className="text-sm text-foreground/60 mt-1 mb-6">
            Join or create a family group first in order to manage shared budgets.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate spent amount by category client-side
  const spentByCategory: Record<string, number> = {};
  let totalMonthlySpent = 0;
  expenseData?.data?.forEach((e) => {
    totalMonthlySpent += e.amount;
    if (e.category_id) {
      spentByCategory[e.category_id] = (spentByCategory[e.category_id] || 0) + e.amount;
    }
  });

  // Calculate overall budget metrics
  const overallBudgetRecord = familyBudgets?.find((b) => b.category_id === null);
  const familyMonthlyBudget = overallBudgetRecord?.amount || 0;
  const overallPercentage = familyMonthlyBudget > 0 ? (totalMonthlySpent / familyMonthlyBudget) * 100 : 0;
  const overallRemaining = familyMonthlyBudget - totalMonthlySpent;
  const isOverOverall = overallRemaining < 0;

  let overallProgressColor = 'bg-purple-600';
  if (overallPercentage >= 100) {
    overallProgressColor = 'bg-rose-500';
  } else if (overallPercentage >= 80) {
    overallProgressColor = 'bg-amber-500';
  }

  // Filter out the overall family budget record (category_id is NULL) from category lists
  const categoryBudgets = familyBudgets?.filter((b) => b.category_id !== null) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <TextReveal
            text="Family Budgets"
            subtitle="Monitor category limits and shared expenditures"
            textSize="text-2xl"
          />
        </div>
        {canManageBudgets ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenAddModal}>
            Add Family Budget
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 rounded-xl border border-foreground/10 text-foreground/60 text-xs">
            <Lock className="h-3.5 w-3.5" />
            <span>Budgets are read-only for standard members</span>
          </div>
        )}
      </div>

      {/* Overall Family Budget Premium Banner Card */}
      <Card className="relative overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.03] via-indigo-500/[0.01] to-transparent shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                <h3 className="font-extrabold text-lg text-foreground">Overall Family Budget</h3>
                {familyMonthlyBudget > 0 ? (
                  isOverOverall ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-500 animate-pulse">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Overspending
                    </span>
                  ) : overallPercentage >= 80 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-500">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Approaching Limit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500">
                      Active
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-bold text-foreground/50">
                    Not Configured
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/50">
                Monthly spending limit across all categories combined
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {canManageBudgets && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit className="h-4 w-4" />}
                  onClick={handleOpenOverallBudgetModal}
                >
                  Configure Overall Budget
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-foreground/5">
            <div>
              <span className="text-[10px] text-foreground/45 uppercase tracking-wider block font-semibold">Collective Spent</span>
              <span className="text-2xl font-black text-foreground tabular-nums">{formatCurrency(totalMonthlySpent)}</span>
            </div>
            <div>
              <span className="text-[10px] text-foreground/45 uppercase tracking-wider block font-semibold">Total Budget Limit</span>
              <span className="text-2xl font-black text-foreground tabular-nums">
                {familyMonthlyBudget > 0 ? formatCurrency(familyMonthlyBudget) : 'Not Established'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-foreground/45 uppercase tracking-wider block font-semibold">
                {isOverOverall ? 'Over Cap By' : 'Remaining Balance'}
              </span>
              <span className={cn("text-2xl font-black tabular-nums", isOverOverall ? "text-rose-500" : "text-emerald-500")}>
                {formatCurrency(Math.abs(overallRemaining))}
              </span>
            </div>
          </div>

          {familyMonthlyBudget > 0 && (
            <div className="space-y-2 mt-6">
              <div className="w-full h-3 rounded-full bg-foreground/5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", overallProgressColor)}
                  style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-foreground/60">
                <span>{overallPercentage.toFixed(0)}% of monthly budget utilized</span>
                <span>{formatCurrency(totalMonthlySpent)} / {formatCurrency(familyMonthlyBudget)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Budgets Header */}
      <div>
        <h3 className="font-bold text-md text-foreground flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-500" />
          Category Limits ({categoryBudgets.length})
        </h3>
      </div>

      {/* Category Budgets Grid */}
      {budgetsLoading || expensesLoading ? (
        <div className="p-12 text-center text-foreground/50">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading budgets...
        </div>
      ) : categoryBudgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryBudgets.map((budget) => {
            const spent = spentByCategory[budget.category_id || ''] || 0;
            const limit = budget.amount;
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            const remaining = limit - spent;
            const categoryName = budget.category?.name || 'Uncategorized';
            const isOverBudget = remaining < 0;

            let progressColor = 'bg-purple-600';
            if (percentage >= 100) {
              progressColor = 'bg-rose-500';
            } else if (percentage >= 80) {
              progressColor = 'bg-amber-500';
            }

            return (
              <Card
                key={budget.id}
                className="relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: budget.category?.color || '#95A5A6' }}
                    >
                      <CategoryIcon iconName={budget.category?.icon || 'Circle'} className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {categoryName}
                        {percentage >= 100 ? (
                          <span title="Over budget limit!" className="shrink-0 flex items-center">
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                          </span>
                        ) : percentage >= 80 ? (
                          <span title="Approaching budget limit!" className="shrink-0 flex items-center">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </span>
                        ) : null}
                      </CardTitle>
                      <p className="text-[10px] text-foreground/45 mt-0.5 capitalize">
                        {budget.budget_type} Budget
                      </p>
                    </div>
                  </div>

                  {canManageBudgets && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconButton size="sm" onClick={() => handleOpenEditModal(budget)}>
                        <Edit className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton size="sm" variant="danger" onClick={() => handleDeleteBudget(budget.id, categoryName)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-2">
                  {/* Spend / Limit Stats */}
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] text-foreground/45 uppercase tracking-wider block">Spent</span>
                      <span className="text-lg font-extrabold text-foreground">{formatCurrency(spent)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-foreground/45 uppercase tracking-wider block">Limit</span>
                      <span className="text-sm font-semibold text-foreground/80">{formatCurrency(limit)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-foreground/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progressColor} transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-foreground/50">
                      <span>{percentage.toFixed(0)}% used</span>
                      {isOverBudget ? (
                        <span className="text-rose-500 flex items-center gap-1 font-bold">
                          Over by {formatCurrency(Math.abs(remaining))}
                        </span>
                      ) : (
                        <span>{formatCurrency(remaining)} left</span>
                      )}
                    </div>
                  </div>

                  {budget.notes && (
                    <p className="text-[11px] text-foreground/50 leading-relaxed border-t border-foreground/5 pt-2">
                      {budget.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <Target className="h-16 w-16 mx-auto text-foreground/20" />
            <p className="text-sm text-foreground/60">No family budgets established yet.</p>
            {canManageBudgets && (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenAddModal}>
                Create First Budget
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Category Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBudget ? 'Edit Family Budget' : 'Create Family Budget'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Category *"
            options={categories?.map((c) => {
              const parent = c.parent_id ? categories.find((p) => p.id === c.parent_id) : null;
              return { value: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name };
            }) || []}
            placeholder="Select a category"
            error={errors.category_id?.message}
            disabled={!!editingBudget} // lock category on edit
            {...register('category_id')}
          />

          <Input
            label="Budget Limit Amount *"
            type="number"
            step="0.01"
            placeholder="e.g., 10000"
            error={errors.amount?.message}
            leftIcon={<span className="text-foreground/45">₹</span>}
            {...register('amount', { valueAsNumber: true })}
          />

          <Select
            label="Budget Type"
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
            error={errors.budget_type?.message}
            {...register('budget_type')}
          />

          <Input
            label="Budget Name (optional)"
            placeholder="e.g., Household Grocery Cap"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Notes (optional)"
            type="textarea"
            placeholder="Add any reminders or instructions for the family..."
            {...register('notes')}
          />

          <div className="flex items-center gap-3 pt-4 justify-end">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingBudget ? 'Save Changes' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Configure Overall Family Budget Modal */}
      <Modal
        isOpen={isOverallModalOpen}
        onClose={() => setIsOverallModalOpen(false)}
        title="Configure Overall Family Budget"
        size="md"
      >
        <form onSubmit={handleSaveOverallBudget} className="space-y-4">
          <Input
            label="Overall Monthly Budget Limit"
            type="number"
            step="0.01"
            placeholder="e.g., 50000 (leave blank to clear)"
            value={overallAmount}
            onChange={(e) => setOverallAmount(e.target.value === '' ? '' : Number(e.target.value))}
            leftIcon={<span className="text-foreground/45">₹</span>}
          />
          <p className="text-[11px] text-foreground/50">
            This limit represents the collective monthly budget allocated to all categories combined. 
            It is synchronized directly with the budget limit configured in Family Settings.
          </p>
          <div className="flex items-center gap-3 pt-4 justify-end">
            <Button type="button" variant="secondary" onClick={() => setIsOverallModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateFamily.isPending}>
              Save Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
