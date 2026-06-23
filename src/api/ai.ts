import { apiClient } from './client';
import { ApiResponse } from '@/types/api';

export const aiApi = {
  categorize: async (description: string): Promise<ApiResponse<{ categoryId: string; confidence: number }>> => {
    const response = await apiClient.post('/ai/categorize', { description });
    return response.data;
  },

  scanReceipt: async (file: File): Promise<ApiResponse<{ amount: number; date: string; vendor: string; items: any[] }>> => {
    const formData = new FormData();
    formData.append('receipt', file);
    const response = await apiClient.post('/ai/scan-receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  submitFeedback: async (data: { predictionId: string; correct: boolean; actualCategoryId?: string }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/ai/feedback', data);
    return response.data;
  },

  runAnomalies: async (): Promise<ApiResponse<{ anomalies: any[] }>> => {
    const response = await apiClient.post('/ai/anomalies/run');
    return response.data;
  },
};
