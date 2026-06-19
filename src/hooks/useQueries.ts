import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Expense, Category, Family, FamilyMember, Budget, Notification } from '@/types';
export function useCategories(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: async () => {
      console.log('[useCategories] Workspace ID used in query:', workspaceId);
      if (!workspaceId) {
        console.log('[useCategories] No workspaceId — skipping fetch.');
        return [];
      }
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true });
      
      console.log('[useCategories] Row count returned:', data?.length ?? 'null');
      console.log('[useCategories] First row workspace_id:', data?.[0]?.workspace_id ?? 'n/a');
      console.log('[useCategories] Error:', error);

      if (error) {
        console.error("[useCategories] Error querying categories:");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        throw error;
      }
      return data as Category[];
    },
    enabled: !!workspaceId,
    staleTime: 0,           // never serve stale data — always re-fetch when workspaceId changes
    refetchOnMount: 'always', // re-fetch even if cache has data — catches stale [] from wrong workspaceId
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
      if (error) {
        console.error("useCreateCategory: Error inserting category:");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        throw error;
      }
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
      if (error) {
        console.error("useUpdateCategory: Error updating category:");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        throw error;
      }
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
      if (error) {
        console.error("useDeleteCategory: Error deleting category:");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        throw error;
      }
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
    amount_min?: number;
    amount_max?: number;
    search?: string;
    expense_scope?: 'personal' | 'family';
    family_id?: string;
    is_recurring?: boolean;
    import_source?: 'manual' | 'csv' | 'ai';
    has_notes?: boolean;
    has_ai_categorized?: boolean;
    sort_field?: string;
    sort_dir?: 'asc' | 'desc';
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

      if (filters?.category_id) query = query.eq('category_id', filters.category_id);
      if (filters?.date_from)   query = query.gte('expense_date', filters.date_from);
      if (filters?.date_to)     query = query.lte('expense_date', filters.date_to);
      if (filters?.payment_method) query = query.eq('payment_method', filters.payment_method);
      if (filters?.amount_min != null) query = query.gte('amount', filters.amount_min);
      if (filters?.amount_max != null) query = query.lte('amount', filters.amount_max);
      if (filters?.expense_scope) query = query.eq('expense_scope', filters.expense_scope);
      if (filters?.family_id)   query = query.eq('family_id', filters.family_id);
      if (filters?.is_recurring != null) query = query.eq('is_recurring', filters.is_recurring);
      if (filters?.import_source) query = query.eq('import_source', filters.import_source);
      if (filters?.has_notes)   query = query.not('notes', 'is', null);
      if (filters?.has_ai_categorized) query = query.not('ai_category_suggestion', 'is', null);
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      const sortField = filters?.sort_field || 'expense_date';
      const sortDir   = filters?.sort_dir   || 'desc';
      const from = (page - 1) * pageSize;
      const to   = from + pageSize - 1;

      query = query.order(sortField, { ascending: sortDir === 'asc' }).range(from, to);

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
      // Import/access store values dynamically
      const { useAuthStore } = await import('@/stores/authStore');
      const { user, workspace } = useAuthStore.getState();

      let category = null;
      if (expense.category_id) {
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('id', expense.category_id)
          .maybeSingle();
        category = catData;
      }

      // Add Safe Guards
      if (!workspace?.id) {
        throw new Error("Workspace missing");
      }

      if (!category?.id) {
        throw new Error("Category missing");
      }

      if (!user?.id) {
        throw new Error("User missing");
      }

      const payload = {
        ...expense,
        user_id: user.id,
        workspace_id: workspace.id,
      };

      // Create Diagnostic Mode
      console.log("Diagnostic Mode Info:", {
        workspace,
        category,
        user,
        payload
      });

      // Verify Expense Insert Payload Log
      console.log("Expense Payload:", {
        workspace_id: payload.workspace_id,
        category_id: payload.category_id,
        created_by: user.id,
        amount: payload.amount,
        title: payload.title,
        description: payload.notes || null,
        payment_method: payload.payment_method,
        expense_date: payload.expense_date
      });

      const { data, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .single();

      if (error) {
        // Verify Database Response
        console.error("useCreateExpense Error Code:", error.code);
        console.error("useCreateExpense Error Message:", error.message);
        console.error("useCreateExpense Error Details:", error.details);
        console.error("useCreateExpense Error Hint:", error.hint);
        throw error;
      }
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
      // Import/access store values dynamically
      const { useAuthStore } = await import('@/stores/authStore');
      const { user, workspace } = useAuthStore.getState();

      let category = null;
      if (updates.category_id) {
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('id', updates.category_id)
          .maybeSingle();
        category = catData;
      }

      // Add Safe Guards
      if (!workspace?.id) {
        throw new Error("Workspace missing");
      }

      if (!category?.id) {
        throw new Error("Category missing");
      }

      if (!user?.id) {
        throw new Error("User missing");
      }

      const payload = {
        ...updates,
        user_id: user.id,
        workspace_id: workspace.id,
      };

      // Create Diagnostic Mode
      console.log("Diagnostic Mode Info (Update):", {
        workspace,
        category,
        user,
        payload
      });

      // Verify Expense Update Payload Log
      console.log("Expense Payload (Update):", {
        workspace_id: payload.workspace_id,
        category_id: payload.category_id,
        created_by: user.id,
        amount: payload.amount,
        title: payload.title,
        description: payload.notes || null,
        payment_method: payload.payment_method,
        expense_date: payload.expense_date
      });

      const { data, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Verify Database Response
        console.error("useUpdateExpense Error Code:", error.code);
        console.error("useUpdateExpense Error Message:", error.message);
        console.error("useUpdateExpense Error Details:", error.details);
        console.error("useUpdateExpense Error Hint:", error.hint);
        throw error;
      }
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
      queryClient.invalidateQueries({ queryKey: ['trash', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    },
  });
}

