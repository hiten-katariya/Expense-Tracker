import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TextReveal } from '@/components/ui/cascade-text';
import { useAuthStore } from '@/stores/authStore';
import {
  useFamilies,
  useFamilyMembers,
  useFamilyTrashedExpenses,
  useRestoreFamilyExpense,
  usePermanentDeleteFamilyExpense,
} from '@/hooks/useQueries';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { ExpenseRowSkeleton } from '@/components/Skeleton';
import { CategoryIcon } from '@/pages/Categories';
import { formatCurrency, formatDate, sanitizeName } from '@/lib/utils';
import {
  Trash2,
  RotateCcw,
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  Users,
  Info
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

export function FamilyTrashPage() {
  const { user } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);

  // Active family
  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  // Family members (to determine roles)
  const { data: members, isLoading: membersLoading } = useFamilyMembers(familyId);
  const currentMember = members?.find((m) => m.profile_id === user?.id);
  const isOwner = currentMember?.member_role === 'owner';
  const isAdmin = currentMember?.member_role === 'admin';
  const canManageAll = isOwner || isAdmin;

  // Trashed expenses
  const { data: trashedExpenses = [], isLoading: trashLoading, refetch } = useFamilyTrashedExpenses(familyId);
  const restoreExpense = useRestoreFamilyExpense();
  const permanentDelete = usePermanentDeleteFamilyExpense();

  const [confirmDialog, setConfirmDialog] = useState<null | {
    title: string; description: string; confirmLabel: string; onConfirm: () => void;
  }>(null);

  const handleRestore = async (expense: any) => {
    const isCreator = expense.user_id === user?.id;
    if (!canManageAll && !isCreator) {
      toast.error("Unauthorized: Standard members can only restore expenses they created.");
      return;
    }

    const toastId = toast.loading("Restoring family expense...");
    try {
      await restoreExpense.mutateAsync({ id: expense.id, familyId: familyId! });
      toast.success("♻️ Family Expense Restored", {
        id: toastId,
        description: "Transaction restored successfully."
      });
      addNotification({ type: 'success', title: 'Restored', message: `Shared expense "${expense.title}" restored.` });
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore expense", { id: toastId });
    }
  };

  const handlePermanentDelete = (expense: any) => {
    const isCreator = expense.user_id === user?.id;
    if (!canManageAll && !isCreator) {
      toast.error("Unauthorized: Standard members can only permanently delete expenses they created.");
      return;
    }

    setConfirmDialog({
      title: 'Permanently Delete?',
      description: `"${expense.title}" will be deleted forever from family archives. This cannot be undone.`,
      confirmLabel: 'Delete Forever',
      onConfirm: async () => {
        setConfirmDialog(null);
        const toastId = toast.loading("Permanently deleting expense...");
        try {
          await permanentDelete.mutateAsync({ id: expense.id, familyId: familyId! });
          toast.success("Expense permanently deleted", { id: toastId });
          addNotification({ type: 'success', title: 'Deleted', message: 'Family expense permanently deleted.' });
          refetch();
        } catch (err: any) {
          toast.error(err?.message || "Failed to permanently delete expense", { id: toastId });
        }
      },
    });
  };

  if (familiesLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeFamily) {
    return (
      <Card className="py-12 text-center max-w-lg mx-auto">
        <CardContent>
          <Users className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground">No active family</h2>
          <p className="text-sm text-foreground/60 mt-1 mb-6">
            Join or create a family group first in order to view family trash.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/family/expenses">
            <IconButton variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
          </Link>
          <div>
            <TextReveal
              text="Family Trash"
              subtitle={`${trashedExpenses.length} deleted family transaction${trashedExpenses.length !== 1 ? 's' : ''}`}
              textSize="text-2xl"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="relative overflow-hidden border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-glass">
        {/* Decorative line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-pink-500" />
        {trashLoading ? (
          <div className="divide-y divide-foreground/5">
            {[...Array(4)].map((_, i) => <ExpenseRowSkeleton key={i} />)}
          </div>
        ) : trashedExpenses.length === 0 ? (
          <CardContent className="py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-8 w-8 text-foreground/25" />
            </div>
            <p className="text-foreground/55 font-medium">Family Trash is empty</p>
            <p className="text-sm text-foreground/40 mt-1">Deleted family expenses will appear here</p>
            <Link to="/family/expenses">
              <Button variant="ghost" className="mt-4">Back to Family Expenses</Button>
            </Link>
          </CardContent>
        ) : (
          <>
            {/* Column header */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-foreground/5 bg-foreground/[0.01]">
              <span className="w-4 shrink-0" />
              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider flex-1">Expense</span>
              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider w-36 hidden sm:block">Deleted By</span>
              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider w-32 hidden md:block">Deleted Date</span>
              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider w-24 text-right">Amount</span>
              <span className="w-20" />
            </div>

            <div className="divide-y divide-foreground/5">
              <AnimatePresence>
                {trashedExpenses.map((expense) => {
                  const isCreator = expense.user_id === user?.id;
                  const canRestore = canManageAll || isCreator;
                  const deleterProfile = members?.find((m) => m.profile_id === expense.deleted_by)?.profile;
                  const deleterName = sanitizeName(deleterProfile?.full_name) || deleterProfile?.email?.split('@')[0] || 'Unknown';
                  const spenderProfile = members?.find((m) => m.profile_id === expense.user_id)?.profile;
                  const spenderName = sanitizeName(spenderProfile?.full_name) || spenderProfile?.email?.split('@')[0] || 'Unknown';

                  return (
                    <motion.div
                      key={expense.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/[0.02] transition-colors group"
                    >
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 opacity-60"
                        style={{ backgroundColor: expense.category?.color || '#95A5A6' }}
                      >
                        <CategoryIcon iconName={expense.category?.icon || 'Circle'} className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground/75 truncate">{expense.title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/40 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(expense.expense_date)}
                          <span>•</span>
                          <span>Spender: <strong>{spenderName}</strong></span>
                        </div>
                      </div>

                      <div className="hidden sm:block text-xs text-foreground/60 w-36 truncate">
                        {deleterName} {expense.deleted_by === user?.id && '(You)'}
                      </div>

                      {expense.deleted_at && (
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-foreground/40 w-32">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{formatDate(expense.deleted_at)}</span>
                        </div>
                      )}

                      <span className="text-sm font-bold text-foreground/70 w-24 text-right">
                        {formatCurrency(expense.amount)}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-20 justify-end">
                        {canRestore ? (
                          <>
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
                          </>
                        ) : (
                          <span className="p-1.5 text-foreground/30 cursor-not-allowed" title="Standard members can only manage expenses they logged.">
                            <Info className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
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
