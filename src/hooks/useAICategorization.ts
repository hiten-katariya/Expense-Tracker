import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AICategorization } from '@/types';

const API = import.meta.env.VITE_API_URL || '';

export function useAICategorization(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Query pending AI suggestions
  const suggestionsQuery = useQuery({
    queryKey: ['ai-suggestions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('ai_categorizations')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AICategorization[];
    },
    enabled: !!userId,
  });

  // Mutate categorization request
  const categorizeMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      workspaceId?: string | null;
      familyId?: string | null;
      expenseId?: string | null;
      merchant: string;
      title: string;
      notes: string | null;
      amount: number;
      categories: Array<{ id: string; name: string }>;
    }) => {
      const response = await fetch(`${API}/api/ai/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('AI categorization request failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions', userId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  // Accept suggestion mutation
  const acceptSuggestion = useMutation({
    mutationFn: async (payload: {
      categorizationId: string | null;
      expenseId: string;
      categoryId: string;
      categoryName: string;
    }) => {
      const response = await fetch(`${API}/api/ai/accept-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Accepting suggestion failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions', userId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  // Reject suggestion mutation
  const rejectSuggestion = useMutation({
    mutationFn: async (payload: {
      categorizationId: string | null;
      expenseId: string | null;
    }) => {
      const response = await fetch(`${API}/api/ai/reject-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Rejecting suggestion failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions', userId] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  return {
    suggestions: suggestionsQuery.data || [],
    isLoading: suggestionsQuery.isLoading,
    categorize: categorizeMutation.mutateAsync,
    isCategorizing: categorizeMutation.isPending,
    accept: acceptSuggestion.mutateAsync,
    reject: rejectSuggestion.mutateAsync,
  };
}
