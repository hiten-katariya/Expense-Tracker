import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  useFamilies,
  useFamilyMembers,
  useFamilyExpenses,
  useCategories,
  useDeleteExpense
} from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatDate, sanitizeName } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';
import {
  Plus, Search, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar,
  Users, Info
} from 'lucide-react';
import { CategoryIcon } from './Categories';
import { Link } from 'react-router-dom';
import { SafeAvatar } from '@/components/Avatar';
import { PAYMENT_METHODS } from '@/types';
import type { Expense } from '@/types';

const ITEMS_PER_PAGE = 20;

const getCategoryIconName = (categoryName: string): string => {
  const name = categoryName.toLowerCase();
  if (name.includes('food') || name.includes('eat') || name.includes('dining') || name.includes('restaurant')) return 'UtensilsCrossed';
  if (name.includes('transport') || name.includes('car') || name.includes('fuel') || name.includes('cab') || name.includes('taxi')) return 'Car';
  if (name.includes('shopping') || name.includes('grocer') || name.includes('store') || name.includes('buy')) return 'ShoppingBag';
  if (name.includes('bill') || name.includes('utilit') || name.includes('subscription') || name.includes('phone') || name.includes('internet')) return 'Receipt';
  if (name.includes('rent') || name.includes('home') || name.includes('house')) return 'Home';
  if (name.includes('salary') || name.includes('income') || name.includes('earn')) return 'Wallet';
  if (name.includes('entertainment') || name.includes('movie') || name.includes('game') || name.includes('fun') || name.includes('show') || name.includes('play')) return 'Gamepad2';
  if (name.includes('health') || name.includes('medic') || name.includes('doctor') || name.includes('pharmacy') || name.includes('fitness')) return 'HeartPulse';
  if (name.includes('travel') || name.includes('flight') || name.includes('trip') || name.includes('hotel') || name.includes('vacation')) return 'Plane';
  if (name.includes('education') || name.includes('school') || name.includes('college') || name.includes('course') || name.includes('book')) return 'GraduationCap';
  if (name.includes('investment') || name.includes('stock') || name.includes('saving') || name.includes('market') || name.includes('trade')) return 'TrendingUp';
  return 'CircleDollarSign';
};

