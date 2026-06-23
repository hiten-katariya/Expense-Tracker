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
import { Loader as Loader2, Mail, Lock, User, ArrowLeft, Github, Eye, EyeOff, Phone } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: 'You have successfully signed in.',
      });
      navigate('/dashboard');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Sign in failed',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'OAuth Error',
        message: 'Failed to sign in with Google',
      });
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
        },
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'OAuth Error',
        message: 'Failed to sign in with GitHub',
      });
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
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Home
              </Link>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Sign in to your dashboard to continue
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                leftIcon={<Mail className="h-4.5 w-4.5 text-slate-500" />}
                {...register('email')}
              />
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                leftIcon={<Lock className="h-4.5 w-4.5 text-slate-500" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                }
                {...register('password')}
              />
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-bg-card/80 px-3 text-slate-500 font-semibold">Or continue with</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={handleGoogleSignIn}
              >
                <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={handleGithubSignIn}
              >
                <Github className="h-5 w-5 mr-1" />
                Continue with GitHub
              </Button>
            </div>

            <p className="text-center text-sm text-slate-400 mt-2">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const registerSchema = authSchema.extend({
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    country: z.string().min(2, 'Country is required'),
    pincode: z.string().min(6, 'Pincode must be at least 6 characters'),
  });

  type RegisterFormData = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            phone_number: data.phone_number,
            city: data.city,
            state: data.state,
            country: data.country,
            pincode: data.pincode,
          },
        },
      });
      if (error) throw error;
      addNotification({
        type: 'success',
        title: 'Account created!',
        message: 'Please check your email to verify your account.',
      });
      navigate('/login');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Registration failed',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'OAuth Error',
        message: 'Failed to sign in with Google',
      });
    }
  };

  const handleGithubSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
        },
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'OAuth Error',
        message: 'Failed to sign in with GitHub',
      });
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
        className="w-full max-w-xl z-10"
      >
        <Card className="w-full bg-bg-card/45 backdrop-blur-2xl border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary-500/5 blur-2xl pointer-events-none" />

          <CardHeader className="pb-4 border-b-0">
            <div className="mb-4">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Home
              </Link>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Create Account
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Start managing your expenses cleanly today
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                error={errors.full_name?.message}
                leftIcon={<User className="h-4.5 w-4.5 text-slate-500" />}
                {...register('full_name')}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  leftIcon={<Mail className="h-4.5 w-4.5 text-slate-500" />}
                  {...register('email')}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="9876543210"
                  error={errors.phone_number?.message}
                  leftIcon={<Phone className="h-4.5 w-4.5 text-slate-500" />}
                  {...register('phone_number')}
                />
              </div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                hint="Must be at least 6 characters"
                leftIcon={<Lock className="h-4.5 w-4.5 text-slate-500" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                }
                {...register('password')}
              />
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-bg-card/80 px-3 text-slate-500 font-semibold">Or continue with</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={handleGoogleSignIn}
              >
                <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={handleGithubSignIn}
              >
                <Github className="h-5 w-5 mr-1" />
                Continue with GitHub
              </Button>
            </div>

            <p className="text-center text-sm text-slate-400 mt-2">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
