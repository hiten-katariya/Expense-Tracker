import { apiClient } from './client';
import { ApiResponse, Notification } from '@/types/api';

export const notificationsApi = {
  getNotifications: async (): Promise<ApiResponse<Notification[]>> => {
    const response = await apiClient.get('/notifications');
    return response.data;
  },

  markAsRead: async (id: string): Promise<ApiResponse<Notification>> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  },
};
