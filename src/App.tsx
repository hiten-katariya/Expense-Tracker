import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Lenis from 'lenis';
import { useAuthStore, handleAuthStateChange } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Layout } from '@/components/Layout';
import { Toast } from '@/components/Modal';
import { useUIStore } from '@/stores/uiStore';

// Pages
import { HomePage } from '@/pages/Home';
import { LoginPage, RegisterPage } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { ExpensesPage, ExpenseFormPage } from '@/pages/Expenses';
import { CategoriesPage } from '@/pages/Categories';
import { BudgetsPage } from '@/pages/Budgets';
import { ReportsPage } from '@/pages/Reports';
import { FamilyPage } from '@/pages/Family';
import { SettingsPage } from '@/pages/Settings';
import { TrashPage } from '@/pages/Trash';
import { CsvImportPage } from '@/pages/CsvImport';
import OnboardingPage from '@/pages/Onboarding';
import VerifyEmailPage from '@/pages/VerifyEmail';

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

function AppRoutes() {
  const { initialize, isInitialized, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

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
        <div className="text-center relative z-10">
          <div className="h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_15px_rgba(99,102,241,0.25)]" />
          <p className="text-foreground/65 font-semibold tracking-wide">Loading Expense Tracker...</p>
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
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
