import { useQuery } from '@tanstack/react-query';
import type { AIInsight } from '@/types';

export function useAIInsights(
  userId: string | undefined,
  month: number,
  year: number,
  workspaceId?: string | null,
  familyId?: string | null
) {
  const insightsQuery = useQuery({
    queryKey: ['ai-insights', userId, month, year, workspaceId, familyId],
    queryFn: async (): Promise<AIInsight> => {
      if (!userId) throw new Error('User not logged in');
      const API = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API}/api/ai/monthly-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, month, year, workspaceId, familyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI insights');
      }

      return response.json();
    },
    enabled: !!userId && month !== undefined && year !== undefined,
  });

  return {
    insights: insightsQuery.data || null,
    isLoading: insightsQuery.isLoading,
    error: insightsQuery.error,
    refetch: insightsQuery.refetch,
  };
}
