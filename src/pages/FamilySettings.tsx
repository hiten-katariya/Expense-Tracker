import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  useFamilies,
  useFamilyMembers,
  useUpdateFamily,
  useDeleteFamily,
  useFamilyBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget
} from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Users, Trash2, Shield, Lock, Copy, Check, Users2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CURRENCIES } from '@/types';

const familyUpdateSchema = z.object({
  name: z.string().min(2, 'Family name must be at least 2 characters'),
  monthly_budget: z.number().nullable().optional(),
  currency_code: z.string().default('INR'),
});

type FamilyUpdateFormData = z.infer<typeof familyUpdateSchema>;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

function SettingRow({
  icon, title, description, action, danger = false,
}: {
  icon: React.ReactNode; title: string; description?: string; action: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-5 rounded-xl transition-colors', danger ? 'hover:bg-red-500/[0.02]' : 'hover:bg-foreground/[0.02]')}>
      <div className="flex items-center gap-3.5">
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', danger ? 'bg-red-500/10' : 'bg-foreground/5')}>
          <span className={danger ? 'text-red-500' : 'text-foreground/60'}>{icon}</span>
        </div>
        <div>
          <p className={cn('text-sm font-semibold', danger ? 'text-red-500' : 'text-foreground')}>{title}</p>
          {description && <p className="text-xs text-foreground/50 mt-0.5 max-w-sm">{description}</p>}
        </div>
      </div>
      <div className="sm:shrink-0">{action}</div>
    </div>
  );
}

function SectionCard({ title, icon, description, children, delay = 0, danger = false }: {
  title: string; icon: React.ReactNode; description?: string; children: React.ReactNode; delay?: number; danger?: boolean;
}) {
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className={cn(
        'rounded-2xl border backdrop-blur-xl overflow-hidden',
        danger
          ? 'border-red-500/20 bg-red-500/[0.02]'
          : 'border-foreground/10 bg-white/50 dark:bg-white/[0.025] shadow-glass'
      )}
    >
      <div className={cn('px-6 py-5 border-b', danger ? 'border-red-500/10' : 'border-foreground/5')}>
        <div className="flex items-center gap-3">
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', danger ? 'bg-red-500/10' : 'bg-primary-500/10')}>
            <span className={danger ? 'text-red-500' : 'text-primary-500'}>{icon}</span>
          </div>
          <div>
            <h3 className={cn('font-bold text-sm', danger ? 'text-red-500' : 'text-foreground')}>{title}</h3>
            {description && <p className="text-xs text-foreground/50 mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      <div className="divide-y divide-foreground/5">{children}</div>
    </motion.div>
  );
}

