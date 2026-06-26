import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import {
  LayoutDashboard, Users, Receipt, Target, Users2, Building2, Brain,
  ScanLine, Mail, Bell, ScrollText, BarChart3, Activity, Shield,
  ArrowLeft, Menu, X, Sun, Moon
} from 'lucide-react';

const adminNav = [
  { path: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/expenses', icon: Receipt, label: 'Expenses' },
  { path: '/admin/budgets', icon: Target, label: 'Budgets' },
  { path: '/admin/families', icon: Users2, label: 'Families' },
  { path: '/admin/workspaces', icon: Building2, label: 'Workspaces' },
  { path: '/admin/ai-usage', icon: Brain, label: 'AI Usage' },
  { path: '/admin/ocr-usage', icon: ScanLine, label: 'Receipt OCR' },
  { path: '/admin/email-logs', icon: Mail, label: 'Email Logs' },
  { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { path: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/admin/system-health', icon: Activity, label: 'System Health' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { darkMode, toggleDarkMode } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  return (
    <div className="h-screen bg-background text-foreground flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-red-500/8 to-amber-500/5 blur-3xl blob-animate-1" />
        <div className="absolute top-1/3 -right-48 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-orange-500/6 to-red-500/4 blur-3xl blob-animate-2" />
        <div className="fixed inset-0 grid-bg opacity-[0.04] dark:opacity-[0.07]" />
      </div>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="h-screen bg-card/50 backdrop-blur-xl border-r border-foreground/10 flex-shrink-0 z-30 hidden lg:flex flex-col select-none overflow-y-auto overflow-x-hidden sticky top-0 overscroll-contain"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-foreground/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield className="h-4 w-4 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
                <span className="text-sm font-bold text-foreground">Admin Panel</span>
                <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Read Only</span>
              </motion.div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors">
            <Menu className="h-4 w-4 text-foreground/50" />
          </button>
        </div>

        {/* Back to App */}
        <div className="px-3 pt-3">
          <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-all">
            <ArrowLeft className="h-3.5 w-3.5" />
            {sidebarOpen && <span>Back to App</span>}
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {adminNav.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/admin';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-red-500/15 to-amber-500/10 border border-red-500/25 text-foreground shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
                )}
              >
                <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-red-400' : '')} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="p-3 border-t border-foreground/5">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {sidebarOpen && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-card/60 backdrop-blur-xl border-b border-foreground/10 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-foreground/5"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-foreground/5"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div
            className="fixed top-0 left-0 h-full w-72 bg-card/95 backdrop-blur-2xl z-50 lg:hidden overflow-y-auto border-r border-foreground/10"
            role="dialog"
            aria-modal="true"
            aria-label="Admin Navigation"
          >
            <div className="p-4 border-b border-foreground/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-400" />
                <span className="font-bold text-sm">Admin Panel</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-foreground/5"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground/50 hover:text-foreground hover:bg-foreground/5">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to App
              </Link>
            </div>
            <nav className="px-3 py-1 space-y-0.5">
              {adminNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-red-500/15 to-amber-500/10 border border-red-500/25 text-foreground'
                      : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className="flex-1 overflow-y-auto relative z-10 outline-none"
      >
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
