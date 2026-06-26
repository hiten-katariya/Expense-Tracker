import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/Card';
import { useUIStore } from '@/stores/uiStore';
import { Loader as Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSent, setIsSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      
      setIsSent(true);
      addNotification({
        type: 'success',
        title: 'Reset link sent!',
        message: 'Please check your email inbox for the password reset instructions.',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Request failed',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 grid-bg opacity-[0.15]" />
        <div className="absolute -top-[10%] -left-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-primary-600 to-purple-700 opacity-[0.25] blur-[120px] blob-animate-1" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#3B82F6] to-secondary-500 opacity-[0.2] blur-[120px] blob-animate-2" />
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        <Card className="w-full bg-bg-card/45 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary-500/5 blur-2xl pointer-events-none" />

          <CardHeader className="pb-4 border-b-0">
            <div className="mb-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Login
              </Link>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#06B6D4] via-[#8B5CF6] to-[#EC4899] p-[1.5px] shadow-[0_0_20px_rgba(139,92,246,0.4)] overflow-hidden">
                  <img src="/logo.png" alt="Logo" className="h-full w-full object-cover rounded-[14px]" />
                </div>
              </div>
              <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Reset Password
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                {isSent ? 'Check your email inbox' : 'Enter your email to receive a password reset link'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!isSent ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  leftIcon={<Mail className="h-4.5 w-4.5 text-slate-500" />}
                  {...register('email')}
                />
                <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-lg animate-pulse" />
                    <CheckCircle2 className="h-16 w-16 text-emerald-500 relative z-10" />
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  We have enqueued a password reset message to your email address. Please click the link in that email to reset your credentials.
                </p>
                <Button variant="secondary" className="w-full mt-4" onClick={() => navigate('/login')}>
                  Return to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
