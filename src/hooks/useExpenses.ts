import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '@/api/expenses';
import { Expense, PaginationParams } from '@/types/api';
import { toast } from 'sonner';

export const useExpenses = (params?: PaginationParams & { categoryId?: string; startDate?: string; endDate?: string }) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesApi.getExpenses(params),
  });

  const createMutation = useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Expense created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) => expensesApi.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Expense updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Expense deleted');
    },
  });

  return {
    expenses: query.data,
    isLoading: query.isPending,
    error: query.error,
    createExpense: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateExpense: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteExpense: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
