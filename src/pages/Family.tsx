import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilies, useFamilyMembers, useCreateFamily, useFamilyBudgets } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatDate, sanitizeName } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Plus, Users, Copy, Check, Mail, Send, UserPlus, Sparkles } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

const familySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  monthly_budget: z.number().optional().nullable(),
});

type FamilyFormData = z.infer<typeof familySchema>;

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function FamilyPage() {
  const { user } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [activeFamilyId, setActiveFamilyId] = React.useState<string | undefined>(undefined);
  const [copiedInviteCode, setCopiedInviteCode] = React.useState(false);

  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);

  const { data: members, isLoading: membersLoading } = useFamilyMembers(activeFamilyId);

  const createFamily = useCreateFamily();

  const familyForm = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: { name: '', monthly_budget: null },
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const onCreateFamily = async (data: FamilyFormData) => {
    try {
      const family = await createFamily.mutateAsync({
        name: data.name,
        owner_id: user!.id,
        monthly_budget: data.monthly_budget || null,
        currency_code: 'INR',
        is_active: true,
      });
      addNotification({ type: 'success', title: 'Family created', message: 'Your family group is ready!' });
      setIsCreateModalOpen(false);
      familyForm.reset();
      setActiveFamilyId(family.id);
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to create family' });
    }
  };

  const onSendInvite = async (data: InviteFormData) => {
    if (!activeFamilyId) return;

    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabase.from('family_invites').insert({
        family_id: activeFamilyId,
        invited_email: data.email,
        invited_by: user!.id,
        invite_token: token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      });

      addNotification({ type: 'success', title: 'Invite sent', message: `Invitation sent to ${data.email}` });
      setIsInviteModalOpen(false);
      inviteForm.reset();
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to send invite' });
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInviteCode(true);
    setTimeout(() => setCopiedInviteCode(false), 2000);
    addNotification({ type: 'success', title: 'Copied!', message: 'Invite code copied to clipboard' });
  };

  const currentFamily = families?.[0] || null;
  const { data: familyBudgets } = useFamilyBudgets(currentFamily?.id);
  const overallBudgetRecord = familyBudgets?.find((b) => b.category_id === null);
  const familyMonthlyBudget = overallBudgetRecord?.amount || 0;

  React.useEffect(() => {
    if (families && families.length > 0 && !activeFamilyId) {
      setActiveFamilyId(families[0].id);
    }
  }, [families, activeFamilyId]);

  if (!familiesLoading && families && families.length > 0) {
    return <Navigate to="/family/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <TextReveal
            text="Family"
            subtitle="Manage family groups and shared expenses"
            textSize="text-2xl"
          />
        </div>
        {!currentFamily && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateModalOpen(true)}>
            Create Family
          </Button>
        )}
      </div>

      {familiesLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-8 bg-slate-200 rounded w-48" />
            </div>
          </CardContent>
        </Card>
      ) : currentFamily ? (
        <>
          {/* Family Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-600" />
                {currentFamily.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 rounded-lg">
                  <span className="text-xs text-foreground/60">Invite code:</span>
                  <span className="text-sm font-mono font-medium text-foreground/80">
                    {currentFamily.invite_code}
                  </span>
                  <IconButton size="sm" onClick={() => copyInviteCode(currentFamily.invite_code || '')}>
                    {copiedInviteCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </IconButton>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-foreground/60">Monthly Budget</p>
                  <p className="text-2xl font-bold text-foreground">
                    {familyMonthlyBudget ? formatCurrency(familyMonthlyBudget) : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60">Family Members</p>
                  <p className="text-2xl font-bold text-foreground">{members?.length || 1}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60">Created</p>
                  <p className="text-lg font-semibold text-foreground/85">
                    {formatDate(currentFamily.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Members</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => setIsInviteModalOpen(true)}
              >
                Invite
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {membersLoading ? (
                <div className="p-6">
                  <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-foreground/10 rounded" />
                    ))}
                  </div>
                </div>
              ) : members && members.length > 0 ? (
                <div className="divide-y divide-foreground/5">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                      {member.profile_id === user?.id ? (
                        <Link to="/settings" className="h-10 w-10 rounded-full bg-primary-500/10 hover:bg-primary-500/20 flex items-center justify-center text-primary-500 font-semibold transition-all hover:scale-105 shadow-sm block">
                          <span className="flex items-center justify-center h-full w-full">
                            {sanitizeName(member.profile?.full_name).charAt(0).toUpperCase() || member.profile?.email?.charAt(0).toUpperCase()}
                          </span>
                        </Link>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-semibold">
                          {sanitizeName(member.profile?.full_name).charAt(0).toUpperCase() || member.profile?.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {sanitizeName(member.profile?.full_name) || 'Unknown'}
                          {member.profile_id === user?.id && (
                            <span className="ml-2 text-xs text-primary-500">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-foreground/60">{member.profile?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            member.member_role === 'admin'
                              ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                              : 'bg-foreground/5 text-foreground/80'
                          }`}
                        >
                          {member.member_role}
                        </span>
                        <span className="text-xs text-foreground/50">
                          Joined {formatDate(member.joined_at, 'short')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-foreground/60">
                  No members found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invites */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-foreground/60">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending invites</p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto py-12">
          {/* Create Family Card */}
          <Card className="relative overflow-hidden border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-glass flex flex-col justify-between group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
            <CardContent className="p-8 text-center flex flex-col items-center justify-center flex-1">
              <Users className="h-12 w-12 text-purple-500 mb-4 group-hover:scale-105 transition-transform" />
              <h3 className="text-lg font-bold text-foreground mb-2">Create Family</h3>
              <p className="text-sm text-foreground/60 mb-6">
                Start a new family group, set budget ceilings, and invite your loved ones to track expenses together.
              </p>
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateModalOpen(true)} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 text-white shadow-md">
                Create Group
              </Button>
            </CardContent>
          </Card>

          {/* Join Family Card */}
          <Card className="relative overflow-hidden border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-glass flex flex-col justify-between group">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-blue-500" />
            <CardContent className="p-8 text-center flex flex-col items-center justify-center flex-1">
              <Sparkles className="h-12 w-12 text-indigo-500 mb-4 group-hover:scale-105 transition-transform" />
              <h3 className="text-lg font-bold text-foreground mb-2">Join Family</h3>
              <p className="text-sm text-foreground/60 mb-6">
                Have an invite code or email invite link? Join an existing family group to instantly see shared budgets and log expenses.
              </p>
              <Link to="/family/join" className="w-full">
                <Button variant="secondary" className="w-full border border-foreground/10 hover:bg-foreground/5 shadow-sm">
                  Join Group
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Family Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Family"
        size="md"
      >
        <form onSubmit={familyForm.handleSubmit(onCreateFamily)} className="space-y-4">
          <Input
            label="Family Name *"
            placeholder="e.g., Sharma Family"
            error={familyForm.formState.errors.name?.message}
            {...familyForm.register('name')}
          />
          <Input
            label="Monthly Budget (optional)"
            type="number"
            step="0.01"
            placeholder="e.g., 50000"
            leftIcon={<span className="text-foreground/45">₹</span>}
            {...familyForm.register('monthly_budget', { valueAsNumber: true })}
          />
          <div className="flex items-center gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={familyForm.formState.isSubmitting}>
              Create Family
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Family Member"
        size="md"
      >
        <form onSubmit={inviteForm.handleSubmit(onSendInvite)} className="space-y-4">
          <Input
            label="Email Address *"
            type="email"
            placeholder="family@example.com"
            error={inviteForm.formState.errors.email?.message}
            leftIcon={<Mail className="h-4 w-4" />}
            {...inviteForm.register('email')}
          />
          <p className="text-sm text-foreground/60">
            The invite will expire in 7 days. They can also join using the invite code: <strong>{currentFamily?.invite_code}</strong>
          </p>
          <div className="flex items-center gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteForm.formState.isSubmitting}>
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
