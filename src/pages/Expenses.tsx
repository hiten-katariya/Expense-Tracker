import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { TextReveal } from '@/components/ui/cascade-text';
import { useAuthStore } from '@/stores/authStore';
import {
  useExpenses, useCategories, useCreateExpense, useUpdateExpense,
  useDeleteExpense, useCheckDuplicateExpense, useRestoreExpense,
} from '@/hooks/useQueries';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { ExpenseRowSkeleton } from '@/components/Skeleton';
import { AdvancedExpenseFilters } from '@/components/ExpenseFilters';
import { DuplicateExpenseDialog } from '@/components/ai/DuplicateExpenseDialog';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import type { Expense, ExpenseFilters } from '@/types';
import { CategoryIcon } from './Categories';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, ChevronLeft, ChevronRight, CreditCard as Edit2,
  Trash2, Calendar, UploadCloud, Sparkles, Activity
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { PAYMENT_METHODS } from '@/types';
import { SmartSearchBar } from '@/components/ai/SmartSearchBar';
import { useReceiptOCR } from '@/hooks/useReceiptOCR';
import { ReceiptUploader } from '@/components/ai/ReceiptUploader';
import { MerchantSuggestionBadge } from '@/components/ai/MerchantSuggestionBadge';
import { AnomalyBadge } from '@/components/ai/AnomalyBadge';

const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().optional().nullable(),
  expense_date: z.string(),
  payment_method: z.enum(['cash', 'card', 'upi', 'netbanking', 'other']),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const ITEMS_PER_PAGE = 20;