const ReceiptOrCategoryIcon = ({
  receiptUrl,
  categoryColor,
  iconName
}: {
  receiptUrl: string | null;
  categoryColor: string;
  iconName: string;
}) => {
  const [imgError, setImgError] = useState(false);

  if (receiptUrl && !imgError) {
    return (
      <img
        src={receiptUrl}
        alt="Receipt"
        className="h-10 w-10 rounded-full object-cover shrink-0 shadow-sm border border-foreground/10"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm border border-foreground/5"
      style={{ backgroundColor: categoryColor }}
    >
      <CategoryIcon iconName={iconName} className="h-5 w-5" />
    </div>
  );
};

export function FamilyExpensesPage() {
  const { user, workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  // States
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSpender, setSelectedSpender] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  
  // Modals state
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Families hook
  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  // Family members list
  const { data: members, isLoading: membersLoading } = useFamilyMembers(familyId);
  const currentMember = members?.find((m) => m.profile_id === user?.id);
  const isOwner = currentMember?.member_role === 'owner';
  const isAdmin = currentMember?.member_role === 'admin';
  const canManageAll = isOwner || isAdmin;

  // Categories list
  const { data: categories } = useCategories(workspaceId);

  // Filters object
  const filters = {
    category_id: selectedCategory || undefined,
    payment_method: selectedPayment || undefined,
    search: search || undefined,
    sort_field: 'expense_date',
    sort_dir: 'desc' as const,
  };

  // Fetch family expenses
  const { data: expenseData, isLoading: expensesLoading, refetch } = useFamilyExpenses(
    familyId,
    filters,
    page,
    ITEMS_PER_PAGE
  );

  // Mutations
  const deleteExpense = useDeleteExpense();

  // Filter list of expenses by spender in JS since Supabase query on user_id is cleaner client-side in list
  const rawExpenses = expenseData?.data || [];
  const filteredExpenses = selectedSpender
    ? rawExpenses.filter((e) => e.user_id === selectedSpender)
    : rawExpenses;

  const totalExpenses = expenseData?.count || 0;
  const totalPages = Math.ceil(totalExpenses / ITEMS_PER_PAGE);



  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    const toastId = toast.loading('Deleting expense...');
    try {
      await deleteExpense.mutateAsync({ id: expenseToDelete.id, workspaceId: expenseToDelete.workspace_id });
      toast.success('Expense deleted', { id: toastId });
      addNotification({ type: 'success', title: 'Expense Deleted', message: 'Shared expense moved to trash.' });
      setExpenseToDelete(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete expense', { id: toastId });
    }
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
            Join or create a family group first in order to view shared family expenses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <TextReveal
            text="Family Expenses"
            subtitle="View, search, and manage family shared transactions"
            textSize="text-2xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <Link to="/family/trash">
            <Button variant="secondary" leftIcon={<Trash2 className="h-4 w-4" />}>
              Trash
            </Button>
          </Link>
          <Link to="/family/expenses/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              Log Family Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-foreground/10 bg-background pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>

            <Select
              options={categories?.map((c) => {
                const parent = c.parent_id ? categories.find((p) => p.id === c.parent_id) : null;
                return { value: c.id, label: parent ? `${parent.name} › ${c.name}` : c.name };
              }) || []}
              placeholder="All Categories"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            />

            <Select
              options={members?.map((m) => {
                const displayName = sanitizeName(m.profile?.full_name) || m.profile?.email?.split('@')[0] || 'Unknown Member';
                return { value: m.profile_id, label: displayName };
              }) || []}
              placeholder="All Spenders"
              value={selectedSpender}
              onChange={(e) => {
                setSelectedSpender(e.target.value);
                setPage(1);
              }}
            />

            <Select
              options={PAYMENT_METHODS.map((p) => ({ value: p.value, label: `${p.icon} ${p.label}` }))}
              placeholder="All Payments"
              value={selectedPayment}
              onChange={(e) => {
                setSelectedPayment(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table/List */}
      <Card>
        {expensesLoading ? (
          <div className="p-12 text-center text-foreground/50">
            <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading shared expenses...
          </div>
        ) : filteredExpenses.length > 0 ? (
          <>
            <div className="divide-y divide-foreground/5">
              {filteredExpenses.map((expense) => {
                const isCreator = expense.user_id === user?.id;
                const canEditOrDelete = canManageAll || isCreator;
                const spenderProfile = expense.profile || members?.find((m) => m.profile_id === expense.user_id)?.profile;
                const spenderName = sanitizeName(spenderProfile?.full_name) || spenderProfile?.email?.split('@')[0] || 'Unknown';
                const spenderEmail = spenderProfile?.email || '';

                const hasCategory = expense.category_id !== null;
                const isCategoryDeleted = hasCategory && !expense.category;

                const categoryName = !hasCategory
                  ? 'Uncategorized'
                  : isCategoryDeleted
                  ? 'Deleted Category'
                  : expense.category!.name;

                const categoryColor = !hasCategory
                  ? '#95A5A6'
                  : isCategoryDeleted
                  ? '#95A5A6'
                  : expense.category!.color || '#95A5A6';

                const categoryIconName = !hasCategory
                  ? 'Circle'
                  : isCategoryDeleted
                  ? 'Trash2'
                  : expense.category!.icon || getCategoryIconName(expense.category!.name);

                return (
                  <div
                    key={expense.id}
                    className="flex items-center gap-4 py-4 px-6 hover:bg-foreground/[0.02] transition-colors group"
                  >
                    <ReceiptOrCategoryIcon
                      receiptUrl={expense.receipt_url}
                      categoryColor={categoryColor}
                      iconName={categoryIconName}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ color: categoryColor }} className="shrink-0 flex items-center justify-center">
                          <CategoryIcon iconName={categoryIconName} className="h-4 w-4" />
                        </span>
                        <p className="text-sm font-semibold text-foreground truncate">{expense.title}</p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          Shared
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/50 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(expense.expense_date)}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1.5" title={spenderEmail}>
                          <SafeAvatar
                            src={spenderProfile?.avatar_url}
                            className="h-3.5 w-3.5"
                            iconClassName="h-2 w-2"
                          />
                          <span>Logged by: <strong>{spenderName}</strong> {isCreator && '(You)'}</span>
                        </div>
                        <span>•</span>
                        <span className="capitalize">{expense.payment_method}</span>
                      </div>
                    </div>

                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold inline-flex items-center gap-1.5 border shrink-0"
                      style={{
                        backgroundColor: `${categoryColor}15`,
                        color: categoryColor,
                        borderColor: `${categoryColor}30`
                      }}
                    >
                      <CategoryIcon iconName={categoryIconName} className="h-3 w-3" />
                      <span>{categoryName}</span>
                    </span>

                    <span className="text-base font-bold text-foreground tabular-nums">
                      {formatCurrency(expense.amount)}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEditOrDelete ? (
                        <>
                          <Link to={`/family/expenses/edit/${expense.id}`}>
                            <IconButton size="sm">
                              <Edit2 className="h-4 w-4" />
                            </IconButton>
                          </Link>
                          <IconButton size="sm" variant="danger" onClick={() => setExpenseToDelete(expense)}>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </>
                      ) : (
                        <span className="p-1 text-foreground/35 cursor-not-allowed" title="Only admins/owners or the spender can edit this.">
                          <Info className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/5">
                <p className="text-sm text-foreground/60">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, totalExpenses)} of {totalExpenses}
                </p>
                <div className="flex items-center gap-2">
                  <IconButton size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </IconButton>
                  <span className="text-sm text-foreground/85">Page {page} of {totalPages}</span>
                  <IconButton size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center text-foreground/60">
            <p>No family expenses found matching current filters.</p>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        title="Move Shared Expense to Trash?"
      >
        <p className="text-sm text-foreground/75 mb-6">
          Are you sure you want to move this shared expense to trash? Admins can restore it from their workspace trash.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <Button variant="secondary" onClick={() => setExpenseToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm} isLoading={deleteExpense.isPending}>
            Move to Trash
          </Button>
        </div>
      </Modal>
    </div>
  );
}
