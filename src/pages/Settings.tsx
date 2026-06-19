import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Bell, Moon, Sun, Globe, Loader } from 'lucide-react';
import { CURRENCIES } from '@/types';
import { supabase, updateProfile } from '@/lib/supabase';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional().nullable(),
  currency_code: z.string(),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits').optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function SettingsPage() {
  const { user, profile, signOut } = useAuthStore();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const addNotification = useUIStore((s) => s.addNotification);
  const { darkMode, toggleDarkMode } = useUIStore();

  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Manage cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSignOutCurrent = async () => {
    try {
      await signOut({ scope: 'local' });
      addNotification({ type: 'success', title: 'Signed Out', message: 'Logged out successfully.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to sign out.' });
    }
  };

  const handleSignOutGlobal = async () => {
    try {
      await signOut({ scope: 'global' });
      addNotification({ type: 'success', title: 'Signed Out', message: 'Logged out of all devices successfully.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to sign out from all devices.' });
    }
  };

  const handleSignOutOthers = async () => {
    try {
      await signOut({ scope: 'others' });
      addNotification({ type: 'success', title: 'Sessions Cleared', message: 'Logged out of all other devices successfully.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to sign out from other devices.' });
    }
  };

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      currency_code: profile?.currency_code || 'INR',
      phone_number: profile?.phone_number || '',
      city: profile?.city || '',
      state: profile?.state || '',
      country: profile?.country || '',
      pincode: profile?.pincode || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(user!.id, {
        full_name: data.full_name || null,
        currency_code: data.currency_code,
        preferred_currency: data.currency_code,
        phone_number: data.phone_number || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        pincode: data.pincode || null,
      });

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: data.full_name,
          phone_number: data.phone_number,
          city: data.city,
          state: data.state,
          country: data.country,
          pincode: data.pincode,
        },
      });

      if (authError) throw authError;

      await refreshProfile();
      addNotification({ type: 'success', title: 'Settings saved', message: 'Your profile has been updated.' });
    } catch (err: any) {
      console.error("Settings profile update error:", err);
      let errorMsg = 'Failed to update profile.';
      if (err) {
        errorMsg = err.message || err.details || JSON.stringify(err);
        if (err.hint) {
          errorMsg += ` (Hint: ${err.hint})`;
        }
        if (err.code) {
          errorMsg += ` [Code: ${err.code}]`;
        }
      }
      addNotification({ type: 'error', title: 'Error', message: errorMsg });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="text-foreground/60 mt-1">Manage your account preferences and security</p>
      </div>

      {/* Profile Section */}
      <Card className="bg-card/45 backdrop-blur-2xl border-foreground/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <User className="h-5 w-5 text-primary-500" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-foreground/60">Update your personal and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-foreground/5">
              <div className="h-16 w-16 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 font-extrabold text-2xl shadow-sm">
                {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-sm text-foreground/60 font-medium">{profile?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                error={errors.full_name?.message}
                {...register('full_name')}
              />
              <Input
                label="Phone Number"
                placeholder="9876543210"
                error={errors.phone_number?.message}
                {...register('phone_number')}
              />
            </div>

            <Select
              label="Preferred Currency"
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.name} (${c.code})` }))}
              {...register('currency_code')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="City"
                placeholder="Pune"
                error={errors.city?.message}
                {...register('city')}
              />
              <Input
                label="State"
                placeholder="Maharashtra"
                error={errors.state?.message}
                {...register('state')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Country"
                placeholder="India"
                error={errors.country?.message}
                {...register('country')}
              />
              <Input
                label="Pincode"
                placeholder="411045"
                error={errors.pincode?.message}
                {...register('pincode')}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={!isDirty || isSubmitting}>
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
              {isDirty && (
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card className="bg-card/45 backdrop-blur-2xl border-foreground/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-primary-500" />
            Account Security
          </CardTitle>
          <CardDescription className="text-foreground/60">Manage email verification and login sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 divide-y divide-foreground/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Email Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                {user?.email_confirmed_at ? (
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                    ✓ Email Verified
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                    ❌ Email Not Verified
                  </span>
                )}
              </div>
              {!user?.email_confirmed_at && (
                <p className="text-[10px] text-foreground/50 mt-1">
                  Confirm the link sent to your inbox to enable verification status.
                </p>
              )}
            </div>
            {!user?.email_confirmed_at && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onResendEmail}
                disabled={isResending || cooldown > 0}
                className="font-bold w-full sm:w-auto"
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
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4.5">
            <div>
              <p className="text-sm font-semibold text-foreground">Multi-Factor Authentication</p>
              <p className="text-xs text-foreground/60 mt-1 font-medium">
                {profile?.mfa_enabled ? 'MFA is currently active' : 'Add another layer of safety to your account'}
              </p>
            </div>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              {profile?.mfa_enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4.5">
            <div>
              <p className="text-sm font-semibold text-foreground">Sign Out</p>
              <p className="text-xs text-foreground/60 mt-1 font-medium">Log out of your account on this device only</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSignOutCurrent} className="w-full sm:w-auto">
              Sign Out
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4.5">
            <div>
              <p className="text-sm font-semibold text-foreground">Sign Out of All Devices</p>
              <p className="text-xs text-foreground/60 mt-1 font-medium">Log out of your account globally on all devices</p>
            </div>
            <Button variant="danger" size="sm" onClick={handleSignOutGlobal} className="w-full sm:w-auto font-bold">
              Sign Out All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card className="bg-card/45 backdrop-blur-2xl border-foreground/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Globe className="h-5 w-5 text-primary-500" />
            Preferences
          </CardTitle>
          <CardDescription className="text-foreground/60">Customize your visual and alert settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-foreground/5 rounded-xl border border-foreground/5">
                {darkMode ? <Moon className="h-5 w-5 text-indigo-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </p>
                <p className="text-xs text-foreground/60 mt-0.5">
                  {darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${
                darkMode ? 'bg-primary-500' : 'bg-foreground/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-foreground/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-foreground/5 rounded-xl border border-foreground/5">
                <Bell className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Email Notifications</p>
                <p className="text-xs text-foreground/60 mt-0.5">Budget alerts and summaries</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-500 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50">
              <span className="pointer-events-none inline-block h-5 w-5 transform translate-x-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/30 bg-red-500/[0.02] backdrop-blur-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-red-500">Danger Zone</CardTitle>
          <CardDescription className="text-red-500/60">Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 divide-y divide-red-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Sign out from other devices</p>
              <p className="text-xs text-foreground/65 mt-1">
                Log out of all active sessions except this current one
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSignOutOthers} className="w-full sm:w-auto font-semibold">
              Sign Out Others
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4.5">
            <div>
              <p className="text-sm font-semibold text-foreground">Delete Account</p>
              <p className="text-xs text-foreground/65 mt-1">
                Permanently delete your user profile and erase all transaction data
              </p>
            </div>
            <Button variant="danger" size="sm" className="w-full sm:w-auto font-extrabold">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
