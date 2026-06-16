import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useQueries';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { CategoryCardSkeleton } from '@/components/Skeleton';
import { formatCurrency } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, CreditCard as Edit2, Trash2 } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().min(1, 'Color is required'),
  monthly_limit: z.number().optional().nullable(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const EMOJI_OPTIONS = ['🍔', '🚗', '🏠', '💊', '🎬', '🛒', '📚', '💡', '📦', '✈️', '🎮', '🎵', '🏋️', '👔', '💇', '📱', '🎁', '🌸', '☕', '🍕'];
const COLOR_OPTIONS = ['#E74C3C', '#3498DB', '#9B59B6', '#27AE60', '#E67E22', '#1ABC9C', '#34495E', '#F39C12', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];

export function CategoriesPage() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<string | null>(null);

  const { data: categories, isLoading } = useCategories(workspaceId);
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
      icon: '📦',
      color: '#95A5A6',
    },
  });

  const watchColor = watch('color');
  const watchIcon = watch('icon');

  const openModal = (categoryId?: string) => {
    if (categoryId) {
      const category = categories?.find((c) => c.id === categoryId);
      if (category) {
        setValue('name', category.name);
        setValue('icon', category.icon || '📦');
        setValue('color', category.color || '#95A5A6');
        setValue('monthly_limit', category.monthly_limit);
        setEditingCategory(categoryId);
      }
    } else {
      reset();
      setEditingCategory(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
    setEditingCategory(null);
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      const payload = {
        name: data.name,
        icon: data.icon,
        color: data.color,
        monthly_limit: data.monthly_limit || null,
        workspace_id: workspaceId!,
        is_default: false,
      };

      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory, updates: payload });
        addNotification({ type: 'success', title: 'Category updated', message: 'Changes saved successfully.' });
      } else {
        await createCategory.mutateAsync(payload);
        addNotification({ type: 'success', title: 'Category created', message: 'New category has been added.' });
      }
      closeModal();
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to save category' });
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? Expenses in this category will be uncategorized.')) return;
    try {
      await deleteCategory.mutateAsync({ id: categoryId, workspaceId: workspaceId! });
      addNotification({ type: 'success', title: 'Category deleted', message: 'Category has been removed.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete category' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500">Manage your expense categories and budgets</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Card key={category.id} hoverable>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: category.color || '#95A5A6' }}
                    >
                      {category.icon || '📦'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{category.name}</h3>
                      {category.monthly_limit && (
                        <p className="text-xs text-slate-500">
                          Budget: {formatCurrency(category.monthly_limit)}
                        </p>
                      )}
                    </div>
                  </div>
                  {!category.is_default && (
                    <div className="flex items-center gap-1">
                      <IconButton size="sm" onClick={() => openModal(category.id)}>
                        <Edit2 className="h-4 w-4" />
                      </IconButton>
                      <IconButton size="sm" variant="danger" onClick={() => handleDelete(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  )}
                </div>

                {category.monthly_limit && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Monthly Budget</span>
                      <span>0%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: '0%' }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Spending data will appear here after expenses are added
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-500">No categories found</p>
            <Button variant="ghost" className="mt-4" onClick={() => openModal()}>
              Add Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Form Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Edit Category' : 'Add Category'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Category Name *"
            placeholder="e.g., Groceries"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Icon *</label>
            <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-300 rounded-lg">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setValue('icon', emoji)}
                  className={`h-10 w-10 flex items-center justify-center text-xl rounded-lg transition-all ${
                    watchIcon === emoji ? 'bg-primary-100 ring-2 ring-primary-500' : 'hover:bg-slate-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Color *</label>
            <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-300 rounded-lg">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`h-10 w-10 rounded-lg transition-all ${
                    watchColor === color ? 'ring-2 ring-offset-2 ring-primary-500' : ''
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {watchIcon}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Monthly Budget (optional)"
            type="number"
            step="0.01"
            placeholder="e.g., 5000"
            leftIcon={<span className="text-slate-400">₹</span>}
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
