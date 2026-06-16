import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Expense, Category, Family, FamilyMember, Budget, Notification } from '@/types';

export function useCategories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: Partial<Category>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories', variables.workspace_id] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Category> }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories', data.workspace_id] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories', variables.workspaceId] });
    },
  });
}

export function useExpenses(
  workspaceId: string | undefined,
  filters?: {
    category_id?: string;
    date_from?: string;
    date_to?: string;
    payment_method?: string;
    search?: string;
    expense_scope?: 'personal' | 'family';
    family_id?: string;
  },
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: ['expenses', workspaceId, filters, page, pageSize],
    queryFn: async () => {
      if (!workspaceId) return { data: [], count: 0 };

      let query = supabase
        .from('expenses')
        .select('*, category:categories(*), profile:profiles!user_id(*)', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.date_from) {
        query = query.gte('expense_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('expense_date', filters.date_to);
      }
      if (filters?.payment_method) {
        query = query.eq('payment_method', filters.payment_method);
      }
      if (filters?.expense_scope) {
        query = query.eq('expense_scope', filters.expense_scope);
      }
      if (filters?.family_id) {
        query = query.eq('family_id', filters.family_id);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query
        .order('expense_date', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Expense[], count: count || 0 };
    },
    enabled: !!workspaceId,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Partial<Expense>) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Expense> }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    },
  });
}

export function useMonthlySummary(
  workspaceId: string | undefined,
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth()
) {
  const { data: expenses } = useExpenses(workspaceId, {
    date_from: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    date_to: `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`,
  });

  return useQuery({
    queryKey: ['monthly-summary', workspaceId, year, month],
    queryFn: async () => {
      if (!expenses) return null;

      const totalSpent = expenses.data.reduce((sum, e) => sum + e.amount, 0);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysPassed = new Date().getMonth() === month
        ? new Date().getDate()
        : daysInMonth;
      const dailyAverage = totalSpent / daysPassed;
      const projectedTotal = dailyAverage * daysInMonth;

      const categoryMap = new Map<string, { total: number; count: number; category: Category | null }>();
      expenses.data.forEach((expense) => {
        const catId = expense.category_id || 'other';
        const existing = categoryMap.get(catId) || { total: 0, count: 0, category: expense.category || null };
        categoryMap.set(catId, {
          total: existing.total + expense.amount,
          count: existing.count + 1,
          category: expense.category || null,
        });
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([id, data]) => ({
        category_id: id,
        category_name: data.category?.name || 'Uncategorized',
        category_icon: data.category?.icon,
        category_color: data.category?.color,
        total: data.total,
        percentage: (data.total / totalSpent) * 100,
        count: data.count,
      })).sort((a, b) => b.total - a.total);

      return {
        total_spent: totalSpent,
        budget_remaining: null,
        category_breakdown: categoryBreakdown,
        daily_average: dailyAverage,
        projected_total: projectedTotal,
      };
    },
    enabled: !!expenses,
    initialData: null,
  });
}

export function useFamilies(userId: string | undefined) {
  return useQuery({
    queryKey: ['families', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('family_members')
        .select('*, family:families(*)')
        .eq('profile_id', userId);
      if (error) throw error;
      return data.map((fm) => fm.family) as Family[];
    },
    enabled: !!userId,
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (family: Partial<Family>) => {
      const { data, error } = await supabase
        .from('families')
        .insert(family)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['families', variables.owner_id] });
    },
  });
}

export function useFamilyMembers(familyId: string | undefined) {
  return useQuery({
    queryKey: ['family-members', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const { data, error } = await supabase
        .from('family_members')
        .select('*, profile:profiles(*)')
        .eq('family_id', familyId);
      if (error) throw error;
      return data as FamilyMember[];
    },
    enabled: !!familyId,
  });
}

export function useBudgets(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['budgets', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budget: Partial<Budget>) => {
      const { data, error } = await supabase
        .from('budgets')
        .insert(budget)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', variables.workspace_id] });
    },
  });
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
    },
  });
}
