import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Lenis from 'lenis';
import { useAuthStore, handleAuthStateChange } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Layout } from '@/components/Layout';
import { Toast } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';
import { Toaster } from 'sonner';

// Pages
import { HomePage } from '@/pages/Home';
import { LoginPage, RegisterPage } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { ExpensesPage, ExpenseFormPage } from '@/pages/Expenses';
import { CategoriesPage } from '@/pages/Categories';
import { BudgetsPage } from '@/pages/Budgets';
import { ReportsPage } from '@/pages/Reports';
import { FamilyPage } from '@/pages/Family';
import { FamilyDashboardPage } from '@/pages/FamilyDashboard';
import { FamilyMembersPage } from '@/pages/FamilyMembers';
import { FamilyInvitesPage } from '@/pages/FamilyInvites';
import { FamilyExpensesPage } from '@/pages/FamilyExpenses';
import { FamilyBudgetsPage } from '@/pages/FamilyBudgets';
import { FamilyReportsPage } from '@/pages/FamilyReports';
import { FamilySettingsPage } from '@/pages/FamilySettings';
import { FamilyJoinPage } from '@/pages/FamilyJoin';
import { FamilyExpenseFormPage } from '@/pages/FamilyExpenseForm';
import { FamilyTrashPage } from '@/pages/FamilyTrash';
import { FamilyActivityPage } from '@/pages/FamilyActivity';
import { SettingsPage } from '@/pages/Settings';
import { TrashPage } from '@/pages/Trash';
import { CsvImportPage } from '@/pages/CsvImport';
import OnboardingPage from '@/pages/Onboarding';
import VerifyEmailPage from '@/pages/VerifyEmail';
import { NotificationsPage } from '@/pages/Notifications';
import ForgotPasswordPage from '@/pages/ForgotPassword';
import ResetPasswordPage from '@/pages/ResetPassword';

