import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/Button';
import { TextReveal } from '@/components/ui/cascade-text';
import { Input, Select } from '@/components/Input';
import { useUIStore } from '@/stores/uiStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Bell, Moon, Sun, Globe, Loader, CheckCircle2, XCircle, Smartphone, LogOut, Trash2, Download, ShieldAlert } from 'lucide-react';
import { CURRENCIES } from '@/types';
import { supabase, updateProfile } from '@/lib/supabase';
import { cn, sanitizeName } from '@/lib/utils';
import { SafeAvatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { toast } from 'sonner';

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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  }),
};

function SettingRow({
  icon, title, description, action, danger = false,
}: {
  icon: React.ReactNode; title: string; description?: string; action: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-5 rounded-xl transition-colors', danger ? 'hover:bg-red-500/4' : 'hover:bg-foreground/[0.02]')}>
      <div className="flex items-center gap-3.5">
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', danger ? 'bg-red-500/10' : 'bg-foreground/5')}>
          <span className={danger ? 'text-red-500' : 'text-foreground/60'}>{icon}</span>
        </div>
        <div>
          <p className={cn('text-sm font-semibold', danger ? 'text-red-500' : 'text-foreground')}>{title}</p>
          {description && <p className="text-xs text-foreground/50 mt-0.5 max-w-sm">{description}</p>}
        </div>
      </div>
      <div className="sm:shrink-0">{action}</div>
    </div>
  );
}

function SectionCard({ title, icon, description, children, delay = 0, danger = false }: {
  title: string; icon: React.ReactNode; description?: string; children: React.ReactNode; delay?: number; danger?: boolean;
}) {
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      animate="show"
      variants={fadeUp}
      className={cn(
        'rounded-2xl border backdrop-blur-xl overflow-hidden',
        danger
          ? 'border-red-500/20 bg-red-500/[0.02]'
          : 'border-foreground/10 bg-white/50 dark:bg-white/[0.025] shadow-glass'
      )}
    >
      <div className={cn('px-6 py-5 border-b', danger ? 'border-red-500/10' : 'border-foreground/5')}>
        <div className="flex items-center gap-3">
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', danger ? 'bg-red-500/10' : 'bg-primary-500/10')}>
            <span className={danger ? 'text-red-500' : 'text-primary-500'}>{icon}</span>
          </div>
          <div>
            <h3 className={cn('font-bold text-sm', danger ? 'text-red-500' : 'text-foreground')}>{title}</h3>
            {description && <p className="text-xs text-foreground/50 mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      <div className="divide-y divide-foreground/5">{children}</div>
    </motion.div>
  );
}

