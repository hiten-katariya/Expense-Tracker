import { apiClient } from './client';

// Admin API — all read-only GET requests

export const adminApi = {
  getStats: () => apiClient.get('/admin/stats').then(r => r.data),

  getUsers: (params?: { page?: number; limit?: number; search?: string; country?: string; dateFrom?: string; dateTo?: string }) =>
    apiClient.get('/admin/users', { params }).then(r => r.data),

  getUserDetail: (id: string) => apiClient.get(`/admin/users/${id}`).then(r => r.data),

  getExpenses: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/expenses', { params }).then(r => r.data),

  getBudgets: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/budgets', { params }).then(r => r.data),

  getFamilies: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/families', { params }).then(r => r.data),

  getWorkspaces: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/workspaces', { params }).then(r => r.data),

  getAIUsage: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/ai-usage', { params }).then(r => r.data),

  getOCRUsage: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/ocr-usage', { params }).then(r => r.data),

  getEmailLogs: (params?: { page?: number; limit?: number; status?: string; template?: string }) =>
    apiClient.get('/admin/email-logs', { params }).then(r => r.data),

  getNotifications: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/notifications', { params }).then(r => r.data),

  getAuditLogs: (params?: { page?: number; limit?: number; eventType?: string; userId?: string }) =>
    apiClient.get('/admin/audit-logs', { params }).then(r => r.data),

  getAnalytics: (params?: { days?: number }) =>
    apiClient.get('/admin/analytics', { params }).then(r => r.data),

  getSystemHealth: () => apiClient.get('/admin/system-health').then(r => r.data),
};
