import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useJoinFamilyByCode, useAcceptInvite, useFamilies } from '@/hooks/useQueries';
import { useUIStore } from '@/stores/uiStore';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Users, MailOpen, LockOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function FamilyJoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { user } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);

  // Queries/Mutations
  const { data: families, isLoading: familiesLoading } = useFamilies(user?.id);
  const joinByCode = useJoinFamilyByCode();
  const acceptInvite = useAcceptInvite();

  // Local state
  const [inviteCode, setInviteCode] = useState('');
  const [inviteDetails, setInviteDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [acceptingToken, setAcceptingToken] = useState(false);

  // If already in a family, redirect to dashboard
  useEffect(() => {
    if (!familiesLoading && families && families.length > 0) {
      navigate('/family/dashboard', { replace: true });
    }
  }, [families, familiesLoading, navigate]);

  // Fetch token details if URL contains it
  useEffect(() => {
    if (token) {
      const fetchInviteDetails = async () => {
        setLoadingDetails(true);
        try {
          const { data, error } = await supabase
            .from('family_invites')
            .select('*, family:families(name)')
            .eq('invite_token', token)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setInviteDetails(data);
          } else {
            toast.error('Invitation link not found or invalid.');
          }
        } catch (err) {
          console.error('Error fetching invite details:', err);
          toast.error('Failed to load invitation details.');
        } finally {
          setLoadingDetails(false);
        }
      };
      fetchInviteDetails();
    }
  }, [token]);

  const handleJoinByCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode || inviteCode.trim().length < 4) {
      toast.error('Please enter a valid invite code.');
      return;
    }

    const toastId = toast.loading('Joining family group...');
    try {
      await joinByCode.mutateAsync(inviteCode.trim());
      toast.success('🎉 Successfully joined family!', {
        id: toastId,
        description: 'Welcome to your shared family workspace!'
      });
      addNotification({ type: 'success', title: 'Joined Family', message: 'You have joined a new family workspace.' });
      navigate('/family/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Invalid or expired invite code', {
        id: toastId,
      });
    }
  };

  const handleAcceptInviteToken = async () => {
    if (!token) return;
    setAcceptingToken(true);
    const toastId = toast.loading('Accepting invitation...');
    try {
      await acceptInvite.mutateAsync(token);
      toast.success('🎉 Welcome to the family!', {
        id: toastId,
        description: 'Invitation accepted successfully.'
      });
      addNotification({ type: 'success', title: 'Joined Family', message: 'You accepted the invitation and joined the family workspace.' });
      navigate('/family/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept invitation. It may be expired or sent to a different email.', {
        id: toastId,
      });
    } finally {
      setAcceptingToken(false);
    }
  };

  if (familiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg text-white">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-foreground tracking-tight">
            Family Workspace
          </h2>
          <p className="mt-2 text-sm text-foreground/60">
            Share expenses, track budgets, and manage files together
          </p>
        </div>

        {token ? (
          /* Invite Link Flow */
          <Card className="border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-glass overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <CardHeader>
              <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
                <MailOpen className="h-5 w-5 text-purple-500" />
                Invitation Received
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              {loadingDetails ? (
                <div className="animate-pulse space-y-3 py-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mx-auto" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto" />
                </div>
              ) : inviteDetails ? (
                <>
                  <p className="text-sm text-foreground/75 leading-relaxed">
                    You have been invited to join the{' '}
                    <strong className="text-purple-500 dark:text-purple-400">
                      {inviteDetails.family?.name || 'Shared'}
                    </strong>{' '}
                    family group!
                  </p>
                  <div className="pt-2">
                    <Button
                      onClick={handleAcceptInviteToken}
                      isLoading={acceptingToken}
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 shadow-lg text-white"
                    >
                      Accept & Join Group
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-4">
                  <p className="text-sm text-red-500 font-medium">Invalid or expired invitation link.</p>
                  <Link to="/family" className="mt-4 inline-block text-xs font-bold text-primary-500 hover:underline">
                    Back to Family Setup
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Manual Code Flow */
          <Card className="border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl shadow-glass overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LockOpen className="h-5 w-5 text-purple-500" />
                Enter Invite Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinByCodeSubmit} className="space-y-4">
                <Input
                  label="Family Code *"
                  placeholder="e.g. ABCD1234"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="font-mono text-center tracking-widest text-lg uppercase"
                />
                <Button
                  type="submit"
                  isLoading={joinByCode.isPending}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 shadow-lg text-white"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Join Family
                </Button>
              </form>
              <div className="mt-6 text-center border-t border-foreground/5 pt-4">
                <span className="text-xs text-foreground/45">Or want to setup your own family?</span>
                <Link
                  to="/family"
                  className="ml-1.5 text-xs font-bold text-purple-500 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  Create Family
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
