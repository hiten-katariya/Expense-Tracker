import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useBudgets, useCategories, useCreateBudget, useExpenses } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { formatCurrency, getBudgetPercentage, getBudgetStatus } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CategoryIcon } from './Categories';
import { Plus, Target, TriangleAlert as AlertTriangle } from 'lucide-react';

const budgetSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().optional().nullable(),
  budget_type: z.enum(['monthly', 'yearly']),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

export function BudgetsPage() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { data: budgets, isLoading: budgetsLoading } = useBudgets(workspaceId);
  const { data: categories } = useCategories(workspaceId);
  const { data: expenses } = useExpenses(workspaceId, {
    date_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  }, 1, 1000);

  const createBudget = useCreateBudget();

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
    },
  });

  const onSubmit = async (data: BudgetFormData) => {
    try {
      await createBudget.mutateAsync({
        amount: data.amount,
        category_id: data.category_id || null,
        budget_type: data.budget_type,
        workspace_id: workspaceId!,
        currency_code: 'INR',
        starts_on: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      });
      addNotification({ type: 'success', title: 'Budget created', message: 'Your budget has been set up.' });
      setIsModalOpen(false);
      reset();
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to create budget' });
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
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
          Add Budget
        </Button>
      </div>

      {/* Overall Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-600" />
            Overall Monthly Spending
          </CardTitle>
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
                  {budgets?.find((b) => !b.category_id)?.amount
                    ? formatCurrency(budgets.find((b) => !b.category_id)?.amount || 0)
                    : 'No budget set'}
                </p>
                <p className="text-sm text-foreground/60">monthly budget</p>
              </div>
            </div>
            {budgets?.find((b) => !b.category_id) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60">Progress</span>
                  <span className="font-medium">
                    {getBudgetPercentage(overallSpent, budgets.find((b) => !b.category_id)?.amount || 1)}%
                  </span>
                </div>
                <div className="h-3 w-full bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      getBudgetStatus(getBudgetPercentage(overallSpent, budgets.find((b) => !b.category_id)?.amount || 1)) === 'danger'
                        ? 'bg-red-500'
                        : getBudgetStatus(getBudgetPercentage(overallSpent, budgets.find((b) => !b.category_id)?.amount || 1)) === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, getBudgetPercentage(overallSpent, budgets.find((b) => !b.category_id)?.amount || 1))}%` }}
                  />
                </div>
              </div>
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
              return (
                <Card key={budget.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: budget.category?.color || '#95A5A6' }}
                      >
                        <CategoryIcon iconName={budget.category?.icon || 'Circle'} className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {budget.category ? (
                            budget.category.parent_id && categories
                              ? `${categories.find((p) => p.id === budget.category!.parent_id)?.name || ''} › ${budget.category.name}`
                              : budget.category.name
                          ) : 'Category'}
                        </h3>
                        <p className="text-xs text-foreground/60 capitalize">{budget.budget_type} budget</p>
                      </div>
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
            <Button variant="ghost" className="mt-4" onClick={() => setIsModalOpen(true)}>
              Add Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Budget Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Budget" size="md">
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
            label="Category (leave empty for overall budget)"
            options={categories?.filter((c) => c.id).map((c) => {
              const parent = c.parent_id ? categories.find((p) => p.id === c.parent_id) : null;
              const label = parent ? `${parent.name} › ${c.name}` : c.name;
              return { value: c.id, label };
            }) || []}
            placeholder="All categories (overall budget)"
            {...register('category_id')}
          />

          <div className="flex items-center gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
