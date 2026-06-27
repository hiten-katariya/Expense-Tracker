import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/Card';
import { Button } from '@/components/Button';
import { Loader, CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
  const type = searchParams.get('type') || 'signup';

  useEffect(() => {
    async function verify() {
      if (!tokenHash) {
        setStatus('error');
        setErrorMessage('Verification token is missing. Please check your verification email link.');
        return;
      }

      try {
        const { supabase: supabaseClient } = await import('@/lib/supabase');
        const { error } = await supabaseClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });

        if (error) {
          throw error;
        }

        setStatus('success');
        addNotification({
          type: 'success',
          title: 'Email Verified',
          message: 'Your email address has been successfully verified!',
        });

        // Trigger welcome email via server endpoint (optional / nice to have)
        const latestUser = useAuthStore.getState().user;
        if (latestUser && latestUser.email) {
          const API = import.meta.env.VITE_API_URL || '';
          fetch(`${API}/api/test/welcome-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: latestUser.email, name: latestUser.user_metadata?.full_name || 'Valued User' }),
          }).catch((err) => console.warn('Failed to send welcome email:', err));
        }

        // Refresh auth profile state to capture updated verification timestamp
        await refreshProfile();

        // Write verification notification to user's notifications center
        const latestWorkspace = useAuthStore.getState().workspace;
        if (latestUser?.id) {
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: latestUser.id,
              workspace_id: latestWorkspace?.id || null,
              type: 'verification',
              title: 'Email Verified',
              message: 'Your email address has been successfully verified.',
              is_read: false
            });
        }

        // Redirect to onboarding in 3 seconds
        setTimeout(() => {
          navigate('/onboarding');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'An error occurred during verification.');
      }
    }

    verify();
  }, [tokenHash, type, refreshProfile, navigate, addNotification]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 grid-bg opacity-[0.03] dark:opacity-[0.1]" />
        <div className="absolute -top-[10%] -left-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 opacity-[0.1] dark:opacity-[0.2] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 opacity-[0.08] dark:opacity-[0.15] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="bg-card/45 backdrop-blur-2xl border-foreground/10 shadow-2xl overflow-hidden text-center py-12 px-6">
          <CardHeader className="pb-2">
            <div className="flex justify-center mb-3">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#06B6D4] via-[#8B5CF6] to-[#EC4899] p-[1.5px] shadow-[0_0_20px_rgba(139,92,246,0.4)] overflow-hidden">
                <img src="/logo.png" alt="Logo" className="h-full w-full object-cover rounded-[14px]" />
              </div>
            </div>
            <div className="flex justify-center mb-4">
              {status === 'loading' && (
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-500/10 rounded-full blur-lg" />
                  <Loader className="h-16 w-16 text-primary-500 animate-spin relative z-10" />
                </div>
              )}
              {status === 'success' && (
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-lg" />
                  <CheckCircle2 className="h-16 w-16 text-emerald-500 relative z-10" />
                </div>
              )}
              {status === 'error' && (
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full blur-lg" />
                  <XCircle className="h-16 w-16 text-red-500 relative z-10" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              {status === 'loading' && 'Verifying Email'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription className="text-foreground/60 mt-1">
              {status === 'loading' && 'Confirming your secure registration token...'}
              {status === 'success' && 'Successfully confirmed secure token.'}
              {status === 'error' && 'We could not verify your email address.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {status === 'loading' && (
              <p className="text-sm text-foreground/85">
                Please wait while we connect to our database and activate your account.
              </p>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <p className="text-sm text-foreground/85">
                  Thank you for verifying your email. You will be redirected to onboarding to complete your profile setup.
                </p>
                <div className="text-xs text-primary-500 dark:text-primary-400 font-semibold animate-pulse">
                  Redirecting in a moment...
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-6">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-left font-medium">
                  {errorMessage}
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate('/onboarding')} className="w-full font-bold">
                    Go to Onboarding
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/login')} className="w-full">
                    Return to Login
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
