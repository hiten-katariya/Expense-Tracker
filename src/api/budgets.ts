import { apiClient } from './client';
import { ApiResponse, Budget } from '@/types/api';

export const budgetsApi = {
  getBudgets: async (): Promise<ApiResponse<Budget[]>> => {
    const response = await apiClient.get('/budgets');
    return response.data;
  },

  createBudget: async (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Budget>> => {
    const response = await apiClient.post('/budgets', data);
    return response.data;
  },

  updateBudget: async (id: string, data: Partial<Budget>): Promise<ApiResponse<Budget>> => {
    const response = await apiClient.patch(`/budgets/${id}`, data);
    return response.data;
  },

  deleteBudget: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/budgets/${id}`);
    return response.data;
  },

  getAlerts: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/alerts');
    return response.data;
  },
};
