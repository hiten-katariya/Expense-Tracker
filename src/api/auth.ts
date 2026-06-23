import { apiClient } from './client';
import { ApiResponse, User } from '@/types/api';

export const authApi = {
  register: async (data: any): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: any): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  verifyEmail: async (token: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  refresh: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  logoutAll: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/logout-all');
    return response.data;
  },

  oauthGoogle: async (): Promise<ApiResponse<{ url: string }>> => {
    const response = await apiClient.post('/auth/oauth/google');
    return response.data;
  },

  oauthGithub: async (): Promise<ApiResponse<{ url: string }>> => {
    const response = await apiClient.post('/auth/oauth/github');
    return response.data;
  },
};