// Admin Pages
import { AdminLayout } from '@/components/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminUserDetail from '@/pages/admin/AdminUserDetail';
import AdminExpenses from '@/pages/admin/AdminExpenses';
import AdminBudgets from '@/pages/admin/AdminBudgets';
import AdminFamilies from '@/pages/admin/AdminFamilies';
import AdminWorkspaces from '@/pages/admin/AdminWorkspaces';
import AdminAIUsage from '@/pages/admin/AdminAIUsage';
import AdminOCRUsage from '@/pages/admin/AdminOCRUsage';
import AdminEmailLogs from '@/pages/admin/AdminEmailLogs';
import AdminNotifications from '@/pages/admin/AdminNotifications';
import AdminAuditLogs from '@/pages/admin/AdminAuditLogs';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminSystemHealth from '@/pages/admin/AdminSystemHealth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function RequireAuthOnly({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-[0.05] pointer-events-none" />
        <div className="text-center relative z-10">
          <div className="h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_15px_rgba(99,102,241,0.25)]" />
          <p className="text-foreground/65 font-semibold tracking-wide">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-[0.05] pointer-events-none" />
        <div className="text-center relative z-10">
          <div className="h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_15px_rgba(99,102,241,0.25)]" />
          <p className="text-foreground/65 font-semibold tracking-wide">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const isEmailVerified = !!user?.email_confirmed_at;
  const isProfileComplete = !!(
    profile &&
    profile.full_name &&
    profile.phone_number &&
    profile.city &&
    profile.state &&
    profile.country &&
    profile.pincode &&
    profile.preferred_currency
  );

  if (!isEmailVerified || !isProfileComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Stealth Admin Route: shows 404 for non-admins, never reveals admin exists
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isInitialized, refreshProfile } = useAuthStore();
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verifyAttempted, setVerifyAttempted] = React.useState(false);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const emailMatches = !!user && !!adminEmail &&
    user.email?.toLowerCase() === adminEmail.toLowerCase();

  // When email matches but is_admin is not set (fresh OAuth registration),
  // trigger backend auto-promotion then refresh the local profile.
  React.useEffect(() => {
    if (!isInitialized || !emailMatches || profile?.is_admin || verifyAttempted) return;

    let cancelled = false;
    setIsVerifying(true);

    (async () => {
      try {
        // Hit any admin endpoint — requireAdmin middleware will auto-promote
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/admin/stats', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
        // Refresh profile to pick up is_admin = true from DB
        await refreshProfile();
      } catch {
        // Silently fail — will fall through to 404
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
          setVerifyAttempted(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isInitialized, emailMatches, profile?.is_admin, verifyAttempted, refreshProfile]);

  if (!isInitialized || isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show 404 for non-admins — NEVER show 403 or redirect to login
  if (!user || !profile?.is_admin || !emailMatches) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 grid-bg opacity-[0.04] dark:opacity-[0.07]" />
        <div className="text-center relative z-10 space-y-4">
          <p className="text-7xl font-black text-foreground/10">404</p>
          <p className="text-lg font-semibold text-foreground/60">Page not found</p>
          <p className="text-sm text-foreground/40">The page you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  const { initialize, isInitialized, user, signOut } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Global Session Idle Timeout (15 minutes of inactivity)
  useEffect(() => {
    if (!user) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleLogout, 15 * 60 * 1000);
    };

    const handleLogout = () => {
      console.log('Session idle timeout expired. Logging out.');
      signOut();
      addNotification({
        type: 'error',
        title: 'Session Expired',
        message: 'You have been signed out due to inactivity.',
      });
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'click', 'touchstart'];
    
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, signOut, addNotification]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthStateChange(event, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-[0.05] pointer-events-none" />
        <div className="text-center relative z-10 flex flex-col items-center">
          <div className="relative h-16 w-16 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-primary-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-t-primary-500 rounded-full animate-spin" />
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain rounded-lg shadow-lg" />
          </div>
          <p className="text-foreground/65 font-semibold tracking-wide flex items-center justify-center gap-1">
            Loading <span className="font-mono tracking-[0.15em] font-black bg-gradient-to-r from-[#06B6D4] via-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent">Expenso</span>...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <HomePage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Onboarding Route */}
      <Route
        path="/onboarding"
        element={
          <RequireAuthOnly>
            <OnboardingPage />
          </RequireAuthOnly>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Layout>
              <ExpensesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/new"
        element={
          <ProtectedRoute>
            <Layout>
              <ExpenseFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <ExpenseFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Layout>
              <CategoriesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <ProtectedRoute>
            <Layout>
              <BudgetsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <ReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/join"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyJoinPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/expenses/new"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyExpenseFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/expenses/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyExpenseFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/trash"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyTrashPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/activity"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyActivityPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyDashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/members"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyMembersPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/invites"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyInvitesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/expenses"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyExpensesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/budgets"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyBudgetsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilyReportsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <FamilySettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout>
              <NotificationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/trash"
        element={
          <ProtectedRoute>
            <Layout>
              <TrashPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/import"
        element={
          <ProtectedRoute>
            <Layout>
              <CsvImportPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Stealth Admin Routes — shows 404 for non-admins */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/users/:id" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
      <Route path="/admin/expenses" element={<AdminRoute><AdminExpenses /></AdminRoute>} />
      <Route path="/admin/budgets" element={<AdminRoute><AdminBudgets /></AdminRoute>} />
      <Route path="/admin/families" element={<AdminRoute><AdminFamilies /></AdminRoute>} />
      <Route path="/admin/workspaces" element={<AdminRoute><AdminWorkspaces /></AdminRoute>} />
      <Route path="/admin/ai-usage" element={<AdminRoute><AdminAIUsage /></AdminRoute>} />
      <Route path="/admin/ocr-usage" element={<AdminRoute><AdminOCRUsage /></AdminRoute>} />
      <Route path="/admin/email-logs" element={<AdminRoute><AdminEmailLogs /></AdminRoute>} />
      <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
      <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
      <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
      <Route path="/admin/system-health" element={<AdminRoute><AdminSystemHealth /></AdminRoute>} />

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ToastContainer() {
  const notifications = useUIStore((s) => s.notifications);
  const removeNotification = useUIStore((s) => s.removeNotification);

  const [visibleNotification, setVisibleNotification] = React.useState<typeof notifications[0] | null>(null);

  useEffect(() => {
    if (notifications.length > 0) {
      setVisibleNotification(notifications[notifications.length - 1]);
    } else {
      setVisibleNotification(null);
    }
  }, [notifications]);

  if (!visibleNotification) return null;

  return (
    <Toast
      notification={visibleNotification}
      onClose={() => removeNotification(visibleNotification.id)}
    />
  );
}

function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = React.useState('');

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setAnnouncement('Navigated to Home page');
    } else {
      const pageName = path
        .split('/')
        .filter(Boolean)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
      setAnnouncement(`Navigated to ${pageName} page`);
    }
  }, [location]);

  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {announcement}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <RouteAnnouncer />
        <AppRoutes />
        <ToastContainer />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
