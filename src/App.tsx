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

// Admin Pages — lazy-loaded so admin code is NEVER included in the main bundle.
// These chunks are only downloaded after successful admin authentication.
const LazyAdminLayout = React.lazy(() => import('@/components/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('@/pages/admin/AdminUsers'));
const AdminUserDetail = React.lazy(() => import('@/pages/admin/AdminUserDetail'));
const AdminExpenses = React.lazy(() => import('@/pages/admin/AdminExpenses'));
const AdminBudgets = React.lazy(() => import('@/pages/admin/AdminBudgets'));
const AdminFamilies = React.lazy(() => import('@/pages/admin/AdminFamilies'));
const AdminWorkspaces = React.lazy(() => import('@/pages/admin/AdminWorkspaces'));
const AdminAIUsage = React.lazy(() => import('@/pages/admin/AdminAIUsage'));
const AdminOCRUsage = React.lazy(() => import('@/pages/admin/AdminOCRUsage'));
const AdminEmailLogs = React.lazy(() => import('@/pages/admin/AdminEmailLogs'));
const AdminNotifications = React.lazy(() => import('@/pages/admin/AdminNotifications'));
const AdminAuditLogs = React.lazy(() => import('@/pages/admin/AdminAuditLogs'));
const AdminAnalytics = React.lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminSystemHealth = React.lazy(() => import('@/pages/admin/AdminSystemHealth'));

// Suspense fallback for lazy-loaded admin chunks
const AdminChunkFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

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
          const API = import.meta.env.VITE_API_URL || '';
          await fetch(`${API}/api/admin/stats`, {
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

  return (
    <React.Suspense fallback={<AdminChunkFallback />}>
      <LazyAdminLayout>{children}</LazyAdminLayout>
    </React.Suspense>
  );
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

      {/* Stealth Admin Routes — lazy-loaded, shows 404 for non-admins */}
      <Route path="/admin" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminDashboard /></React.Suspense></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminUsers /></React.Suspense></AdminRoute>} />
      <Route path="/admin/users/:id" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminUserDetail /></React.Suspense></AdminRoute>} />
      <Route path="/admin/expenses" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminExpenses /></React.Suspense></AdminRoute>} />
      <Route path="/admin/budgets" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminBudgets /></React.Suspense></AdminRoute>} />
      <Route path="/admin/families" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminFamilies /></React.Suspense></AdminRoute>} />
      <Route path="/admin/workspaces" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminWorkspaces /></React.Suspense></AdminRoute>} />
      <Route path="/admin/ai-usage" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminAIUsage /></React.Suspense></AdminRoute>} />
      <Route path="/admin/ocr-usage" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminOCRUsage /></React.Suspense></AdminRoute>} />
      <Route path="/admin/email-logs" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminEmailLogs /></React.Suspense></AdminRoute>} />
      <Route path="/admin/notifications" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminNotifications /></React.Suspense></AdminRoute>} />
      <Route path="/admin/audit-logs" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminAuditLogs /></React.Suspense></AdminRoute>} />
      <Route path="/admin/analytics" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminAnalytics /></React.Suspense></AdminRoute>} />
      <Route path="/admin/system-health" element={<AdminRoute><React.Suspense fallback={<AdminChunkFallback />}><AdminSystemHealth /></React.Suspense></AdminRoute>} />

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
