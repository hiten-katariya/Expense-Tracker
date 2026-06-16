import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilies, useFamilyMembers, useCreateFamily } from '@/hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Plus, Users, Copy, Check, Mail, Send, UserPlus } from 'lucide-react';

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

  React.useEffect(() => {
    if (families && families.length > 0 && !activeFamilyId) {
      setActiveFamilyId(families[0].id);
    }
  }, [families, activeFamilyId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family</h1>
          <p className="text-slate-500">Manage family groups and shared expenses</p>
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
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <span className="text-xs text-slate-500">Invite code:</span>
                  <span className="text-sm font-mono font-medium text-slate-700">
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
                  <p className="text-sm text-slate-500">Monthly Budget</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {currentFamily.monthly_budget ? formatCurrency(currentFamily.monthly_budget) : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Family Members</p>
                  <p className="text-2xl font-bold text-slate-900">{members?.length || 1}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Created</p>
                  <p className="text-lg font-semibold text-slate-700">
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
                      <div key={i} className="h-12 bg-slate-200 rounded" />
                    ))}
                  </div>
                </div>
              ) : members && members.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
                        {member.profile?.full_name?.charAt(0).toUpperCase() || member.profile?.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {member.profile?.full_name || 'Unknown'}
                          {member.profile_id === user?.id && (
                            <span className="ml-2 text-xs text-primary-600">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{member.profile?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            member.member_role === 'admin'
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {member.member_role}
                        </span>
                        <span className="text-xs text-slate-400">
                          Joined {formatDate(member.joined_at, 'short')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
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
              <div className="py-8 text-center text-slate-500">
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
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <p className="text-lg text-slate-700">No family group yet</p>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Create a family group to share expenses with your loved ones
            </p>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateModalOpen(true)}>
              Create Family
            </Button>
          </CardContent>
        </Card>
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
            leftIcon={<span className="text-slate-400">₹</span>}
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
          <p className="text-sm text-slate-500">
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
