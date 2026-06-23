import { apiClient } from './client';
import { ApiResponse, PaginatedResponse, Expense, PaginationParams } from '@/types/api';

export const expensesApi = {
  getExpenses: async (params?: PaginationParams & { categoryId?: string; startDate?: string; endDate?: string }): Promise<PaginatedResponse<Expense>> => {
    const response = await apiClient.get('/expenses', { params });
    return response.data;
  },

  getExpenseById: async (id: string): Promise<ApiResponse<Expense>> => {
    const response = await apiClient.get(`/expenses/${id}`);
    return response.data;
  },

  createExpense: async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Expense>> => {
    const response = await apiClient.post('/expenses', data);
    return response.data;
  },

  updateExpense: async (id: string, data: Partial<Expense>): Promise<ApiResponse<Expense>> => {
    const response = await apiClient.patch(`/expenses/${id}`, data);
    return response.data;
  },

  deleteExpense: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/expenses/${id}`);
    return response.data;
  },

  bulkImport: async (file: File): Promise<ApiResponse<{ imported: number; failed: number }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/expenses/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  restoreExpense: async (id: string): Promise<ApiResponse<Expense>> => {
    const response = await apiClient.post(`/expenses/restore/${id}`);
    return response.data;
  },
};
