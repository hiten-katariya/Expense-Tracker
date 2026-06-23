import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '@/api/budgets';
import { Budget } from '@/types/api';
import { toast } from 'sonner';

export const useBudgets = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetsApi.getBudgets,
  });

  const alertsQuery = useQuery({
    queryKey: ['budgets', 'alerts'],
    queryFn: budgetsApi.getAlerts,
  });

  const createMutation = useMutation({
    mutationFn: budgetsApi.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Budget> }) => budgetsApi.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: budgetsApi.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Budget deleted');
    },
  });

  return {
    budgets: query.data?.data,
    alerts: alertsQuery.data?.data,
    isLoading: query.isPending,
    createBudget: createMutation.mutateAsync,
    updateBudget: updateMutation.mutateAsync,
    deleteBudget: deleteMutation.mutateAsync,
  };
};
