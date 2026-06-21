import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { CategoryCardSkeleton } from '@/components/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as LucideIcons from 'lucide-react';
import { Plus, CreditCard as Edit2, Trash2 } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().min(1, 'Color is required'),
  monthly_limit: z.number().optional().nullable(),
  parent_id: z.string().optional().nullable(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const EMOJI_OPTIONS = ['🍔', '🚗', '🏠', '💊', '🎬', '🛒', '📚', '💡', '📦', '✈️', '🎮', '🎵', '🏋️', '👔', '💇', '📱', '🎁', '🌸', '☕', '🍕'];
const COLOR_OPTIONS = [
  '#22C55E', // Green (Food)
  '#3B82F6', // Blue (Transport)
  '#A855F7', // Purple (Housing)
  '#EF4444', // Red (Healthcare)
  '#EC4899', // Pink (Shopping)
  '#F97316', // Orange (Entertainment)
  '#06B6D4', // Cyan (Education)
  '#EAB308', // Yellow (Family)
  '#14B8A6', // Teal (Travel)
  '#10B981', // Emerald (Finance)
  '#6B7280', // Gray (Misc)
];

const LUCIDE_ICONS_LIST = [
  { name: 'Utensils', label: 'Food & Dining' },
  { name: 'Car', label: 'Transportation' },
  { name: 'Home', label: 'Housing' },
  { name: 'Heart', label: 'Healthcare' },
  { name: 'ShoppingBag', label: 'Shopping' },
  { name: 'Film', label: 'Entertainment' },
  { name: 'BookOpen', label: 'Education' },
  { name: 'Users', label: 'Family' },
  { name: 'Plane', label: 'Travel' },
  { name: 'Wallet', label: 'Finance' },
  { name: 'Circle', label: 'General/Other' }
];

export function CategoryIcon({ iconName, className = "h-5 w-5" }: { iconName: string; className?: string }) {
  const IconComponent = (LucideIcons as any)[iconName];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  return <span className="text-xl select-none leading-none">{iconName || '📦'}</span>;
}
export function CategoriesPage() {
  const { workspace, user } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<string | null>(null);

  const { data: categories, isLoading } = useCategories(workspaceId);

  // Required Logging
  console.log('Workspace:', workspace);
  console.log('Workspace ID:', workspaceId);
  console.log('Store Categories:', categories);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      icon: 'Circle',
      color: '#6B7280',
      parent_id: '',
    },
  });

  const watchColor = watch('color');
  const watchIcon = watch('icon');

  const openModal = (categoryId?: string) => {
    if (categoryId) {
      const category = categories?.find((c) => c.id === categoryId);
      if (category) {
        setValue('name', category.name);
        setValue('icon', category.icon || 'Circle');
        setValue('color', category.color || '#6B7280');
        setValue('monthly_limit', category.monthly_limit);
        setValue('parent_id', category.parent_id || '');
        setEditingCategory(categoryId);
      }
    } else {
      reset({
        name: '',
        icon: 'Circle',
        color: '#6B7280',
        parent_id: '',
      });
      setEditingCategory(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
    setEditingCategory(null);
  };  const onSubmit = async (data: CategoryFormData) => {
    try {
      const payload = {
        name: data.name,
        icon: data.icon,
        color: data.color,
        monthly_limit: data.monthly_limit || null,
        workspace_id: workspaceId!,
        is_default: false,
        parent_id: data.parent_id || null,
        created_by: user?.id || null,
      };

      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory, updates: payload });
        addNotification({ type: 'success', title: 'Category updated', message: 'Changes saved successfully.' });
      } else {
        await createCategory.mutateAsync(payload);
        addNotification({ type: 'success', title: 'Category created', message: 'New category has been added.' });
      }
      closeModal();
    } catch (err: any) {
      console.error("Failed to save category:", err);
      if (err) {
        console.error("Supabase Error Code:", err.code);
        console.error("Supabase Error Message:", err.message);
        console.error("Supabase Error Details:", err.details);
        console.error("Supabase Error Hint:", err.hint);
      }
      addNotification({ type: 'error', title: 'Error', message: 'Failed to save category' });
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? Expenses in this category will be uncategorized.')) return;
    try {
      await deleteCategory.mutateAsync({ id: categoryId, workspaceId: workspaceId! });
      addNotification({ type: 'success', title: 'Category deleted', message: 'Category has been removed.' });
    } catch (err: any) {
      console.error("Failed to delete category:", err);
      if (err) {
        console.error("Supabase Error Code:", err.code);
        console.error("Supabase Error Message:", err.message);
        console.error("Supabase Error Details:", err.details);
        console.error("Supabase Error Hint:", err.hint);
      }
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete category' });
    }
  };

  // Group Categories
  const parentCategories = categories?.filter((c) => !c.parent_id) || [];
  const childCategories = categories?.filter((c) => c.parent_id) || [];

  const groupedCategories = parentCategories.map((parent) => {
    const children = childCategories.filter((child) => child.parent_id === parent.id);
    return { parent, children };
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <TextReveal
            text="Categories"
            subtitle="Manage your expense categories and budgets"
            textSize="text-2xl"
          />
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openModal()}>
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="space-y-8">
          {groupedCategories.map(({ parent, children }) => (
            <div key={parent.id} className="space-y-4 p-5 rounded-2xl border border-foreground/10 bg-card/10 backdrop-blur-md">
              {/* Group Header */}
              <div className="flex items-center justify-between pb-3 border-b border-foreground/5">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: parent.color || '#6B7280' }}
                  >
                    <CategoryIcon iconName={parent.icon || 'Circle'} className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{parent.name}</h2>
                    {parent.monthly_limit && (
                      <p className="text-xs text-foreground/60">
                        Group Budget: {formatCurrency(parent.monthly_limit)}
                      </p>
                    )}
                  </div>
                </div>
                {!parent.is_default && (
                  <div className="flex items-center gap-1">
                    <IconButton size="sm" onClick={() => openModal(parent.id)}>
                      <Edit2 className="h-4 w-4" />
                    </IconButton>
                    <IconButton size="sm" variant="danger" onClick={() => handleDelete(parent.id)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                )}
              </div>

              {/* Children Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {children.length > 0 ? (
                  children.map((child) => (
                    <Card key={child.id} hoverable>
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: child.color || '#6B7280' }}
                          >
                            <CategoryIcon iconName={child.icon || 'Circle'} className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{child.name}</h3>
                            {child.monthly_limit && (
                              <p className="text-xs text-foreground/60">
                                Budget: {formatCurrency(child.monthly_limit)}
                              </p>
                            )}
                          </div>
                        </div>
                        {!child.is_default && (
                          <div className="flex items-center gap-1 shrink-0">
                            <IconButton size="sm" onClick={() => openModal(child.id)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </IconButton>
                            <IconButton size="sm" variant="danger" onClick={() => handleDelete(child.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-xs text-foreground/40 italic p-1">No subcategories in this group.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-foreground/60">No categories found</p>
            <Button variant="ghost" className="mt-4" onClick={() => openModal()}>
              Add Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Form Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Edit Category' : 'Add Category'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Category Name *"
            placeholder="e.g., Groceries"
            error={errors.name?.message}
            {...register('name')}
          />

          <Select
            label="Parent Category (Optional - leave empty for parent group)"
            options={parentCategories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="No parent (create root category group)"
            {...register('parent_id')}
          />

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Suggested Icons *</label>
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2 p-2 bg-card/60 border border-foreground/10 rounded-xl mb-3">
              {LUCIDE_ICONS_LIST.map((iconItem) => (
                <button
                  key={iconItem.name}
                  type="button"
                  onClick={() => setValue('icon', iconItem.name)}
                  className={`h-10 w-10 flex items-center justify-center rounded-lg border transition-all ${
                    watchIcon === iconItem.name ? 'bg-primary-500/10 border-primary-500 text-primary-500 ring-2 ring-primary-500/30' : 'hover:bg-foreground/5 border-foreground/10 text-foreground/75'
                  }`}
                  title={iconItem.label}
                >
                  <CategoryIcon iconName={iconItem.name} className="h-5 w-5" />
                </button>
              ))}
            </div>
            
            <label className="block text-sm font-medium text-foreground/80 mb-2">Or Choose Emojis</label>
            <div className="flex flex-wrap gap-2 p-2 bg-card/60 border border-foreground/10 rounded-xl">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setValue('icon', emoji)}
                  className={`h-10 w-10 flex items-center justify-center text-xl rounded-lg transition-all ${
                    watchIcon === emoji ? 'bg-primary-500/10 border-primary-500 ring-2 ring-primary-500/30' : 'hover:bg-foreground/5'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Color *</label>
            <div className="flex flex-wrap gap-2 p-2 bg-card/60 border border-foreground/10 rounded-xl">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    watchColor === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110 border-primary-500' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Monthly Budget (optional)"
            type="number"
            step="0.01"
            placeholder="e.g., 5000"
            leftIcon={<span className="text-foreground/45">₹</span>}
            {...register('monthly_limit', { valueAsNumber: true })}
          />

          <div className="flex items-center gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
