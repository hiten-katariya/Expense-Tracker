import { useMutation } from '@tanstack/react-query';

interface PredictionPayload {
  userId: string;
  merchant: string;
  title: string;
  notes: string | null;
  amount: number;
  categories: Array<{ id: string; name: string }>;
}

interface PredictionResult {
  predicted_category_id: string | null;
  confidence: number;
  reasoning: string;
}

export function useExpensePrediction() {
  const predictMutation = useMutation({
    mutationFn: async (payload: PredictionPayload): Promise<PredictionResult> => {
      const API = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API}/api/ai/predict-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Expense category prediction failed');
      }

      return response.json();
    },
  });

  return {
    predict: predictMutation.mutateAsync,
    isPredicting: predictMutation.isPending,
    predictedCategoryId: predictMutation.data?.predicted_category_id || null,
    confidence: predictMutation.data?.confidence || null,
    reasoning: predictMutation.data?.reasoning || null,
  };
}