export function FamilySettingsPage() {
  const { user } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);
  const navigate = useNavigate();

  // States
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  // Active Family Hook
  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  // Family Members Hook
  const { data: members, isLoading: membersLoading } = useFamilyMembers(familyId);
  const currentMember = members?.find((m) => m.profile_id === user?.id);
  const isOwner = currentMember?.member_role === 'owner';
  const isAdmin = currentMember?.member_role === 'admin';
  const canManage = isOwner || isAdmin;

  // Fetch Family Budgets to get Overall budget directly
  const { data: familyBudgets } = useFamilyBudgets(familyId);
  const overallBudgetRecord = familyBudgets?.find((b) => b.category_id === null);

  // Mutations
  const updateFamily = useUpdateFamily();
  const deleteFamily = useDeleteFamily();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FamilyUpdateFormData>({
    resolver: zodResolver(familyUpdateSchema),
  });

  // Populate form defaults when family loaded
  useEffect(() => {
    if (activeFamily) {
      setValue('name', activeFamily.name);
      setValue('currency_code', activeFamily.currency_code || 'INR');
    }
  }, [activeFamily, setValue]);

  // Populate budget amount when budget record loaded
  useEffect(() => {
    if (familyBudgets !== undefined) {
      const overall = familyBudgets.find((b) => b.category_id === null);
      setValue('monthly_budget', overall ? overall.amount : null);
    }
  }, [familyBudgets, setValue]);

  const onUpdateDetails = async (data: FamilyUpdateFormData) => {
    if (!familyId) return;
    const toastId = toast.loading('Saving changes...');
    try {
      // 1. Update family info
      await updateFamily.mutateAsync({
        id: familyId,
        updates: {
          name: data.name,
          currency_code: data.currency_code,
        },
      });

      // 2. Update overall budget directly in budgets table
      const amountNum = data.monthly_budget || null;
      if (amountNum !== null) {
        if (overallBudgetRecord) {
          await updateBudget.mutateAsync({
            id: overallBudgetRecord.id,
            updates: { amount: amountNum },
          });
        } else {
          await createBudget.mutateAsync({
            amount: amountNum,
            category_id: null,
            budget_type: 'monthly',
            workspace_id: null,
            family_id: familyId,
            currency_code: data.currency_code || 'INR',
            starts_on: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            name: 'Overall Family Budget',
            notes: 'Configured from family settings',
            scope: 'family',
          });
        }
      } else if (overallBudgetRecord) {
        await deleteBudget.mutateAsync({ id: overallBudgetRecord.id, workspaceId: '' });
      }

      toast.success('Family settings updated successfully', { id: toastId });
      addNotification({ type: 'success', title: 'Settings Saved', message: 'Family settings have been updated.' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update settings', { id: toastId });
    }
  };

  const handleCopyInviteCode = () => {
    if (!activeFamily?.invite_code) return;
    navigator.clipboard.writeText(activeFamily.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success('Invite code copied to clipboard');
  };

  const handleDeleteFamily = async () => {
    if (!activeFamily) return;

    if (confirmName.trim().toLowerCase() !== activeFamily.name.trim().toLowerCase()) {
      toast.error('The typed family name does not match.');
      return;
    }

    const toastId = toast.loading('Disbanding family group...');
    try {
      // 1. Send warning/alert notifications to other members before cascades delete them
      const otherMembers = (members || []).filter((m) => m.profile_id !== user?.id);
      if (otherMembers.length > 0) {
        const notifications = otherMembers.map((m) => ({
          workspace_id: null,
          user_id: m.profile_id,
          type: 'family_invite' as const,
          title: 'Family Group Disbanded',
          message: `The family group "${activeFamily.name}" has been deleted by the owner.`,
          entity_type: 'family',
          entity_id: activeFamily.id,
          is_read: false,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      // 2. Cascade delete family in DB
      await deleteFamily.mutateAsync(activeFamily.id);

      toast.success('Family group deleted successfully', { id: toastId });
      addNotification({ type: 'success', title: 'Family Disbanded', message: `Family group "${activeFamily.name}" was deleted.` });
      setIsDeleteModalOpen(false);
      setConfirmName('');
      navigate('/family');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete family group', { id: toastId });
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
            Join or create a family group first in order to manage family settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="mb-2">
        <TextReveal
          text="Family Settings"
          subtitle="Configure profile parameters, limits, and settings"
          textSize="text-3xl"
        />
      </div>

      {/* Family Info Panel */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="rounded-2xl border border-foreground/10 bg-white/50 dark:bg-white/[0.025] backdrop-blur-xl shadow-glass overflow-hidden"
      >
        <div className="h-16 bg-gradient-to-r from-purple-500/20 via-purple-600/15 to-transparent relative overflow-hidden" />
        <div className="px-6 pb-6 -mt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg border-2 border-background">
              {activeFamily.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground flex items-center gap-2">
                {activeFamily.name}
              </p>
              <p className="text-xs text-foreground/50">Family Settings Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-foreground/5 px-3 py-1.5 rounded-xl border border-foreground/10 self-start sm:self-auto">
            <span className="text-[10px] text-foreground/50 font-mono">Invite Code:</span>
            <span className="text-xs font-mono font-bold text-foreground/80">{activeFamily.invite_code}</span>
            <button
              onClick={handleCopyInviteCode}
              className="p-1 hover:bg-foreground/10 rounded transition-colors text-foreground/60"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Update Form (only editable by Owner/Admin) */}
      <SectionCard
        title="Family Parameters"
        icon={<Users2 className="h-4 w-4" />}
        description={canManage ? 'Configure details and budgets' : 'View family profile parameters'}
        delay={1}
      >
        <div className="p-6">
          <form onSubmit={handleSubmit(onUpdateDetails)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Family Name"
                placeholder="e.g., Sharma Family"
                error={errors.name?.message}
                disabled={!canManage}
                {...register('name')}
              />
              <Input
                label="Overall Monthly Budget"
                type="number"
                step="0.01"
                placeholder="Not set"
                error={errors.monthly_budget?.message}
                disabled={!canManage}
                leftIcon={<span className="text-foreground/45">₹</span>}
                {...register('monthly_budget', { valueAsNumber: true })}
              />
            </div>

            <Select
              label="Default Currency"
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.name} (${c.code})` }))}
              disabled={!canManage}
              {...register('currency_code')}
            />

            {canManage ? (
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={!isDirty || isSubmitting} isLoading={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-foreground/5 text-foreground/50 text-xs">
                <Lock className="h-3.5 w-3.5" />
                <span>You do not have permissions to modify family details.</span>
              </div>
            )}
          </form>
        </div>
      </SectionCard>

      {/* Danger Zone (Disband family) - Only visible/accessible by Owner */}
      {isOwner && (
        <SectionCard
          title="Danger Zone"
          icon={<Trash2 className="h-4 w-4" />}
          description="Irreversible actions that disband the family"
          delay={2}
          danger
        >
          <SettingRow
            icon={<Trash2 className="h-4 w-4" />}
            title="Delete Family Group"
            description="Permanently disband the family, deleting all members, shared budgets, and logged family expenses. This cannot be undone."
            action={
              <Button size="sm" variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                Disband Family
              </Button>
            }
            danger
          />
        </SectionCard>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConfirmName('');
        }}
        title="Disband Family Group?"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-start gap-2.5">
            <Shield className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              <strong>Critical Warning:</strong> Disbanding the family will cascade delete all shared budgets and expenses, and notify all family members. This action is permanent and cannot be undone.
            </p>
          </div>

          <p className="text-xs text-foreground/70">
            Please type the name of the family group <strong>{activeFamily.name}</strong> to confirm:
          </p>

          <Input
            placeholder="Type family name exactly..."
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-4 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setConfirmName('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmName.trim().toLowerCase() !== activeFamily.name.trim().toLowerCase()}
              onClick={handleDeleteFamily}
              isLoading={deleteFamily.isPending}
            >
              Confirm Disband
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
