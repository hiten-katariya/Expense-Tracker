import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Expense, Category, Family, FamilyMember, Budget, Notification, WorkspaceMember } from '@/types';
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

      if (data && category.workspace_id) {
        const { useAuthStore } = await import('@/stores/authStore');
        const { user } = useAuthStore.getState();
        if (user?.id) {
          await createNotification({
            workspaceId: category.workspace_id,
            actorId: user.id,
            type: 'summary',
            title: 'Category Created',
            message: 'New category added.',
            entityType: 'category',
            entityId: data.id,
          });
        }
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

      if (data) {
        const { useAuthStore } = await import('@/stores/authStore');
        const { user } = useAuthStore.getState();
        if (user?.id) {
          await createNotification({
            workspaceId: data.workspace_id,
            actorId: user.id,
            type: 'summary',
            title: 'Category Updated',
            message: 'Category modified successfully.',
            entityType: 'category',
            entityId: data.id,
          });
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories', data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
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

      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      if (user?.id) {
        await createNotification({
          workspaceId,
          actorId: user.id,
          type: 'summary',
          title: 'Category Deleted',
          message: 'Category removed.',
          entityType: 'category',
          entityId: id,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
        .eq('expense_scope', filters?.expense_scope || 'personal')
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
    staleTime: 0,
  });
}

async function createNotification({
  workspaceId,
  actorId,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  scope = 'personal',
  familyId = null,
}: {
  workspaceId?: string | null;
  actorId: string;
  type: 'budget' | 'anomaly' | 'summary' | 'reminder' | 'verification' | 'family_invite';
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  scope?: 'personal' | 'family';
  familyId?: string | null;
}) {
  try {
    let memberIds: string[] = [actorId];
    if (scope === 'family' && familyId) {
      const { data: members, error } = await supabase
        .from('family_members')
        .select('profile_id')
        .eq('family_id', familyId);

      if (!error && members && members.length > 0) {
        memberIds = members.map((m) => m.profile_id);
      }
    } else if (workspaceId) {
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select('profile_id')
        .eq('workspace_id', workspaceId);

      if (!error && members && members.length > 0) {
        memberIds = members.map((m) => m.profile_id);
      }
    }

    const notificationsToInsert = memberIds.map((profileId) => ({
      workspace_id: workspaceId || null,
      user_id: profileId,
      type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      is_read: false,
      scope,
      family_id: familyId,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notificationsToInsert);

    if (insertError) throw insertError;
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
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
      if (expense.expense_scope !== 'family' && !workspace?.id) {
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
        workspace_id: expense.expense_scope === 'family' ? null : (expense.workspace_id || workspace!.id),
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

      if (data) {
        await createNotification({
          workspaceId: payload.workspace_id,
          actorId: user.id,
          type: 'reminder',
          title: 'Expense Added',
          message: 'A new expense has been recorded.',
          entityType: 'expense',
          entityId: data.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
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
      if (updates.expense_scope !== 'family' && !workspace?.id) {
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
        workspace_id: updates.expense_scope === 'family' ? null : (updates.workspace_id || workspace!.id),
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

      if (data) {
        await createNotification({
          workspaceId: payload.workspace_id,
          actorId: user.id,
          type: 'reminder',
          title: 'Expense Updated',
          message: 'Expense details were modified.',
          entityType: 'expense',
          entityId: data.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string | null }) => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const actorId = user?.id || '';

      const { data: expense } = await supabase
        .from('expenses')
        .select('title, amount')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase
        .from('expenses')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      if (expense && actorId) {
        await createNotification({
          workspaceId,
          actorId,
          type: 'anomaly',
          title: 'Expense Deleted',
          message: 'Expense moved to trash.',
          entityType: 'expense',
          entityId: id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
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
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string | null }) => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const actorId = user?.id || '';

      const { data: expense } = await supabase
        .from('expenses')
        .select('title, amount')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase
        .from('expenses')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', id);
      if (error) throw error;

      if (expense && actorId) {
        await createNotification({
          workspaceId,
          actorId,
          type: 'verification',
          title: 'Expense Restored',
          message: 'Expense restored successfully.',
          entityType: 'expense',
          entityId: id,
        });
      }

      return { workspaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function usePermanentDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string | null }) => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const actorId = user?.id || '';

      const { data: expense } = await supabase
        .from('expenses')
        .select('title, amount')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;

      if (expense && actorId) {
        await createNotification({
          workspaceId,
          actorId,
          type: 'anomaly',
          title: 'Expense Deleted',
          message: 'Expense permanently deleted.',
          entityType: 'expense',
          entityId: id,
        });
      }

      return { workspaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useBulkRestore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, workspaceId }: { ids: string[]; workspaceId: string }) => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const actorId = user?.id || '';

      const { error } = await supabase
        .from('expenses')
        .update({ is_deleted: false, deleted_at: null })
        .in('id', ids);
      if (error) throw error;

      if (actorId) {
        await createNotification({
          workspaceId,
          actorId,
          type: 'verification',
          title: 'Expense Restored',
          message: 'Expense restored successfully.',
        });
      }

      return { workspaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useBulkPermanentDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, workspaceId }: { ids: string[]; workspaceId: string }) => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const actorId = user?.id || '';

      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', ids);
      if (error) throw error;

      if (actorId) {
        await createNotification({
          workspaceId,
          actorId,
          type: 'anomaly',
          title: 'Expense Deleted',
          message: 'Expense permanently deleted.',
        });
      }

      return { workspaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
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
        .eq('expense_scope', 'personal')
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
          expense_scope: 'personal' as const,
        }));
        const { error } = await supabase.from('expenses').insert(batch);
        if (error) {
          results.failed += batch.length;
          results.failedRows.push(...batch);
        } else {
          results.imported += batch.length;
        }
      }

      if (results.imported > 0) {
        await createNotification({
          workspaceId,
          actorId: userId,
          type: 'summary',
          title: 'Expenses Imported',
          message: `Successfully imported ${results.imported} expenses via CSV.`,
        });
      }

      return { ...results, batchId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useMonthlySummary(
  workspaceId: string | undefined,
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth()
) {
  return useQuery({
    queryKey: ['monthly-summary', workspaceId, year, month],
    queryFn: async () => {
      if (!workspaceId) return null;

      const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*, category:categories(*)')
        .eq('workspace_id', workspaceId)
        .eq('expense_scope', 'personal')
        .eq('is_deleted', false)
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo);

      if (error) throw error;
      if (!expenses) return null;

      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysPassed = new Date().getMonth() === month && new Date().getFullYear() === year
        ? new Date().getDate()
        : daysInMonth;
      const dailyAverage = totalSpent / (daysPassed || 1);
      const projectedTotal = dailyAverage * daysInMonth;

      const categoryMap = new Map<string, { total: number; count: number; category: Category | null }>();
      expenses.forEach((expense) => {
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
        percentage: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
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
    enabled: !!workspaceId,
    staleTime: 0,
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
      const { familiesApi } = await import('@/api/families');
      const response = await familiesApi.createFamily({
        name: family.name || '',
        monthly_budget: family.monthly_budget,
        currency_code: family.currency_code,
      });
      const data = response.data;

      if (data && family.owner_id) {
        await createNotification({
          workspaceId: null,
          actorId: family.owner_id,
          type: 'family_invite',
          title: 'Family Created',
          message: 'Family workspace created.',
          entityType: 'family',
          entityId: data.id,
        });

        // Insert overall budget directly into the budgets table
        if (family.monthly_budget) {
          const { error: budgetError } = await supabase
            .from('budgets')
            .insert({
              amount: family.monthly_budget,
              category_id: null,
              budget_type: 'monthly',
              workspace_id: null,
              family_id: data.id,
              scope: 'family',
              created_by: family.owner_id,
              name: 'Overall Family Budget',
              notes: 'Configured during family creation',
              alerts: true
            });
          if (budgetError) {
            console.error("Error creating initial family overall budget:", budgetError);
          }
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['families', variables.owner_id] });
      queryClient.invalidateQueries({ queryKey: ['family-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Family> }) => {
      const { data, error } = await supabase
        .from('families')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['family-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useDeleteFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('families')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['family-invites'] });
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

export function useFamilyInvites(familyId: string | undefined) {
  return useQuery({
    queryKey: ['family-invites', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const { data, error } = await supabase
        .from('family_invites')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!familyId,
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { familiesApi } = await import('@/api/families');
      const response = await familiesApi.acceptInvite(token);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { familiesApi } = await import('@/api/families');
      const response = await familiesApi.declineInvite(token);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useLeaveFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (familyId: string) => {
      const { familiesApi } = await import('@/api/families');
      const response = await familiesApi.leaveFamily(familyId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRemoveFamilyMember(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { familiesApi } = await import('@/api/families');
      const response = await familiesApi.removeMember(familyId, memberId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members', familyId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useTransferOwnership(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newOwnerId: string) => {
      const { data, error } = await supabase.rpc('transfer_family_ownership', {
        p_family_id: familyId,
        p_new_owner_id: newOwnerId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
      queryClient.invalidateQueries({ queryKey: ['family-members', familyId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useFamilyBudgets(familyId: string | undefined) {
  return useQuery({
    queryKey: ['family-budgets', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('family_id', familyId);
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!familyId,
  });
}

export function useFamilyActivityLogs(familyId: string | undefined) {
  return useQuery({
    queryKey: ['family-activity-logs', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const { data, error } = await supabase
        .from('family_activity_logs')
        .select('*, actor:profiles(*)')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!familyId,
  });
}

export function useFamilyExpenses(
  familyId: string | undefined,
  filters?: {
    category_id?: string;
    date_from?: string;
    date_to?: string;
    payment_method?: string;
    amount_min?: number;
    amount_max?: number;
    search?: string;
    sort_field?: string;
    sort_dir?: 'asc' | 'desc';
  },
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: ['family-expenses', familyId, filters, page, pageSize],
    queryFn: async () => {
      if (!familyId) return { data: [], count: 0 };

      let query = supabase
        .from('expenses')
        .select('*, category:categories(*), profile:profiles!user_id(*)', { count: 'exact' })
        .eq('family_id', familyId)
        .eq('expense_scope', 'family')
        .eq('is_deleted', false);

      if (filters?.category_id) query = query.eq('category_id', filters.category_id);
      if (filters?.date_from)   query = query.gte('expense_date', filters.date_from);
      if (filters?.date_to)     query = query.lte('expense_date', filters.date_to);
      if (filters?.payment_method) query = query.eq('payment_method', filters.payment_method);
      if (filters?.amount_min != null) query = query.gte('amount', filters.amount_min);
      if (filters?.amount_max != null) query = query.lte('amount', filters.amount_max);
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
    enabled: !!familyId,
    staleTime: 0,
  });
}



export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, profile:profiles(*)')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data as WorkspaceMember[];
    },
    enabled: !!workspaceId,
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
        .eq('workspace_id', workspaceId)
        .eq('scope', 'personal');
      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!workspaceId,
    staleTime: 0,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budget: Partial<Budget>) => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const userId = user?.id;

      const payload = {
        ...budget,
        created_by: budget.created_by || userId || null,
      };

      const { data, error } = await supabase
        .from('budgets')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      if (data && userId) {
        await createNotification({
          workspaceId: data.workspace_id,
          actorId: userId,
          type: 'budget',
          title: 'Budget Created',
          message: 'New budget created successfully.',
          entityType: 'budget',
          entityId: data.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['family-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Budget> }) => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const userId = user?.id;

      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      if (data && userId) {
        await createNotification({
          workspaceId: data.workspace_id,
          actorId: userId,
          type: 'budget',
          title: 'Budget Updated',
          message: 'Budget updated successfully.',
          entityType: 'budget',
          entityId: data.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['family-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { user } = useAuthStore.getState();
      const userId = user?.id;

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);
      if (error) throw error;

      if (userId) {
        await createNotification({
          workspaceId,
          actorId: userId,
          type: 'budget',
          title: 'Budget Deleted',
          message: 'Budget removed successfully.',
          entityType: 'budget',
          entityId: id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['family-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useNotifications(userId: string | undefined, scope: 'personal' | 'family' = 'personal') {
  return useQuery({
    queryKey: ['notifications', userId, scope],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (scope === 'personal') {
        query = query.or('scope.eq.personal,type.eq.family_invite');
      } else {
        query = query.eq('scope', 'family');
      }

      const { data, error } = await query;
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
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
    },
  });
}

export function useBulkDeleteNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[]; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
    },
  });
}

export function useFamilyTrashedExpenses(familyId: string | undefined) {
  return useQuery({
    queryKey: ['family-trash', familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const { data, error } = await supabase
        .from('family_deleted_expenses')
        .select('*, category:categories(*)')
        .eq('family_id', familyId)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!familyId,
  });
}

export function useRestoreFamilyExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.rpc('restore_family_expense', {
        p_expense_id: id
      });
      if (error) throw error;
      return { id, familyId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['family-expenses', variables.familyId] });
      queryClient.invalidateQueries({ queryKey: ['family-trash', variables.familyId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function usePermanentDeleteFamilyExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.rpc('permanent_delete_family_expense', {
        p_expense_id: id
      });
      if (error) throw error;
      return { id, familyId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['family-trash', variables.familyId] });
    },
  });
}

export function useJoinFamilyByCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { familiesApi } = await import('@/api/families');
      const response = await familiesApi.joinFamilyByCode({ inviteCode });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
