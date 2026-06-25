import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Expense } from '@/types';

export function useDuplicateDetection() {
  const detectMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      amount: number;
      date: string;
      merchant: string;
      title: string;
    }): Promise<Expense | null> => {
      // Query active expenses for this user that have exact matching amount and date
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category:categories(name)')
        .eq('user_id', payload.userId)
        .eq('amount', payload.amount)
        .eq('expense_date', payload.date)
        .eq('is_deleted', false);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Fuzzy check: matches title or notes to flag potential duplicates
      const match = data.find((e) => {
        const tSearch = payload.title.toLowerCase().trim();
        const mSearch = payload.merchant.toLowerCase().trim();
        const eTitle = e.title.toLowerCase().trim();
        const eNotes = (e.notes || '').toLowerCase().trim();

        const titleMatch = eTitle.includes(tSearch) || tSearch.includes(eTitle);
        const merchantMatch = eTitle.includes(mSearch) || eNotes.includes(mSearch) || mSearch.includes(eTitle);

        return titleMatch || merchantMatch;
      });

      return (match as Expense) || null;
    },
  });

  return {
    detect: detectMutation.mutateAsync,
    isChecking: detectMutation.isPending,
    duplicateMatch: detectMutation.data || null,
  };
}
