import { apiClient } from './client';
import { ApiResponse } from '@/types/api';

export const reportsApi = {
  exportReport: async (params?: { format?: 'csv' | 'pdf'; startDate?: string; endDate?: string }): Promise<Blob> => {
    const response = await apiClient.get('/reports/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getMonthlyInsights: async (params?: { month?: string; year?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/insights/monthly', { params });
    return response.data;
  },
};
