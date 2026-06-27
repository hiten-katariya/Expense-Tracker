import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AIChatMessage } from '@/types';

export function useAIChat(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Query past message logs from the database
  const historyQuery = useQuery({
    queryKey: ['ai-chat-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data as AIChatMessage[];
    },
    enabled: !!userId,
  });

  // Mutate message submission
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: {
      message: string;
      history: AIChatMessage[];
    }) => {
      if (!userId) throw new Error('User not logged in');
      const API = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: payload.message, history: payload.history }),
      });

      if (!response.ok) throw new Error('AI chatbot error');
      const data = await response.json();
      return data.response as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-chat-history', userId] });
    },
  });

  return {
    messages: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    send: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
