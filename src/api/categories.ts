import { apiClient } from './client';
import { ApiResponse, Category } from '@/types/api';

export const categoriesApi = {
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  createCategory: async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Category>> => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: Partial<Category>): Promise<ApiResponse<Category>> => {
    const response = await apiClient.patch(`/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/categories/${id}`);
    return response.data;
  },

  mergeCategories: async (data: { sourceId: string; targetId: string }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/categories/merge', data);
    return response.data;
  },
};
