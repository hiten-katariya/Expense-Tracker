import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Bell, Moon, Sun, Globe } from 'lucide-react';
import { CURRENCIES } from '@/types';
import { supabase } from '@/lib/supabase';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional().nullable(),
  currency_code: z.string(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function SettingsPage() {
  const { user, profile } = useAuthStore();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const addNotification = useUIStore((s) => s.addNotification);
  const { darkMode, toggleDarkMode } = useUIStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      currency_code: profile?.currency_code || 'INR',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name || null,
          currency_code: data.currency_code,
        })
        .eq('id', user!.id);
      if (error) throw error;
      await refreshProfile();
      addNotification({ type: 'success', title: 'Settings saved', message: 'Your profile has been updated.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to update profile' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl">
                {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-sm text-slate-500">{profile?.email}</p>
              </div>
            </div>

            <Input
              label="Full Name"
              placeholder="John Doe"
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <Select
              label="Preferred Currency"
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.name} (${c.code})` }))}
              {...register('currency_code')}
            />

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={!isDirty || isSubmitting}>
                Save Changes
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            Account Security
          </CardTitle>
          <CardDescription>Manage your security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Email Verification</p>
              <p className="text-sm text-slate-500">
                {profile?.email_verified_at
                  ? `Verified on ${new Date(profile.email_verified_at).toLocaleDateString()}`
                  : 'Not verified'}
              </p>
            </div>
            {!profile?.email_verified_at && (
              <Button variant="secondary" size="sm">
                Verify Email
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Multi-Factor Authentication</p>
              <p className="text-sm text-slate-500">
                {profile?.mfa_enabled ? 'Enabled' : 'Not enabled'}
              </p>
            </div>
            <Button variant="secondary" size="sm">
              {profile?.mfa_enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Active Sessions</p>
              <p className="text-sm text-slate-500">Manage devices where you're logged in</p>
            </div>
            <Button variant="secondary" size="sm">
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary-600" />
            Preferences
          </CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="h-5 w-5 text-slate-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-slate-700">Dark Mode</p>
                <p className="text-sm text-slate-500">
                  {darkMode ? 'Currently enabled' : 'Currently disabled'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                darkMode ? 'bg-primary-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Email Notifications</p>
                <p className="text-sm text-slate-500">Budget alerts and summaries</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              <span className="pointer-events-none inline-block h-5 w-5 transform translate-x-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-red-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Sign out from all devices</p>
              <p className="text-sm text-slate-500">
                This will log you out from all sessions except this one
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Sign Out All
            </Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Delete Account</p>
              <p className="text-sm text-slate-500">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="danger" size="sm">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
