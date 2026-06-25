import { useQuery } from '@tanstack/react-query';
import type { BudgetRecommendation } from '@/types';

export function useBudgetRecommendations(
  userId: string | undefined,
  workspaceId?: string | null
) {
  const recommendationsQuery = useQuery({
    queryKey: ['budget-recommendations', userId, workspaceId],
    queryFn: async (): Promise<BudgetRecommendation[]> => {
      if (!userId) return [];
      const response = await fetch('/api/ai/budget-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workspaceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch budget recommendations');
      }

      return response.json();
    },
    enabled: !!userId,
  });

  return {
    recommendations: recommendationsQuery.data || [],
    isLoading: recommendationsQuery.isLoading,
    error: recommendationsQuery.error,
    refetch: recommendationsQuery.refetch,
  };
}
