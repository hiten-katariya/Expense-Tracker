import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { 
  useBudgets, 
  useCategories, 
  useCreateBudget, 
  useUpdateBudget,
  useDeleteBudget,
  useExpenses, 
  useWorkspaceMembers 
} from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { formatCurrency, getBudgetPercentage, getBudgetStatus } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { CategoryIcon } from './Categories';
import { Plus, Target, TriangleAlert as AlertTriangle, Edit, Trash2, Lock, Users, User, Bell } from 'lucide-react';
import type { Budget } from '@/types';

const budgetSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().optional().nullable(),
  budget_type: z.enum(['monthly', 'yearly']),
  name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  alerts: z.boolean().default(true),
  scope: z.enum(['personal', 'family']).default('personal'),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

export function BudgetsPage() {
  const { workspace, user } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | null>(null);

  const { data: budgets, isLoading: budgetsLoading } = useBudgets(workspaceId);
  const { data: categories } = useCategories(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: expenses } = useExpenses(workspaceId, {
    date_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  }, 1, 1000);

  const currentMember = members?.find((m) => m.profile_id === user?.id);
  const isAdminOrOwner = workspace?.owner_id === user?.id || currentMember?.member_role === 'admin';

  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      amount: undefined,
      budget_type: 'monthly',
      category_id: '',
      name: '',
      notes: '',
      alerts: true,
      scope: 'personal',
    },
  });

  const handleOpenAddModal = () => {
    setEditingBudget(null);
    reset({
      amount: undefined,
      category_id: '',
      budget_type: 'monthly',
      name: '',
      notes: '',
      alerts: true,
      scope: 'personal',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    reset({
      amount: budget.amount,
      category_id: budget.category_id || '',
      budget_type: budget.budget_type,
      name: budget.name || '',
      notes: budget.notes || '',
      alerts: budget.alerts !== false,
      scope: budget.scope || 'personal',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
    reset();
  };

  const handleDeleteBudget = async (id: string, budgetName: string) => {
    if (!window.confirm(`Are you sure you want to delete the budget "${budgetName}"?`)) return;
    const toastId = toast.loading("Deleting budget...");
    try {
      await deleteBudget.mutateAsync({ id, workspaceId: workspaceId! });
      toast.success("✅ Budget Deleted Successfully", {
        id: toastId,
      });
      addNotification({ type: 'success', title: 'Budget deleted', message: `Budget for ${budgetName} has been deleted.` });
    } catch (err: any) {
      toast.error("❌ Failed to delete budget", {
        id: toastId,
        description: err?.message || 'Unknown error'
      });
    }
  };

  const onSubmit = async (data: BudgetFormData) => {
    const toastId = toast.loading(editingBudget ? "Updating budget..." : "Creating budget...");
    try {
      if (editingBudget) {
        await updateBudget.mutateAsync({
          id: editingBudget.id,
          updates: {
            amount: data.amount,
            category_id: data.category_id || null,
            budget_type: data.budget_type,
            name: data.name || null,
            notes: data.notes || null,
            alerts: data.alerts,
            scope: data.scope,
          },
        });
        toast.success("✅ Budget Updated Successfully", {
          id: toastId,
          description: "Your budget limit has been updated."
        });
        addNotification({ type: 'success', title: 'Budget updated', message: 'Your budget has been updated.' });
      } else {
        if (data.category_id === 'all_categories') {
          if (categories && categories.length > 0) {
            const promises = categories
              .filter((c) => c.id)
              .map((c) =>
                createBudget.mutateAsync({
                  amount: data.amount,
                  category_id: c.id,
                  budget_type: data.budget_type,
                  workspace_id: workspaceId!,
                  currency_code: 'INR',
                  starts_on: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                  name: data.name || null,
                  notes: data.notes || null,
                  alerts: data.alerts,
                  scope: data.scope,
                })
              );
            await Promise.all(promises);
          }
          toast.success("✅ Budgets created for all categories!", {
            id: toastId,
            description: "All categories now have a budget set up."
          });
        } else {
          await createBudget.mutateAsync({
            amount: data.amount,
            category_id: data.category_id || null,
            budget_type: data.budget_type,
            workspace_id: workspaceId!,
            currency_code: 'INR',
            starts_on: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            name: data.name || null,
            notes: data.notes || null,
            alerts: data.alerts,
            scope: data.scope,
          });
          toast.success("✅ Budget Created Successfully", {
            id: toastId,
            description: "Your new budget limit has been set."
          });
        }
        addNotification({ type: 'success', title: 'Budget created', message: 'Your budget has been set up.' });
      }
      setIsModalOpen(false);
      setEditingBudget(null);
      reset();
    } catch (err: any) {
      toast.error(editingBudget ? "❌ Failed to update budget" : "❌ Failed to create budget", {
        id: toastId,
        description: err?.message || 'Unknown error'
      });
      addNotification({ type: 'error', title: 'Error', message: editingBudget ? 'Failed to update budget' : 'Failed to create budget' });
    }
  };

  const getSpentForCategory = (categoryId: string | null) => {
    if (!expenses?.data) return 0;
    return expenses.data
      .filter((e) => (categoryId ? e.category_id === categoryId : !e.category_id))
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getBudgetProgress = (budget: { amount: number; category_id: string | null }) => {
    const spent = getSpentForCategory(budget.category_id);
    const percentage = getBudgetPercentage(spent, budget.amount);
    const status = getBudgetStatus(percentage);
    return { spent, percentage, status };
  };

  const overallSpent = expenses?.data?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const overallBudget = budgets?.find((b) => !b.category_id);
  const overallCanEdit = !overallBudget || overallBudget.scope !== 'family' || isAdminOrOwner;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <TextReveal
            text="Budget Tracking"
            subtitle="Set spending limits and track your progress"
            textSize="text-2xl"
          />
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenAddModal}>
          Add Budget
        </Button>
      </div>

      {/* Overall Budget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-600" />
            Overall Monthly Spending
          </CardTitle>
          {overallBudget && (
            <div className="flex items-center gap-2">
              {overallCanEdit ? (
                <>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEditModal(overallBudget)}
                    title="Edit Budget"
                  >
                    <Edit className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-500/10"
                    onClick={() => handleDeleteBudget(overallBudget.id, overallBudget.name || 'Overall Budget')}
                    title="Delete Budget"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </>
              ) : (
                <div className="p-1.5 rounded-lg bg-foreground/5 text-foreground/40" title="Locked Family Budget (View-only)">
                  <Lock className="h-4 w-4" />
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(overallSpent)}</p>
                <p className="text-sm text-foreground/60">spent this month</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-foreground/80">
                  {overallBudget?.amount
                    ? formatCurrency(overallBudget.amount)
                    : 'No budget set'}
                </p>
                <p className="text-sm text-foreground/60">monthly budget</p>
              </div>
            </div>
            
            {overallBudget && (
              <>
                <div className="flex items-center gap-2 my-2">
                  {overallBudget.scope === 'family' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold text-purple-600 dark:text-purple-400">
                      <Users className="h-3 w-3" /> Family Budget
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                      <User className="h-3 w-3" /> Personal
                    </span>
                  )}
                  {overallBudget.alerts !== false && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                      <Bell className="h-3 w-3" /> Alerts On
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">Progress</span>
                    <span className="font-medium">
                      {getBudgetPercentage(overallSpent, overallBudget.amount || 1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-foreground/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        getBudgetStatus(getBudgetPercentage(overallSpent, overallBudget.amount || 1)) === 'danger'
                          ? 'bg-red-500'
                          : getBudgetStatus(getBudgetPercentage(overallSpent, overallBudget.amount || 1)) === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, getBudgetPercentage(overallSpent, overallBudget.amount || 1))}%` }}
                    />
                  </div>
                </div>

                {overallBudget.notes && (
                  <p className="text-xs text-foreground/50 border-t border-foreground/5 pt-3 mt-3 italic">
                    "{overallBudget.notes}"
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Budgets */}
      {budgetsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-24" />
                  <div className="h-8 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : budgets && budgets.filter((b) => b.category_id).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets
            .filter((b) => b.category_id)
            .map((budget) => {
              const progress = getBudgetProgress(budget);
              const isLocked = budget.scope === 'family' && !isAdminOrOwner;
              
              return (
                <Card key={budget.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: budget.category?.color || '#95A5A6' }}
                        >
                          <CategoryIcon iconName={budget.category?.icon || 'Circle'} className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate" title={budget.name || undefined}>
                            {budget.name || (budget.category ? (
                              budget.category.parent_id && categories
                                ? `${categories.find((p) => p.id === budget.category!.parent_id)?.name || ''} › ${budget.category.name}`
                                : budget.category.name
                            ) : 'Category')}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-foreground/50 capitalize font-medium">{budget.budget_type}</span>
                            {budget.name && budget.category && (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-foreground/25 inline-block" />
                                <span className="text-[10px] text-foreground/50 truncate max-w-[100px]">{budget.category.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isLocked ? (
                          <div className="p-1.5 rounded-lg bg-foreground/5 text-foreground/40" title="Locked Family Budget (View-only)">
                            <Lock className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              className="text-foreground/50 hover:text-foreground"
                              onClick={() => handleOpenEditModal(budget)}
                              title="Edit Budget"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </IconButton>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteBudget(budget.id, budget.name || budget.category?.name || 'Category budget')}
                              title="Delete Budget"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      {budget.scope === 'family' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold text-purple-600 dark:text-purple-400">
                          <Users className="h-3 w-3" /> Family Budget
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                          <User className="h-3 w-3" /> Personal
                        </span>
                      )}
                      {budget.alerts !== false && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-600 dark:text-blue-400">
                          <Bell className="h-3 w-3" /> Alerts On
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground/60">Spent</span>
                        <span className="font-medium">{formatCurrency(progress.spent)}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground/60">{progress.percentage}% of budget</span>
                          <span className="text-foreground/60">{formatCurrency(budget.amount)}</span>
                        </div>
                        <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              progress.status === 'danger'
                                ? 'bg-red-500'
                                : progress.status === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, progress.percentage)}%` }}
                          />
                        </div>
                      </div>

                      {progress.percentage >= 80 && (
                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 px-3 py-2 rounded-lg">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            {progress.percentage >= 100
                              ? 'Budget exceeded!'
                              : 'Approaching budget limit'}
                          </span>
                        </div>
                      )}

                      {budget.notes && (
                        <p className="text-xs text-foreground/50 border-t border-foreground/5 pt-3 mt-3 italic line-clamp-2" title={budget.notes}>
                          "{budget.notes}"
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-foreground/30 mb-4" />
            <p className="text-foreground/60">No category budgets set</p>
            <p className="text-sm text-foreground/50 mt-1">
              Set category-specific budgets to track spending more effectively
            </p>
            <Button variant="ghost" className="mt-4" onClick={handleOpenAddModal}>
              Add Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Budget Form Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingBudget ? "Edit Budget" : "Add Budget"} 
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Budget Amount *"
            type="number"
            step="0.01"
            placeholder="e.g., 10000"
            leftIcon={<span className="text-foreground/45">₹</span>}
            error={errors.amount?.message}
            {...register('amount', { valueAsNumber: true })}
          />

          <Select
            label="Category"
            options={[
              { value: '', label: 'All categories (overall budget)' },
              ...(!editingBudget ? [{ value: 'all_categories', label: '★ All Categories (Individual budgets)' }] : []),
              ...(categories?.filter((c) => c.id).map((c) => {
                const parent = c.parent_id ? categories.find((p) => p.id === c.parent_id) : null;
                const label = parent ? `${parent.name} › ${c.name}` : c.name;
                return { value: c.id, label };
              }) || [])
            ]}
            error={errors.category_id?.message}
            {...register('category_id')}
          />

          <Select
            label="Period *"
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
            error={errors.budget_type?.message}
            {...register('budget_type')}
          />

          <Input
            label="Budget Name (Optional)"
            placeholder="e.g., Summer Shopping, Family Grocery Plan"
            error={errors.name?.message}
            {...register('name')}
          />

          <Select
            label="Scope"
            disabled={!isAdminOrOwner}
            options={[
              { value: 'personal', label: 'Personal Budget' },
              { value: 'family', label: 'Family Budget (Shared)' },
            ]}
            error={errors.scope?.message}
            {...register('scope')}
          />
          {!isAdminOrOwner && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Family budgets can only be managed by Family Head/Admin.
            </p>
          )}

          <Textarea
            label="Notes (Optional)"
            placeholder="Add extra details, instructions, or notes..."
            error={errors.notes?.message}
            {...register('notes')}
          />

          <div className="pt-2">
            <Checkbox
              label="Enable automatic notifications & alerts (at 50%, 80%, and 100% threshold)"
              error={errors.alerts?.message}
              {...register('alerts')}
            />
          </div>

          <div className="flex items-center gap-3 pt-4 justify-end">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingBudget ? "Save Changes" : "Create Budget"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
