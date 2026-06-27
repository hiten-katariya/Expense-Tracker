import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useFamilies, useFamilyInvites, useAcceptInvite, useDeclineInvite, useFamilyMembers } from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { formatDate } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { Mail, CheckCircle2, XCircle, Clock, Plus, Loader2, Users, Crown, Copy, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { familiesApi } from '@/api/families';
import { motion } from 'framer-motion';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function FamilyInvitesPage() {
  const { user } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);

  const handleCopyInviteCode = () => {
    if (!activeFamily?.invite_code) return;
    navigator.clipboard.writeText(activeFamily.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.success('Invite code copied to clipboard');
  };

  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const activeFamily = families?.[0];
  const familyId = activeFamily?.id;

  const { data: invites, isLoading: invitesLoading } = useFamilyInvites(familyId);
  const { data: members } = useFamilyMembers(familyId);

  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  // Query invite details by token (if present in search query)
  const { data: tokenInvite, isLoading: tokenInviteLoading, error: tokenInviteError } = useQuery({
    queryKey: ['family-invite-token', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('family_invites')
        .select('*, family:families(*)')
        .eq('invite_token', token)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const onSendInvite = async (data: InviteFormData) => {
    if (!familyId) return;

    const toastId = toast.loading('Sending invitation...');
    try {
      await familiesApi.inviteMember({
        familyId,
        email: data.email.trim().toLowerCase(),
        role: 'member',
      });
      toast.success('Invitation sent successfully!', { id: toastId });
      addNotification({ type: 'success', title: 'Invite Sent', message: `Invitation sent to ${data.email}` });
      setIsInviteModalOpen(false);
      inviteForm.reset();
      // Invalidate invites query to refresh list
      await supabase.from('family_invites').select('*'); // quick client-side trigger/wait
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to send invite', { id: toastId });
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;

    const toastId = toast.loading('Accepting invitation...');
    try {
      await acceptInvite.mutateAsync(token);
      toast.success('Welcome to the family group!', { id: toastId });
      addNotification({ type: 'success', title: 'Joined Family', message: 'You have successfully joined the family group!' });
      navigate('/family/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept invitation', { id: toastId });
    }
  };

  const handleDeclineInvite = async () => {
    if (!token) return;

    const toastId = toast.loading('Declining invitation...');
    try {
      await declineInvite.mutateAsync(token);
      toast.success('Invitation declined', { id: toastId });
      addNotification({ type: 'success', title: 'Decline invite', message: 'Invitation was declined.' });
      navigate('/family');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline invitation', { id: toastId });
    }
  };

  // ── Mode 1: Resolving Token Invitation ──
  if (token) {
    if (tokenInviteLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      );
    }

    if (tokenInviteError || !tokenInvite) {
      return (
        <Card className="max-w-md mx-auto py-8 text-center mt-12">
          <CardContent>
            <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground">Invalid or Expired Invite</h2>
            <p className="text-sm text-foreground/60 mt-1 mb-6">
              This invitation token is invalid, has expired, or was already accepted/declined.
            </p>
            <Button onClick={() => navigate('/family')}>Go to Family Setup</Button>
          </CardContent>
        </Card>
      );
    }

    const isExpired = new Date(tokenInvite.expires_at) < new Date();
    if (isExpired) {
      return (
        <Card className="max-w-md mx-auto py-8 text-center mt-12">
          <CardContent>
            <Clock className="h-14 w-14 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground">Invitation Expired</h2>
            <p className="text-sm text-foreground/60 mt-1 mb-6">
              This invitation expired on {new Date(tokenInvite.expires_at).toLocaleString()}.
            </p>
            <Button onClick={() => navigate('/family')}>Go to Family Setup</Button>
          </CardContent>
        </Card>
      );
    }

    if (tokenInvite.status !== 'pending') {
      return (
        <Card className="max-w-md mx-auto py-8 text-center mt-12">
          <CardContent>
            <CheckCircle2 className="h-14 w-14 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground">Already Processed</h2>
            <p className="text-sm text-foreground/60 mt-1 mb-6">
              This invitation has already been {tokenInvite.status}.
            </p>
            <Button onClick={() => navigate('/family/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="max-w-md mx-auto mt-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-transparent">
            <CardHeader className="text-center pb-2">
              <CrownIcon className="h-12 w-12 text-purple-600 mx-auto mb-2 animate-bounce" />
              <CardTitle className="text-xl">Family Invitation</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center space-y-6">
              <p className="text-sm text-foreground/80 leading-relaxed">
                You have been invited to join the shared family hub <strong className="text-purple-600 dark:text-purple-400">{tokenInvite.family?.name}</strong> to manage shared expenses, track budgets, and receive monthly reports.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button variant="secondary" className="w-full sm:w-auto" onClick={handleDeclineInvite}>
                  Decline Invite
                </Button>
                <Button className="w-full sm:w-auto shadow-[0_0_20px_rgba(139,92,246,0.3)] bg-purple-600 hover:bg-purple-700 text-white" onClick={handleAcceptInvite}>
                  Accept & Join
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Mode 2: Standard Invite Dashboard (Owner/Admin) ──
  if (familiesLoading || invitesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!activeFamily) {
    return (
      <Card className="py-12 text-center max-w-lg mx-auto">
        <CardContent>
          <UsersIcon className="h-16 w-16 mx-auto text-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground">No active family</h2>
          <p className="text-sm text-foreground/60 mt-1 mb-6">
            Join or create a family group first in order to view invitations.
          </p>
          <Button onClick={() => navigate('/family')}>Go to Family Setup</Button>
        </CardContent>
      </Card>
    );
  }

  const userRole = members?.find((m) => m.profile_id === user?.id)?.member_role;
  const canInvite = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <TextReveal
            text="Family Invitations"
            subtitle="Invite family members to join and collaborate"
            textSize="text-2xl"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {activeFamily?.invite_code && (
            <div className="flex items-center gap-2 bg-foreground/5 px-3 py-1.5 rounded-xl border border-foreground/10">
              <span className="text-[10px] text-foreground/50 font-mono">Invite Code:</span>
              <span className="text-xs font-mono font-bold text-foreground/80">{activeFamily.invite_code}</span>
              <button
                onClick={handleCopyInviteCode}
                className="p-1 hover:bg-foreground/10 rounded transition-colors text-foreground/60"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
          {canInvite && (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsInviteModalOpen(true)}
            >
              Invite Member
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary-500" />
            Sent Invitations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invites && invites.length > 0 ? (
            <div className="divide-y divide-foreground/5">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground/60 shrink-0">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{invite.email}</p>
                    <p className="text-xs text-foreground/45 flex items-center gap-2 mt-0.5">
                      <span>Sent {formatDate(invite.created_at)}</span>
                      <span>•</span>
                      <span>Expires {formatDate(invite.expires_at, 'short')}</span>
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        invite.status === 'pending'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : invite.status === 'accepted'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {invite.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-foreground/50 space-y-4">
              <Mail className="h-10 w-10 text-foreground/25 mx-auto" />
              <p className="text-xs">No invitations have been sent yet.</p>
              {canInvite && (
                <Button variant="ghost" size="sm" onClick={() => setIsInviteModalOpen(true)}>
                  Send First Invite
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
          <p className="text-xs text-foreground/50 leading-relaxed">
            The member will receive a premium HTML invitation email via Resend with a secure accept URL. The link remains valid for <strong>7 days</strong>.
          </p>
          <div className="flex items-center gap-3 pt-4 justify-end">
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

// Icon fallbacks to avoid styling errors
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Users {...props} />;
}
function CrownIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Crown {...props} />;
}