export function useTrashedExpenses(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['trash', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category:categories(*)')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!workspaceId,
  });
}

export function useRestoreExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', id);
      if (error) throw error;
      return { workspaceId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', result.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['trash', result.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    },
  });
}

export function usePermanentDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { workspaceId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trash', result.workspaceId] });
    },
  });
}

export function useBulkRestore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, workspaceId }: { ids: string[]; workspaceId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ is_deleted: false, deleted_at: null })
        .in('id', ids);
      if (error) throw error;
      return { workspaceId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', result.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['trash', result.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    },
  });
}

export function useBulkPermanentDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, workspaceId }: { ids: string[]; workspaceId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', ids);
      if (error) throw error;
      return { workspaceId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trash', result.workspaceId] });
    },
  });
}

export function useCheckDuplicateExpense(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: async ({
      title, amount, expense_date, category_id,
    }: { title: string; amount: number; expense_date: string; category_id?: string | null }) => {
      if (!workspaceId) return null;
      let query = supabase
        .from('expenses')
        .select('*, category:categories(*)')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .eq('amount', amount)
        .eq('expense_date', expense_date)
        .ilike('title', title.trim());
      if (category_id) query = query.eq('category_id', category_id);
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      return data as Expense | null;
    },
  });
}

export function useImportExpenses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rows, workspaceId, userId,
    }: { rows: Partial<Expense>[]; workspaceId: string; userId: string }) => {
      const batchId = crypto.randomUUID();
      const BATCH_SIZE = 50;
      const results = { imported: 0, failed: 0, failedRows: [] as Partial<Expense>[] };

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
          ...r,
          workspace_id: workspaceId,
          user_id: userId,
          import_source: 'csv' as const,
          import_batch_id: batchId,
        }));
        const { error } = await supabase.from('expenses').insert(batch);
        if (error) {
          results.failed += batch.length;
          results.failedRows.push(...batch);
        } else {
          results.imported += batch.length;
        }
      }
      return { ...results, batchId };
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
