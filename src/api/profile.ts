import { apiClient } from './client';
import { ApiResponse, User } from '@/types/api';

export const profileApi = {
  getMe: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get('/me');
    return response.data;
  },

  updateMe: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch('/me', data);
    return response.data;
  },

  setupMfa: async (): Promise<ApiResponse<{ secret: string; qrCode: string }>> => {
    const response = await apiClient.post('/me/mfa/setup');
    return response.data;
  },

  verifyMfa: async (code: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/me/mfa/verify', { code });
    return response.data;
  },
};
