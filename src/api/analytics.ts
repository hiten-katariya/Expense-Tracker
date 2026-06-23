import { apiClient } from './client';
import { ApiResponse } from '@/types/api';

export const analyticsApi = {
  getMonthlySummary: async (params?: { month?: string; year?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/analytics/monthly-summary', { params });
    return response.data;
  },

  getCategoryBreakdown: async (params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/analytics/category-breakdown', { params });
    return response.data;
  },

  getTrends: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/analytics/trends');
    return response.data;
  },

  getHeatmap: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/analytics/heatmap');
    return response.data;
  },
};
