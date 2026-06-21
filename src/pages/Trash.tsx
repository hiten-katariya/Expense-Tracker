import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TextReveal } from '@/components/ui/cascade-text';
import { useAuthStore } from '@/stores/authStore';
import {
  useTrashedExpenses,
  useRestoreExpense,
  usePermanentDeleteExpense,
  useBulkRestore,
  useBulkPermanentDelete,
} from '@/hooks/useQueries';
import { useUIStore } from '@/stores/uiStore';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { ExpenseRowSkeleton } from '@/components/Skeleton';
import { CategoryIcon } from '@/pages/Categories';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Expense } from '@/types';
import {
  Trash2,
  RotateCcw,
  X,
  CheckSquare,
  Square,
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-card border border-foreground/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
              </div>
              <p className="text-sm text-foreground/60 mb-6">{description}</p>
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
                <Button variant="danger" className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function TrashPage() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const { data: trashedExpenses = [], isLoading } = useTrashedExpenses(workspaceId);
  const restoreExpense = useRestoreExpense();
  const permanentDelete = usePermanentDeleteExpense();
  const bulkRestore = useBulkRestore();
  const bulkDelete = useBulkPermanentDelete();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<null | {
    title: string; description: string; confirmLabel: string; onConfirm: () => void;
  }>(null);

  const allSelected = trashedExpenses.length > 0 && selected.size === trashedExpenses.length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(trashedExpenses.map((e) => e.id)));
  };

  const handleRestore = async (expense: Expense) => {
    try {
      await restoreExpense.mutateAsync({ id: expense.id, workspaceId: expense.workspace_id });
      addNotification({ type: 'success', title: 'Restored', message: `"${expense.title}" moved back to Expenses.` });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to restore expense.' });
    }
  };

  const handlePermanentDelete = (expense: Expense) => {
    setConfirmDialog({
      title: 'Permanently Delete?',
      description: `"${expense.title}" will be deleted forever and cannot be recovered.`,
      confirmLabel: 'Delete Forever',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await permanentDelete.mutateAsync({ id: expense.id, workspaceId: expense.workspace_id });
          setSelected((prev) => { const next = new Set(prev); next.delete(expense.id); return next; });
          addNotification({ type: 'success', title: 'Deleted', message: 'Expense permanently deleted.' });
        } catch {
          addNotification({ type: 'error', title: 'Error', message: 'Failed to delete expense.' });
        }
      },
    });
  };

  const handleBulkRestore = async () => {
    if (!workspaceId || selected.size === 0) return;
    try {
      await bulkRestore.mutateAsync({ ids: [...selected], workspaceId });
      setSelected(new Set());
      addNotification({ type: 'success', title: 'Restored', message: `${selected.size} expense(s) restored.` });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to restore selected expenses.' });
    }
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    setConfirmDialog({
      title: `Delete ${selected.size} expense(s) forever?`,
      description: 'This cannot be undone. These expenses will be permanently removed.',
      confirmLabel: 'Delete Forever',
      onConfirm: async () => {
        setConfirmDialog(null);
        if (!workspaceId) return;
        try {
          await bulkDelete.mutateAsync({ ids: [...selected], workspaceId });
          setSelected(new Set());
          addNotification({ type: 'success', title: 'Deleted', message: 'Selected expenses permanently deleted.' });
        } catch {
          addNotification({ type: 'error', title: 'Error', message: 'Failed to delete selected expenses.' });
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/expenses">
            <IconButton variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
          </Link>
          <div>
            <TextReveal
              text="Trash"
              subtitle={`${trashedExpenses.length} deleted expense${trashedExpenses.length !== 1 ? 's' : ''}`}
              textSize="text-2xl"
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20"
          >
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400 flex-1">
              {selected.size} expense{selected.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleBulkRestore}
              isLoading={bulkRestore.isPending}
            >
              Restore All
            </Button>
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={handleBulkDelete}
            >
              Delete All
            </Button>
            <IconButton size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4" />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="divide-y divide-foreground/5">
            {[...Array(4)].map((_, i) => <ExpenseRowSkeleton key={i} />)}
          </div>
        ) : trashedExpenses.length === 0 ? (
          <CardContent className="py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8 text-foreground/25" />
            </div>
            <p className="text-foreground/55 font-medium">Trash is empty</p>
            <p className="text-sm text-foreground/40 mt-1">Deleted expenses will appear here</p>
            <Link to="/expenses">
              <Button variant="ghost" className="mt-4">Back to Expenses</Button>
            </Link>
          </CardContent>
        ) : (
          <>
            {/* Column header */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-foreground/5 bg-foreground/[0.01]">
              <button onClick={toggleAll} className="text-foreground/40 hover:text-primary-500 transition-colors">
                {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </button>
              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider flex-1">Expense</span>
              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider w-32 hidden sm:block">Deleted</span>
              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider w-24 text-right">Amount</span>
              <span className="w-20" />
            </div>

            <div className="divide-y divide-foreground/5">
              <AnimatePresence>
                {trashedExpenses.map((expense) => (
                  <motion.div
                    key={expense.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/[0.02] transition-colors group"
                  >
                    <button
                      onClick={() => toggleSelect(expense.id)}
                      className="text-foreground/30 hover:text-primary-500 transition-colors shrink-0"
                    >
                      {selected.has(expense.id)
                        ? <CheckSquare className="h-4 w-4 text-primary-500" />
                        : <Square className="h-4 w-4" />
                      }
                    </button>

                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 opacity-60"
                      style={{ backgroundColor: expense.category?.color || '#95A5A6' }}
                    >
                      <CategoryIcon iconName={expense.category?.icon || 'Circle'} className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/70 truncate">{expense.title}</p>
                      <div className="flex items-center gap-2 text-xs text-foreground/40 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(expense.expense_date)}
                        {expense.category && (
                          <><span>•</span><span style={{ color: expense.category.color || undefined }}>{expense.category.name}</span></>
                        )}
                      </div>
                    </div>

                    {expense.deleted_at && (
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-foreground/40 w-32">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formatDate(expense.deleted_at)}</span>
                      </div>
                    )}

                    <span className="text-sm font-semibold text-foreground/60 w-24 text-right">
                      {formatCurrency(expense.amount)}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-20 justify-end">
                      <IconButton
                        size="sm"
                        title="Restore"
                        onClick={() => handleRestore(expense)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="danger"
                        title="Delete forever"
                        onClick={() => handlePermanentDelete(expense)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        description={confirmDialog?.description || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
