import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilies, useFamilyMembers, useRemoveFamilyMember, useTransferOwnership, useLeaveFamily } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Select } from '@/components/Input';
import { formatDate, sanitizeName } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { Users, UserMinus, ShieldAlert, LogOut, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SafeAvatar } from '@/components/Avatar';
import { FamilyMemberSkeleton } from '@/components/Skeleton';

export function FamilyMembersPage() {
  const { user } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);
  const navigate = useNavigate();

  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [targetOwnerId, setTargetOwnerId] = React.useState('');

  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  const { data: members, isLoading: membersLoading } = useFamilyMembers(familyId);

  const removeMember = useRemoveFamilyMember(familyId || '');
  const transferOwnership = useTransferOwnership(familyId || '');
  const leaveFamily = useLeaveFamily();

  if (familiesLoading || membersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-white/5 animate-pulse rounded" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-white/5 animate-pulse rounded" />
          </div>
        </div>

        <div className="bg-white/60 dark:bg-white/[0.02] rounded-2xl border border-foreground/10 p-6 space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <FamilyMemberSkeleton key={i} />
          ))}
        </div>
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
            Join or create a family group first in order to view family members.
          </p>
          <Button onClick={() => navigate('/family')}>Go to Family Setup</Button>
        </CardContent>
      </Card>
    );
  }

  const currentMember = members?.find((m) => m.profile_id === user?.id);
  const isOwner = currentMember?.member_role === 'owner';
  const isAdmin = currentMember?.member_role === 'admin';

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the family?`)) return;

    const toastId = toast.loading('Removing member...');
    try {
      await removeMember.mutateAsync(memberId);
      toast.success('Member removed successfully', { id: toastId });
      addNotification({ type: 'success', title: 'Member removed', message: `${memberName} has been removed from the family.` });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove member', { id: toastId });
    }
  };

  const handleLeaveFamily = async () => {
    if (isOwner) {
      toast.error('As the owner, you cannot leave the family until you transfer ownership to someone else.');
      return;
    }

    if (!window.confirm('Are you sure you want to leave the family group? You will lose access to all shared expenses and budgets.')) return;

    const toastId = toast.loading('Leaving family...');
    try {
      await leaveFamily.mutateAsync(activeFamily.id);
      toast.success('You have left the family', { id: toastId });
      addNotification({ type: 'success', title: 'Left family', message: 'You successfully left the family group.' });
      navigate('/family');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to leave family', { id: toastId });
    }
  };

  const handleTransferOwnership = async () => {
    if (!targetOwnerId) {
      toast.error('Please select a member to transfer ownership to.');
      return;
    }

    const newOwnerName = sanitizeName(members?.find((m) => m.profile_id === targetOwnerId)?.profile?.full_name) || 'selected member';
    if (!window.confirm(`Are you sure you want to transfer family ownership to ${newOwnerName}? You will be demoted to Admin.`)) return;

    const toastId = toast.loading('Transferring ownership...');
    try {
      await transferOwnership.mutateAsync(targetOwnerId);
      toast.success('Ownership transferred successfully!', { id: toastId });
      addNotification({ type: 'success', title: 'Ownership Transferred', message: `Ownership of the family has been transferred to ${newOwnerName}.` });
      setIsTransferModalOpen(false);
      setTargetOwnerId('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to transfer ownership', { id: toastId });
    }
  };

  // Filter list of potential new owners (all members excluding currently authenticated user)
  const transferOptions = (members || [])
    .filter((m) => m.profile_id !== user?.id)
    .map((m) => ({
      value: m.profile_id,
      label: sanitizeName(m.profile?.full_name) || m.profile?.email || 'Unknown Member',
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <TextReveal
            text="Family Members"
            subtitle="Manage roles, permissions, and group membership"
            textSize="text-2xl"
          />
        </div>
        <div className="flex items-center gap-3">
          {isOwner && transferOptions.length > 0 && (
            <Button
              variant="secondary"
              leftIcon={<Crown className="h-4 w-4" />}
              onClick={() => setIsTransferModalOpen(true)}
            >
              Transfer Ownership
            </Button>
          )}
          {!isOwner && (
            <Button
              variant="danger"
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={handleLeaveFamily}
            >
              Leave Family
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            Active Members ({members?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members && members.length > 0 ? (
            <div className="divide-y divide-foreground/5">
              {members.map((member) => {
                const isMemberSelf = member.profile_id === user?.id;
                const targetIsOwner = member.member_role === 'owner';
                const targetIsAdmin = member.member_role === 'admin';

                // Check permissions matrix rules for displaying "Remove" button
                // Owners can remove anyone (except self)
                // Admins can remove standard members (cannot remove owners or other admins)
                // Members cannot remove anyone
                let canRemove = false;
                if (!isMemberSelf) {
                  if (isOwner) {
                    canRemove = true;
                  } else if (isAdmin && !targetIsOwner && !targetIsAdmin) {
                    canRemove = true;
                  }
                }

                const displayName = sanitizeName(member.profile?.full_name) || member.profile?.email?.split('@')[0] || `Member (${member.profile_id.substring(0, 8)})`;
                const email = member.profile?.email || 'No email provided';
                const avatarUrl = member.profile?.avatar_url;

                return (
                  <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-foreground/[0.01]">
                    <SafeAvatar src={avatarUrl} className="h-10 w-10" />
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {displayName}
                        {isMemberSelf && (
                          <span className="ml-2 text-xs text-primary-500 font-medium">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-foreground/50 truncate">{email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          targetIsOwner
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : targetIsAdmin
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {targetIsOwner && <Crown className="h-2.5 w-2.5" />}
                        {member.member_role}
                      </span>
                      <span className="text-xs text-foreground/45 hidden md:inline">
                        Joined {formatDate(member.joined_at, 'short')}
                      </span>
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(member.profile_id, displayName)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                          title="Remove Member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-foreground/50">
              No family members found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Ownership Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Family Ownership"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              <strong>Warning:</strong> Transferring ownership is irreversible. You will lose owner rights and be demoted to an <strong>Admin</strong>. The new owner will have full control including deleting the family.
            </p>
          </div>

          <Select
            label="Select New Owner"
            value={targetOwnerId}
            options={[
              { value: '', label: 'Select a member...' },
              ...transferOptions,
            ]}
            onChange={(e) => setTargetOwnerId(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-4 justify-end">
            <Button variant="secondary" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!targetOwnerId}
              onClick={handleTransferOwnership}
            >
              Transfer Ownership
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
