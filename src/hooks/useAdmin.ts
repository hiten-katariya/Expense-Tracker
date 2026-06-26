import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

export function useAdminStats() {
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: adminApi.getStats, staleTime: 30_000 });
}

export function useAdminUsers(params?: Parameters<typeof adminApi.getUsers>[0]) {
  return useQuery({ queryKey: ['admin', 'users', params], queryFn: () => adminApi.getUsers(params), staleTime: 30_000 });
}

export function useAdminUserDetail(id: string | undefined) {
  return useQuery({ queryKey: ['admin', 'user', id], queryFn: () => adminApi.getUserDetail(id!), enabled: !!id, staleTime: 30_000 });
}

export function useAdminExpenses(params?: Parameters<typeof adminApi.getExpenses>[0]) {
  return useQuery({ queryKey: ['admin', 'expenses', params], queryFn: () => adminApi.getExpenses(params), staleTime: 30_000 });
}

export function useAdminBudgets(params?: Parameters<typeof adminApi.getBudgets>[0]) {
  return useQuery({ queryKey: ['admin', 'budgets', params], queryFn: () => adminApi.getBudgets(params), staleTime: 30_000 });
}

export function useAdminFamilies(params?: Parameters<typeof adminApi.getFamilies>[0]) {
  return useQuery({ queryKey: ['admin', 'families', params], queryFn: () => adminApi.getFamilies(params), staleTime: 30_000 });
}

export function useAdminWorkspaces(params?: Parameters<typeof adminApi.getWorkspaces>[0]) {
  return useQuery({ queryKey: ['admin', 'workspaces', params], queryFn: () => adminApi.getWorkspaces(params), staleTime: 30_000 });
}

export function useAdminAIUsage(params?: Parameters<typeof adminApi.getAIUsage>[0]) {
  return useQuery({ queryKey: ['admin', 'ai-usage', params], queryFn: () => adminApi.getAIUsage(params), staleTime: 30_000 });
}

export function useAdminOCRUsage(params?: Parameters<typeof adminApi.getOCRUsage>[0]) {
  return useQuery({ queryKey: ['admin', 'ocr-usage', params], queryFn: () => adminApi.getOCRUsage(params), staleTime: 30_000 });
}

export function useAdminEmailLogs(params?: Parameters<typeof adminApi.getEmailLogs>[0]) {
  return useQuery({ queryKey: ['admin', 'email-logs', params], queryFn: () => adminApi.getEmailLogs(params), staleTime: 30_000 });
}

export function useAdminNotifications(params?: Parameters<typeof adminApi.getNotifications>[0]) {
  return useQuery({ queryKey: ['admin', 'notifications', params], queryFn: () => adminApi.getNotifications(params), staleTime: 30_000 });
}

export function useAdminAuditLogs(params?: Parameters<typeof adminApi.getAuditLogs>[0]) {
  return useQuery({ queryKey: ['admin', 'audit-logs', params], queryFn: () => adminApi.getAuditLogs(params), staleTime: 30_000 });
}

export function useAdminAnalytics(params?: Parameters<typeof adminApi.getAnalytics>[0]) {
  return useQuery({ queryKey: ['admin', 'analytics', params], queryFn: () => adminApi.getAnalytics(params), staleTime: 60_000 });
}

export function useAdminSystemHealth() {
  return useQuery({ queryKey: ['admin', 'system-health'], queryFn: adminApi.getSystemHealth, staleTime: 15_000, refetchInterval: 30_000 });
}