export function ExpensesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workspace, user } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';

  // Build filters object from URL params
  const [advancedFilters, setAdvancedFilters] = useState<ExpenseFilters & { sort_field?: string; sort_dir?: 'asc' | 'desc' }>(() => {
    const f: ExpenseFilters & { sort_field?: string; sort_dir?: 'asc' | 'desc' } = {};
    const cat = searchParams.get('category');
    if (cat) f.category_id = cat;
    return f;
  });

  const allFilters = { ...advancedFilters, search: search || undefined };

  const { data: expenseData, isLoading } = useExpenses(workspaceId, allFilters, page, ITEMS_PER_PAGE);
  const { data: categories } = useCategories(workspaceId);
  const deleteExpense = useDeleteExpense();
  const restoreExpense = useRestoreExpense();

  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Audit Logs Modal states
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const auditModalRef = useRef<HTMLDivElement>(null);

  const fetchAuditLogs = async () => {
    setIsAuditLoading(true);
    try {
      const response = await apiClient.get('/audit-logs');
      setAuditLogs(response.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    if (isAuditModalOpen) {
      fetchAuditLogs();
    }
  }, [isAuditModalOpen]);

  // Focus trap for Audit Logs Modal
  useEffect(() => {
    if (!isAuditModalOpen) return;

    const focusableElements = auditModalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    firstElement.focus();
    window.addEventListener('keydown', handleTab);
    return () => {
      window.removeEventListener('keydown', handleTab);
    };
  }, [isAuditModalOpen, auditLogs]);

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    const expense = expenseToDelete;
    setExpenseToDelete(null);
    const toastId = toast.loading("Moving expense to trash...");
    try {
      await deleteExpense.mutateAsync({ id: expense.id, workspaceId: expense.workspace_id });
      toast.success("Expense Deleted", {
        id: toastId,
        description: "Expense moved to trash.",
        action: {
          label: "Undo",
          onClick: async () => {
            const undoToastId = toast.loading("Restoring expense...");
            try {
              await restoreExpense.mutateAsync({ id: expense.id, workspaceId: expense.workspace_id });
              toast.success("Expense Restored", { id: undoToastId, description: "Expense has been restored successfully." });
            } catch {
              toast.error("❌ Failed to restore expense", { id: undoToastId });
            }
          }
        }
      });
      addNotification({ type: 'success', title: 'Expense Deleted', message: `Expense moved to trash.` });
    } catch {
      toast.error("Error", { id: toastId, description: "Failed to delete expense" });
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete expense' });
    }
  };

  const handleFiltersChange = useCallback((f: ExpenseFilters & { sort_field?: string; sort_dir?: 'asc' | 'desc' }) => {
    setAdvancedFilters(f);
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    if (f.category_id) params.set('category', f.category_id); else params.delete('category');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const totalExpenses = expenseData?.count || 0;
  const totalPages = Math.ceil(totalExpenses / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <TextReveal
            text="Expenses"
            subtitle="Manage and track all your expenses"
            textSize="text-2xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <Link to="/expenses/import">
            <Button variant="secondary" leftIcon={<UploadCloud className="h-4 w-4" />}>
              Import CSV
            </Button>
          </Link>
          <Button
            variant="ghost"
            leftIcon={<Activity className="h-4 w-4" />}
            onClick={() => setIsAuditModalOpen(true)}
          >
            Audit Logs
          </Button>
          <Link to="/trash">
            <Button variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />}>
              Trash
            </Button>
          </Link>
          <Link to="/expenses/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Expense</Button>
          </Link>
        </div>
      </div>

      {/* Search + Advanced Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SmartSearchBar
                userId={user?.id || ''}
                onSearchMatches={(matches) => {
                  setAdvancedFilters((prev) => ({
                    ...prev,
                    expense_ids: matches || undefined,
                  }));
                }}
                placeholder="Search expenses..."
              />
            </div>
            <Select
              options={categories?.map((c) => {
                const parent = c.parent_id ? categories.find((p) => p.id === c.parent_id) : null;
                return { value: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name };
              }) || []}
              placeholder="All Categories"
              value={advancedFilters.category_id || ''}
              onChange={(e) => handleFiltersChange({ ...advancedFilters, category_id: e.target.value || undefined })}
              className="w-full sm:w-48"
            />
          </div>

          <AdvancedExpenseFilters filters={advancedFilters} onChange={handleFiltersChange} />
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card>
        {isLoading ? (
          <div className="divide-y divide-foreground/5">
            {[...Array(5)].map((_, i) => <ExpenseRowSkeleton key={i} />)}
          </div>
        ) : expenseData && expenseData.data.length > 0 ? (
          <>
            <div className="divide-y divide-foreground/5">
              {expenseData.data.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-4 py-4 px-6 hover:bg-foreground/[0.02] transition-colors group"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: expense.category?.color || '#95A5A6' }}
                  >
                    <CategoryIcon iconName={expense.category?.icon || 'Circle'} className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{expense.title}</p>
                      <AnomalyBadge isAnomaly={!!expense.is_flagged} reason={expense.notes} />
                      {expense.import_source === 'csv' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">CSV</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground/50">
                      <Calendar className="h-3 w-3" />
                      {formatDate(expense.expense_date)}
                      <span>•</span>
                      <span>
                        {PAYMENT_METHODS.find((m) => m.value === expense.payment_method)?.icon}{' '}
                        {PAYMENT_METHODS.find((m) => m.value === expense.payment_method)?.label}
                      </span>
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-medium hidden sm:inline-flex"
                    style={{ backgroundColor: expense.category?.color || '#95A5A6', color: '#fff' }}
                  >
                    {expense.category ? (
                      expense.category.parent_id && categories
                        ? `${categories.find((p) => p.id === expense.category!.parent_id)?.name || ''} › ${expense.category.name}`
                        : expense.category.name
                    ) : 'Other'}
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {formatCurrency(expense.amount)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton size="sm" onClick={() => navigate(`/expenses/edit/${expense.id}`)}>
                      <Edit2 className="h-4 w-4" />
                    </IconButton>
                    <IconButton size="sm" variant="danger" onClick={() => setExpenseToDelete(expense)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/5">
                <p className="text-sm text-foreground/60">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, totalExpenses)} of {totalExpenses}
                </p>
                <div className="flex items-center gap-2">
                  <IconButton size="sm" disabled={page <= 1} onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', String(page - 1));
                    setSearchParams(params);
                  }}>
                    <ChevronLeft className="h-4 w-4" />
                  </IconButton>
                  <span className="text-sm text-foreground/85">Page {page} of {totalPages}</span>
                  <IconButton size="sm" disabled={page >= totalPages} onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', String(page + 1));
                    setSearchParams(params);
                  }}>
                    <ChevronRight className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-foreground/60">No expenses found</p>
            <p className="text-sm text-foreground/45 mt-1">
              {search || Object.keys(advancedFilters).length > 0
                ? 'Try adjusting your filters'
                : 'Add your first expense to get started'}
            </p>
            {!search && Object.keys(advancedFilters).length === 0 && (
              <Link to="/expenses/new">
                <Button variant="ghost" className="mt-4">Add Expense</Button>
              </Link>
            )}
          </div>
        )}
      </Card>

      <Modal isOpen={!!expenseToDelete} onClose={() => setExpenseToDelete(null)} title="Move Expense to Trash?">
        <p className="text-foreground/70 mb-6">
          Are you sure you want to move this expense to trash? You can restore it later.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setExpenseToDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} isLoading={deleteExpense.isPending}>Move to Trash</Button>
        </div>
      </Modal>

      {/* Compliance Audit Logs Modal */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Security & Compliance Audit Logs"
        size="xl"
      >
        <div ref={auditModalRef} className="space-y-4 outline-none" tabIndex={-1}>
          <p className="text-xs text-foreground/60 leading-relaxed mb-4">
            Below is the read-only audit log history of security operations and data mutations linked to your profile. These logs are preserved for security audit trails.
          </p>

          {isAuditLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              <span className="text-xs text-foreground/50 font-medium">Loading security logs...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12 text-foreground/45 text-sm">
              No audit activities recorded.
            </div>
          ) : (
            <div className="overflow-x-auto border border-foreground/10 rounded-2xl max-h-[50vh] scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-foreground/[0.02] border-b border-foreground/10">
                    <th className="p-3 font-semibold text-foreground/60">Timestamp</th>
                    <th className="p-3 font-semibold text-foreground/60">Operation</th>
                    <th className="p-3 font-semibold text-foreground/60">Description</th>
                    <th className="p-3 font-semibold text-foreground/60">Client Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {auditLogs.map((log) => {
                    let eventLabel = log.event_type;
                    let badgeClass = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
                    let detailsText = "";

                    if (log.event_type === 'expense_created') {
                      eventLabel = 'Expense Created';
                      badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                      detailsText = `Created expense "${log.new_value?.title || 'Expense'}": ₹${log.new_value?.amount || 0}`;
                    } else if (log.event_type === 'expense_updated') {
                      eventLabel = 'Expense Updated';
                      badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                      const changes = [];
                      if (log.old_value && log.new_value) {
                        if (log.old_value.amount !== log.new_value.amount) {
                          changes.push(`Amount: ₹${log.old_value.amount} ➔ ₹${log.new_value.amount}`);
                        }
                        if (log.old_value.title !== log.new_value.title) {
                          changes.push(`Title: "${log.old_value.title}" ➔ "${log.new_value.title}"`);
                        }
                        if (log.old_value.is_deleted !== log.new_value.is_deleted) {
                          changes.push(log.new_value.is_deleted ? 'Moved to trash' : 'Restored');
                        }
                      }
                      detailsText = changes.length > 0 ? changes.join(', ') : 'Updated properties';
                    } else if (log.event_type === 'expense_deleted') {
                      eventLabel = 'Moved to Trash';
                      badgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                      detailsText = `Trashed "${log.old_value?.title || 'Expense'}": ₹${log.old_value?.amount || 0}`;
                    } else if (log.event_type === 'expense_restored') {
                      eventLabel = 'Expense Restored';
                      badgeClass = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
                      detailsText = `Restored "${log.new_value?.title || 'Expense'}": ₹${log.new_value?.amount || 0}`;
                    } else if (log.event_type === 'expense_permanently_deleted') {
                      eventLabel = 'Permanently Deleted';
                      badgeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                      detailsText = `Permanently deleted "${log.old_value?.title || 'Expense'}"`;
                    } else if (log.event_type === 'budget_created') {
                      eventLabel = 'Budget Created';
                      badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                      detailsText = `Set budget limit to ₹${log.new_value?.amount || 0}`;
                    } else if (log.event_type === 'budget_updated') {
                      eventLabel = 'Budget Updated';
                      badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                      if (log.old_value && log.new_value && log.old_value.amount !== log.new_value.amount) {
                        detailsText = `Limit: ₹${log.old_value.amount} ➔ ₹${log.new_value.amount}`;
                      } else {
                        detailsText = 'Updated budget settings';
                      }
                    } else if (log.event_type === 'budget_deleted') {
                      eventLabel = 'Budget Deleted';
                      badgeClass = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                      detailsText = `Removed budget: ₹${log.old_value?.amount || 0}`;
                    } else if (log.event_type === 'profile_updated') {
                      eventLabel = 'Security Action';
                      badgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                      detailsText = log.new_value?.action === 'gdpr_data_exported' ? 'GDPR Compliance Export Requested' : 'Profile Updated';
                    }

                    return (
                      <tr key={log.id} className="hover:bg-foreground/[0.01]">
                        <td className="p-3 whitespace-nowrap text-foreground/50">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                            {eventLabel}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-foreground">{detailsText}</td>
                        <td className="p-3 text-foreground/50 max-w-[180px] truncate" title={log.user_agent || ''}>
                          {log.ip_address || '0.0.0.0'}
                          <span className="block text-[10px] opacity-75 truncate">{log.user_agent || 'Browser'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => setIsAuditModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Expense Form (Create / Edit) with Duplicate Detection
// ────────────────────────────────────────────────────────────
export function ExpenseFormPage() {
  const navigate = useNavigate();
  const { workspace, profile } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);
  const isEdit = window.location.pathname.includes('/edit/');
  const expenseId = isEdit ? window.location.pathname.split('/').pop() : null;

  const { data: categories } = useCategories(workspaceId);
  const { data: expenseData } = useExpenses(workspaceId, {}, 1, 1);
  const expense = isEdit && expenseId ? expenseData?.data.find((e) => e.id === expenseId) : undefined;

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const checkDuplicate = useCheckDuplicateExpense(workspaceId);

  // Duplicate modal state
  const [pendingData, setPendingData] = useState<ExpenseFormData | null>(null);
  const [duplicateExpense, setDuplicateExpense] = useState<Expense | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: expense?.title || '',
      amount: expense?.amount || undefined,
      category_id: expense?.category_id || '',
      expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
      payment_method: expense?.payment_method || 'cash',
      notes: expense?.notes || '',
    },
  });

  const { scan: scanReceipt, isScanning } = useReceiptOCR();

  const handleReceiptParsed = (parsedData: any) => {
    if (parsedData.merchant) {
      setValue('title', parsedData.merchant);
    }
    if (parsedData.amount) {
      setValue('amount', parsedData.amount);
    }
    if (parsedData.date) {
      setValue('expense_date', parsedData.date);
    }
    if (parsedData.categoryName) {
      const category = categories?.find((c) => c.name.toLowerCase() === parsedData.categoryName.toLowerCase());
      if (category) {
        setValue('category_id', category.id);
      }
    }
    if (parsedData.paymentMethod) {
      setValue('payment_method', parsedData.paymentMethod as any);
    }
    if (parsedData.notes) {
      setValue('notes', parsedData.notes);
    }
  };

  const handleScanReceiptFile = async (base64Image: string) => {
    return scanReceipt({
      image: base64Image,
      userId: profile!.id,
      categories: categories?.map((c) => ({ id: c.id, name: c.name })) || [],
    });
  };

  const [merchantSuggestion, setMerchantSuggestion] = useState<{ raw: string; canonical: string } | null>(null);

  const checkMerchantAlias = async (rawName: string) => {
    if (!rawName || rawName.trim().length < 3) return;
    try {
      const API = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API}/api/ai/merchant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile!.id, rawName }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.canonicalName && data.canonicalName.toLowerCase() !== rawName.toLowerCase()) {
          setMerchantSuggestion({ raw: rawName, canonical: data.canonicalName });
        } else {
          setMerchantSuggestion(null);
        }
      }
    } catch (err) {
      console.error('Error fetching merchant alias:', err);
    }
  };

  const doSave = async (data: ExpenseFormData) => {
    const actionLabel = isEdit ? "Updating expense..." : "Adding expense...";
    const toastId = toast.loading(actionLabel);
    try {
      const payload = {
        title: data.title,
        amount: data.amount,
        category_id: data.category_id || null,
        expense_date: data.expense_date,
        payment_method: data.payment_method,
        notes: data.notes || null,
        user_id: profile!.id,
        workspace_id: workspaceId!,
        expense_scope: 'personal' as const,
        family_id: null,
      };
      if (isEdit && expenseId) {
        await updateExpense.mutateAsync({ id: expenseId, updates: payload });
        toast.success("Expense Updated", {
          id: toastId,
          description: "Expense details have been updated."
        });
        addNotification({ type: 'success', title: 'Expense Updated', message: 'Expense details have been updated.' });
      } else {
        await createExpense.mutateAsync(payload);
        toast.success("Expense Added", {
          id: toastId,
          description: "Your expense has been added successfully."
        });
        addNotification({ type: 'success', title: 'Expense Added', message: 'Your expense has been added successfully.' });
      }
      navigate('/expenses');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; details?: string; hint?: string };
      console.error('Error saving expense:', e);
      toast.error("❌ Failed to save expense", { id: toastId, description: e?.message || 'Unknown error' });
      addNotification({ type: 'error', title: 'Error', message: e?.message || 'Failed to save expense' });
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    // Skip duplicate check on edit
    if (!isEdit) {
      try {
        const existing = await checkDuplicate.mutateAsync({
          title: data.title,
          amount: data.amount,
          expense_date: data.expense_date,
          category_id: data.category_id || null,
        });
        if (existing) {
          setPendingData(data);
          setDuplicateExpense(existing);
          return; // Show modal instead of saving
        }
      } catch { /* Silently ignore duplicate check errors — don't block save */ }
    }
    await doSave(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? 'Edit Expense' : 'Add Expense'}
        </h1>
        <p className="text-foreground/60">
          {isEdit ? 'Update the details of your expense' : 'Record a new expense'}
        </p>
      </div>

      {!isEdit && (
        <Card className="border border-primary-500/10 bg-primary-500/5">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary-500 animate-pulse" />
              Autofill Form with Receipt Scan
            </h3>
            <ReceiptUploader
              onParsed={handleReceiptParsed}
              isScanning={isScanning}
              onScanFile={handleScanReceiptFile}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1">
              <Input
                label="Title *"
                placeholder="e.g., Grocery shopping at Big Bazaar"
                error={errors.title?.message}
                {...register('title', {
                  onBlur: (e) => checkMerchantAlias(e.target.value),
                })}
              />
              {merchantSuggestion && (
                <div className="mt-1 flex justify-start">
                  <MerchantSuggestionBadge
                    rawName={merchantSuggestion.raw}
                    canonicalName={merchantSuggestion.canonical}
                    onClick={(name) => {
                      setValue('title', name);
                      setMerchantSuggestion(null);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount *"
                type="number"
                step="0.01"
                placeholder="0.00"
                error={errors.amount?.message}
                leftIcon={<span className="text-foreground/45">₹</span>}
                {...register('amount', { valueAsNumber: true })}
              />
              <Input
                label="Date *"
                type="date"
                error={errors.expense_date?.message}
                {...register('expense_date')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Category"
                options={categories?.map((c) => {
                  const parent = c.parent_id ? categories.find((p) => p.id === c.parent_id) : null;
                  return { value: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name };
                }) || []}
                placeholder="Select category"
                {...register('category_id')}
              />
              <Select
                label="Payment Method *"
                options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: `${m.icon} ${m.label}` }))}
                error={errors.payment_method?.message}
                {...register('payment_method')}
              />
            </div>

            <Input
              label="Notes"
              type="textarea"
              placeholder="Add any additional notes..."
              {...register('notes')}
            />

            <div className="flex items-center gap-4 pt-4">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting || checkDuplicate.isPending}>
                {isEdit ? 'Save Changes' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Duplicate Warning Modal */}
      <DuplicateExpenseDialog
        isOpen={!!duplicateExpense}
        onClose={() => { setDuplicateExpense(null); setPendingData(null); }}
        onConfirm={async () => {
          setDuplicateExpense(null);
          if (pendingData) await doSave(pendingData);
        }}
        duplicateExpense={duplicateExpense}
      />
    </div>
  );
}
  