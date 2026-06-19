import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { supabase, updateProfile } from '@/lib/supabase';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/Card';
import { Mail, User, Phone, MapPin, Globe, CheckCircle2, CheckCircle, AlertTriangle, Loader, Sparkles } from 'lucide-react';

const onboardingSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().min(2, 'Country is required'),
  pincode: z.string().min(6, 'Pincode must be at least 6 characters'),
  currency_code: z.string().min(3, 'Preferred currency is required').max(3),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoRedirectTime, setAutoRedirectTime] = useState(3);

  // Sync email verification between Supabase Auth and User Profile
  useEffect(() => {
    async function syncVerification() {
      if (user && profile && !profile.email_verified_at && user.email_confirmed_at) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ email_verified_at: user.email_confirmed_at })
            .eq('id', user.id);
          if (!error) {
            await refreshProfile();
          }
        } catch (e) {
          console.error('Failed to auto-sync verification time:', e);
        }
      }
    }
    syncVerification();
  }, [user, profile, refreshProfile]);

  // Handle cooldown timer for email resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const profileCompleted = !!(
    profile &&
    profile.full_name &&
    profile.phone_number &&
    profile.city &&
    profile.state &&
    profile.country &&
    profile.pincode &&
    profile.preferred_currency
  );
  const emailVerified = !!user?.email_confirmed_at;
  const accountReady = profileCompleted && emailVerified;

  const isEmailVerified = emailVerified;
  const isProfileComplete = profileCompleted;

  const statusColor = accountReady ? "green" : "yellow";
  const statusIcon = accountReady ? CheckCircle : AlertTriangle;

  console.log("Profile:", profile);
  console.log("Profile Completed:", profileCompleted);
  console.log("Email Verified:", emailVerified);
  console.log("Account Ready:", accountReady);

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      city: profile?.city || '',
      state: profile?.state || '',
      country: profile?.country || '',
      pincode: profile?.pincode || '',
      currency_code: profile?.currency_code || 'INR',
    },
  });

  const watchAllFields = watch();

  // Compute onboarding progress percentage (50% email confirmation + 50% split across 7 profile fields)
  const emailProgress = isEmailVerified ? 50 : 0;
  const profileFields = ['full_name', 'phone_number', 'city', 'state', 'country', 'pincode', 'currency_code'];
  const filledFieldsCount = profileFields.filter((field) => {
    const val = watchAllFields[field as keyof OnboardingFormData];
    return val && val.trim() !== '';
  }).length;
  const profileProgress = Math.round((filledFieldsCount / profileFields.length) * 50);
  const onboardingProgress = emailProgress + profileProgress;

  // Prepopulate form if profile details change/load
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setValue('full_name', profile.full_name);
      if (profile.phone_number) setValue('phone_number', profile.phone_number);
      if (profile.city) setValue('city', profile.city);
      if (profile.state) setValue('state', profile.state);
      if (profile.country) setValue('country', profile.country);
      if (profile.pincode) setValue('pincode', profile.pincode);
      if (profile.currency_code) setValue('currency_code', profile.currency_code);
    }
  }, [profile, setValue]);

  // Handle auto-redirect when account is fully ready
  useEffect(() => {
    if (accountReady) {
      const redirectTimer = setInterval(() => {
        setAutoRedirectTime((prev) => {
          if (prev <= 1) {
            clearInterval(redirectTimer);
            navigate('/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(redirectTimer);
    }
  }, [accountReady, navigate]);

  const onResendEmail = async () => {
    if (!user || !user.email) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Verification Email Sent',
        message: 'A confirmation link has been sent to your email address by Supabase Auth.',
      });
      setCooldown(60);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Error Resending Email',
        message: err instanceof Error ? err.message : 'Please try again later.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const onSubmitProfile = async (data: OnboardingFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateProfile(user.id, {
        ...data,
        preferred_currency: data.currency_code
      });
      await refreshProfile();

      // Re-fetch latest store values synchronously after refreshProfile completes
      const latestProfile = useAuthStore.getState().profile;
      const latestUser = useAuthStore.getState().user;

      const latestProfileCompleted = !!(
        latestProfile &&
        latestProfile.full_name &&
        latestProfile.phone_number &&
        latestProfile.city &&
        latestProfile.state &&
        latestProfile.country &&
        latestProfile.pincode &&
        latestProfile.preferred_currency
      );
      const latestEmailVerified = !!latestUser?.email_confirmed_at;
      const latestAccountReady = latestProfileCompleted && latestEmailVerified;

      console.log("onSubmitProfile - After Save & Refresh:");
      console.log("Profile:", latestProfile);
      console.log("Profile Completed:", latestProfileCompleted);
      console.log("Email Verified:", latestEmailVerified);
      console.log("Account Ready:", latestAccountReady);

      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile details have been saved successfully.',
      });

      if (latestAccountReady) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("onSubmitProfile Error:", err);
      let errorMsg = 'An error occurred.';
      if (err) {
        errorMsg = err.message || err.details || JSON.stringify(err);
        if (err.hint) {
          errorMsg += ` (Hint: ${err.hint})`;
        }
        if (err.code) {
          errorMsg += ` [Code: ${err.code}]`;
        }
      }
      addNotification({
        type: 'error',
        title: 'Failed to Save Profile',
        message: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Logout Failed',
        message: 'An error occurred during logout.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic glow backgrounds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 grid-bg opacity-[0.03] dark:opacity-[0.1]" />
        <div className="absolute -top-[15%] -left-[10%] h-[700px] w-[700px] rounded-full bg-gradient-to-tr from-primary-600 to-purple-600 opacity-[0.1] dark:opacity-[0.2] blur-[130px] blob-animate-1" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[700px] w-[700px] rounded-full bg-gradient-to-tr from-blue-600 to-secondary-500 opacity-[0.08] dark:opacity-[0.15] blur-[130px] blob-animate-2" />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 z-10 my-8">
        {/* Onboarding Checklist Sidebar */}
        <div className="md:col-span-4 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Onboarding</h1>
                <p className="text-sm text-foreground/60 mt-2">Just a couple steps before you can manage your money.</p>
              </div>

              {/* Onboarding Progress Card */}
              <div className="p-4 bg-card/40 backdrop-blur-md rounded-xl border border-foreground/10 shadow-sm space-y-2">
                <div className="flex justify-between text-xs font-semibold text-foreground/80">
                  <span>Profile Onboarding Progress</span>
                  <span className="tabular-nums font-bold text-primary-500">{onboardingProgress}%</span>
                </div>
                <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${onboardingProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                  />
                </div>
              </div>

              {/* Account Readiness Status Card */}
              <div className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                statusColor === "green"
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {statusIcon === CheckCircle ? (
                    <CheckCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                  )}
                  <span>{statusColor === "green" ? "Account Ready" : "Account Setup Incomplete"}</span>
                </div>
                <div className="text-[11px] font-semibold opacity-85 space-y-1">
                  <div>{profileCompleted ? "✅ Profile Completed" : "🟡 Profile Details Pending"}</div>
                  <div>{emailVerified ? "✅ Email Verified" : "🟡 Email Verification Pending"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Step 1: Email Verification */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  isEmailVerified
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isEmailVerified ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-bold text-sm">1. Verify Email</h3>
                  <p className="text-xs opacity-80 mt-0.5">
                    {isEmailVerified ? 'Email confirmed and verified.' : 'Confirm email link sent to inbox.'}
                  </p>
                </div>
              </div>

              {/* Step 2: Complete Profile */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  isProfileComplete
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isProfileComplete ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-bold text-sm">2. Personal Details</h3>
                  <p className="text-xs opacity-80 mt-0.5">
                    {isProfileComplete ? 'All contact details completed.' : 'Fill in contact info & currency.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button variant="ghost" onClick={handleLogout} className="justify-start gap-2 text-foreground/60 hover:text-foreground">
            Sign out of account
          </Button>
        </div>

        {/* Action Panel */}
        <div className="md:col-span-8">
          <AnimatePresence mode="wait">
            {accountReady ? (
              /* State A: Complete & Ready to Redirect */
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="bg-card/45 backdrop-blur-2xl border-emerald-500/20 shadow-2xl text-center py-16 px-6">
                  <CardContent className="space-y-6 flex flex-col items-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                      <CheckCircle className="h-20 w-20 text-emerald-500 relative z-10" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-3xl font-extrabold flex items-center justify-center gap-2">
                        You're All Set! <Sparkles className="h-6 w-6 text-primary-500" />
                      </CardTitle>
                      <CardDescription className="text-base text-foreground/80 max-w-md mx-auto">
                        Your account is fully verified and your profile is complete. Get ready to master your budget.
                      </CardDescription>
                    </div>

                    {/* Completion Status Badge */}
                    <div className="inline-flex flex-col items-start bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-600 dark:text-emerald-400 text-sm font-semibold space-y-1 mx-auto min-w-[200px]">
                      <div className="flex items-center gap-2">✅ Profile Completed</div>
                      <div className="flex items-center gap-2">✅ Email Verified</div>
                      <div className="border-t border-emerald-500/20 w-full pt-1 mt-1 text-center font-bold uppercase tracking-wider text-xs">
                        Account Ready
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-emerald-500 dark:text-emerald-400">
                      Redirecting to dashboard in {autoRedirectTime} seconds...
                    </div>
                    <Button onClick={() => navigate('/dashboard')} className="px-8 font-bold bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      Go to Dashboard Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* State B: Incomplete (either email not verified OR profile incomplete) */
              <motion.div
                key="onboarding-cards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* 1. Email Verification Actions */}
                {!isEmailVerified && (
                  <Card className="bg-card/45 backdrop-blur-2xl border-foreground/10 shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary-500" /> Confirm Your Email Address
                      </CardTitle>
                      <CardDescription>
                        We sent a verification link to <span className="font-semibold text-foreground">{user?.email}</span>.
                        Please check your email and click the verification link.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                      <Button
                        onClick={onResendEmail}
                        disabled={isResending || cooldown > 0}
                        className="w-full sm:w-auto font-semibold"
                      >
                        {isResending ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin mr-2" /> Resending...
                          </>
                        ) : cooldown > 0 ? (
                          `Resend in ${cooldown}s`
                        ) : (
                          'Resend Verification Email'
                        )}
                      </Button>
                      <Button variant="secondary" onClick={() => refreshProfile()} className="w-full sm:w-auto">
                        Check Status / Refresh
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* 2. Profile Details Form */}
                <Card className="bg-card/45 backdrop-blur-2xl border-foreground/10 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <User className="h-5 w-5 text-primary-500" /> Complete Profile Details
                    </CardTitle>
                    <CardDescription>
                      Provide your default preferences and contact information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Full Name"
                          type="text"
                          placeholder="John Doe"
                          error={errors.full_name?.message}
                          leftIcon={<User className="h-4.5 w-4.5 text-slate-500" />}
                          {...register('full_name')}
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="City"
                          type="text"
                          placeholder="Pune"
                          error={errors.city?.message}
                          leftIcon={<MapPin className="h-4.5 w-4.5 text-slate-500" />}
                          {...register('city')}
                        />
                        <Input
                          label="State"
                          type="text"
                          placeholder="Maharashtra"
                          error={errors.state?.message}
                          leftIcon={<MapPin className="h-4.5 w-4.5 text-slate-500" />}
                          {...register('state')}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Country"
                          type="text"
                          placeholder="India"
                          error={errors.country?.message}
                          leftIcon={<Globe className="h-4.5 w-4.5 text-slate-500" />}
                          {...register('country')}
                        />
                        <Input
                          label="Pincode"
                          type="text"
                          placeholder="411045"
                          error={errors.pincode?.message}
                          leftIcon={<MapPin className="h-4.5 w-4.5 text-slate-500" />}
                          {...register('pincode')}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-foreground/80">Preferred Currency</label>
                        <select
                          className="w-full bg-card/60 border border-foreground/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-foreground"
                          {...register('currency_code')}
                        >
                          {CURRENCIES.map((curr) => (
                            <option key={curr.code} value={curr.code}>
                              {curr.name}
                            </option>
                          ))}
                        </select>
                        {errors.currency_code && (
                          <p className="text-xs text-red-500 font-semibold mt-1">{errors.currency_code.message}</p>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isSubmitting} className="font-bold px-6">
                          {isSubmitting ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin mr-2" /> Saving...
                            </>
                          ) : (
                            'Save Profile Details'
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