export function SettingsPage() {
  const { user, profile, signOut } = useAuthStore();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const addNotification = useUIStore((s) => s.addNotification);
  const { darkMode, toggleDarkMode } = useUIStore();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [emailPrefs, setEmailPrefs] = useState<Record<string, boolean>>({
    marketing_emails: true,
    budget_emails: true,
    family_emails: true,
    workspace_emails: true,
    ai_emails: true,
    monthly_reports: true,
    weekly_reports: true,
    security_emails: true,
  });
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [showEmailPrefs, setShowEmailPrefs] = useState(false);

  // GDPR and Deletion states
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Compiling your GDPR data archive. Please wait...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/gdpr/export', {
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
      });

      if (!response.ok) throw new Error('Failed to generate export file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr_export_${user?.id || 'data'}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Your data export is ready and downloading!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to export GDPR data archive', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmPassword.trim()) {
      toast.error('Password is required to confirm deletion.');
      return;
    }
    setIsDeleting(true);
    const toastId = toast.loading('Verifying identity and scheduling soft deletion...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/gdpr/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ password: confirmPassword, reason: deleteReason }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule deletion.');
      }

      toast.success('Account scheduled for permanent deletion in 30 days! Logging out...', { id: toastId });
      setIsDeleteModalOpen(false);
      setConfirmPassword('');
      setDeleteReason('');
      
      setTimeout(() => {
        signOut();
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please check your password.', { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/email/preferences');
        if (response.ok) {
          const json = await response.json();
          if (json.data) {
            setEmailPrefs(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load email preferences:', err);
      } finally {
        setIsLoadingPrefs(false);
      }
    }
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const handleTogglePref = async (key: string) => {
    if (key === 'security_emails') return;
    
    const updatedPrefs = {
      ...emailPrefs,
      [key]: !emailPrefs[key]
    };
    
    setEmailPrefs(updatedPrefs);
    
    try {
      const response = await fetch('/api/email/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPrefs)
      });
      
      if (!response.ok) throw new Error('Failed to save preferences');
      
      addNotification({
        type: 'success',
        title: 'Preferences Updated',
        message: 'Your email notification channels have been modified successfully.'
      });
    } catch (err: any) {
      // Revert state
      setEmailPrefs(emailPrefs);
      addNotification({
        type: 'error',
        title: 'Save Error',
        message: 'Could not sync preferences with the server.'
      });
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: sanitizeName(profile?.full_name) || '',
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
      await supabase.auth.updateUser({ data: { full_name: data.full_name } });
      await refreshProfile();
      addNotification({ type: 'success', title: 'Saved', message: 'Your profile has been updated.' });
    } catch (err: unknown) {
      const e = err as { message?: string };
      addNotification({ type: 'error', title: 'Error', message: e?.message || 'Failed to save.' });
    }
  };

  const onResendEmail = async () => {
    if (!user?.email) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
      if (error) throw error;
      addNotification({ type: 'success', title: 'Email Sent', message: 'Check your inbox for the verification link.' });
      setCooldown(60);
    } catch (err: unknown) {
      const e = err as { message?: string };
      addNotification({ type: 'error', title: 'Error', message: e?.message || 'Please try again.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="mb-2">
        <TextReveal
          text="Settings"
          subtitle="Manage your account preferences and security"
          textSize="text-3xl"
        />
      </div>

      {/* Profile Hero Card */}
      <motion.div custom={0} initial="hidden" animate="show" variants={fadeUp}
        className="rounded-2xl border border-foreground/10 bg-white/50 dark:bg-white/[0.025] backdrop-blur-xl shadow-glass overflow-hidden"
      >
        {/* Gradient banner */}
        <div className="h-20 bg-gradient-to-r from-primary-500/20 via-primary-600/15 to-secondary-500/10 relative overflow-hidden">
          <div className="absolute inset-0 blob-animate-1 opacity-40" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.3) 0%, transparent 60%)' }} />
        </div>
        <div className="px-6 pb-6 -mt-10">
          {/* Avatar */}
          <div className="relative mb-4 w-fit">
            <SafeAvatar
              src={profile?.avatar_url}
              className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center border-4 border-background shadow-xl shadow-primary-500/30"
              iconClassName="h-10 w-10 text-white"
            />
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background" title="Online" />
          </div>
          <p className="text-xl font-extrabold text-foreground">{sanitizeName(profile?.full_name) || 'Your Name'}</p>
          <p className="text-sm text-foreground/50">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            {user?.email_confirmed_at ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                <XCircle className="h-3 w-3" /> Unverified
              </span>
            )}
            <span className="text-xs text-foreground/40 bg-foreground/5 px-2.5 py-1 rounded-full">
              Personal Account
            </span>
          </div>
        </div>
      </motion.div>

      {/* Profile Form */}
      <SectionCard title="Profile Information" icon={<User className="h-4 w-4" />} description="Update your personal details" delay={1}>
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" placeholder="John Doe" error={errors.full_name?.message} {...register('full_name')} />
              <Input label="Phone Number" placeholder="9876543210" error={errors.phone_number?.message} {...register('phone_number')} />
            </div>
            <Select
              label="Preferred Currency"
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.name} (${c.code})` }))}
              {...register('currency_code')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="City" placeholder="Pune" error={errors.city?.message} {...register('city')} />
              <Input label="State" placeholder="Maharashtra" error={errors.state?.message} {...register('state')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Country" placeholder="India" error={errors.country?.message} {...register('country')} />
              <Input label="Pincode" placeholder="411045" error={errors.pincode?.message} {...register('pincode')} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={!isDirty || isSubmitting} isLoading={isSubmitting}>
                Save Changes
              </Button>
              {isDirty && (
                <Button type="button" variant="ghost" onClick={() => window.location.reload()}>Reset</Button>
              )}
            </div>
          </form>
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard title="Account Security" icon={<Shield className="h-4 w-4" />} description="Manage authentication and sessions" delay={2}>
        <SettingRow
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Email Verification"
          description={user?.email_confirmed_at ? 'Your email is verified and secure.' : 'Verify your email to unlock all features.'}
          action={!user?.email_confirmed_at ? (
            <Button size="sm" variant="secondary" onClick={onResendEmail} disabled={isResending || cooldown > 0}>
              {isResending ? <><Loader className="h-3.5 w-3.5 animate-spin mr-1.5" />Sending...</> : cooldown > 0 ? `Retry in ${cooldown}s` : 'Resend Email'}
            </Button>
          ) : (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Verified</span>
          )}
        />
        <SettingRow
          icon={<Smartphone className="h-4 w-4" />}
          title="Two-Factor Authentication"
          description={profile?.mfa_enabled ? 'MFA is active and protecting your account.' : 'Add a second layer of security to your account.'}
          action={<Button size="sm" variant="secondary">{profile?.mfa_enabled ? 'Disable MFA' : 'Enable MFA'}</Button>}
        />
        <SettingRow
          icon={<LogOut className="h-4 w-4" />}
          title="Sign Out This Device"
          description="Log out of your account on this device only."
          action={<Button size="sm" variant="secondary" onClick={() => signOut({ scope: 'local' })}>Sign Out</Button>}
        />
        <SettingRow
          icon={<LogOut className="h-4 w-4" />}
          title="Sign Out All Devices"
          description="Log out globally from all active sessions."
          action={<Button size="sm" variant="danger" onClick={() => signOut({ scope: 'global' })}>Sign Out All</Button>}
        />
      </SectionCard>

      {/* Preferences */}
      <SectionCard title="Preferences" icon={<Globe className="h-4 w-4" />} description="Customize your experience" delay={3}>
        <SettingRow
          icon={darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          title={darkMode ? 'Dark Mode' : 'Light Mode'}
          description={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          action={
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${darkMode ? 'bg-primary-500' : 'bg-foreground/15'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          }
        />
        <div className="border-t border-foreground/5">
          <SettingRow
            icon={<Bell className="h-4 w-4" />}
            title="Email Notifications"
            description="Manage granular opt-out configurations for budgets, summaries, and AI recommendations."
            action={
              <Button size="sm" variant="secondary" onClick={() => setShowEmailPrefs(!showEmailPrefs)}>
                {showEmailPrefs ? 'Hide Preferences' : 'Configure Preferences'}
              </Button>
            }
          />
          {showEmailPrefs && (
            <div className="px-5 pb-5 pt-1 bg-foreground/[0.01] divide-y divide-foreground/5 space-y-4">
              <p className="text-[11px] font-bold text-foreground/45 uppercase tracking-widest mb-4 mt-2">Email Preferences Center</p>
              {isLoadingPrefs ? (
                <div className="flex items-center justify-center py-6 text-foreground/40 text-xs gap-2 font-medium">
                  <Loader className="h-4 w-4 animate-spin text-primary-500" />
                  <span>Loading preferences from server...</span>
                </div>
              ) : (
                [
                  { key: 'budget_emails', label: 'Budget Alerts', desc: 'Alerts when your spending reaches limits.' },
                  { key: 'family_emails', label: 'Family Hub', desc: 'Updates on shared budget limits and invites.' },
                  { key: 'workspace_emails', label: 'Workspace Alerts', desc: 'Invites and actions on co-owned workspaces.' },
                  { key: 'ai_emails', label: 'Gemini AI Insights & OCR', desc: 'OCR scans, merchant maps, and anomaly alerts.' },
                  { key: 'monthly_reports', label: 'Monthly Summaries', desc: 'PDF financial reports generated at month end.' },
                  { key: 'weekly_reports', label: 'Weekly Digests', desc: 'Total spend reviews delivered every Sunday.' },
                  { key: 'marketing_emails', label: 'Marketing Updates', desc: 'Product news, tips, and financial advice.' },
                  { key: 'security_emails', label: 'Security & Auth', desc: 'Confirmations, logins, and resets. (Always enabled)', disabled: true }
                ].map(({ key, label, desc, disabled }) => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{label}</p>
                      <p className="text-[10px] text-foreground/40 mt-0.5">{desc}</p>
                    </div>
                    <button
                      disabled={disabled}
                      onClick={() => handleTogglePref(key)}
                      className={`relative inline-flex h-5.5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        disabled 
                          ? 'bg-emerald-500/80 cursor-not-allowed' 
                          : (emailPrefs[key] ? 'bg-primary-500' : 'bg-foreground/15')
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        disabled || emailPrefs[key] ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* GDPR Data Center */}
      <SectionCard title="GDPR & Data Privacy" icon={<Shield className="h-4 w-4" />} description="Manage your data rights and privacy configurations" delay={4}>
        <SettingRow
          icon={<Download className="h-4 w-4" />}
          title="Download Personal Data Archive"
          description="Download a structured ZIP containing all your expenses, budgets, profile settings, and system activities in CSV and JSON formats."
          action={
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Request Export'}
            </Button>
          }
        />
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard title="Danger Zone" icon={<Trash2 className="h-4 w-4" />} description="Irreversible and destructive actions" delay={5} danger>
        <SettingRow
          icon={<LogOut className="h-4 w-4" />}
          title="Sign Out Other Devices"
          description="Keep this session active but log out everywhere else."
          action={<Button size="sm" variant="secondary" onClick={() => signOut({ scope: 'others' })}>Sign Out Others</Button>}
          danger
        />
        <SettingRow
          icon={<Trash2 className="h-4 w-4" />}
          title="Delete Account"
          description="Permanently delete your profile and erase all data. This cannot be undone."
          action={
            <Button size="sm" variant="danger" className="gap-1.5" onClick={() => setIsDeleteModalOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete Account
            </Button>
          }
          danger
        />
      </SectionCard>

      {/* Delete Account Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setConfirmPassword(''); setDeleteReason(''); }} title="Verify Password to Delete Account">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              <strong>Critical Action:</strong> Scheduling account deletion soft-deletes your account details for 30 days. You will be logged out immediately. All expenses, budgets, and links will be permanently deleted after this period, and your audit trails will be fully anonymized.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/75">Please confirm your password to proceed:</label>
            <Input
              type="password"
              placeholder="Enter your current password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-foreground/[0.02]"
              disabled={isDeleting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/75">Feedback / Reason for leaving (optional):</label>
            <Input
              type="textarea"
              placeholder="Please let us know how we can improve..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="bg-foreground/[0.02]"
              disabled={isDeleting}
            />
          </div>

          <div className="flex items-center gap-3 pt-4 justify-end">
            <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setConfirmPassword(''); setDeleteReason(''); }} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!confirmPassword.trim() || isDeleting}
              onClick={handleDeleteAccount}
              isLoading={isDeleting}
            >
              Schedule Deletion
            </Button>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <p className="text-center text-xs text-foreground/30 pt-4">
        Expenso · Version 1.0 · <a href="#" className="hover:text-foreground/60 transition-colors">Privacy Policy</a> · <a href="#" className="hover:text-foreground/60 transition-colors">Terms</a>
      </p>
    </div>
  );
}
