import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotifications } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Receipt, FolderOpen, Target, ChartPie as PieChart, Settings, Users, LogOut, Menu, X, Bell, Search, Sun, Moon, Trash2 } from 'lucide-react';
import { IconButton } from './Button';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/expenses', icon: Receipt, label: 'Expenses' },
  { path: '/categories', icon: FolderOpen, label: 'Categories' },
  { path: '/budgets', icon: Target, label: 'Budgets' },
  { path: '/reports', icon: PieChart, label: 'Reports' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/family', icon: Users, label: 'Family' },
  { path: '/trash', icon: Trash2, label: 'Trash' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, workspace, signOut } = useAuthStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const { data: notifications } = useNotifications(user?.id);
  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;
  const queryClient = useQueryClient();

  const workspaceId = workspace?.id;

  React.useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  React.useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel('realtime-expenses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
          queryClient.invalidateQueries({ queryKey: ['budgets'] });
          queryClient.invalidateQueries({ queryKey: ['trash'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row relative">
      {/* Premium Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-primary-500/10 to-primary-700/5 blur-3xl blob-animate-1" />
        <div className="absolute top-1/3 -right-48 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-secondary-500/8 to-accent-pink/5 blur-3xl blob-animate-2" />
        <div className="absolute -bottom-48 left-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-primary-700/8 to-secondary-600/5 blur-3xl blob-animate-3" />
        <div className="fixed inset-0 grid-bg opacity-[0.04] dark:opacity-[0.07]" />
      </div>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-screen bg-card/50 backdrop-blur-xl border-r border-foreground/10 transition-all z-30 hidden lg:flex flex-col select-none"
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-foreground/5 flex-shrink-0">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                key="expanded-title"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2.5"
              >
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary-500/30">
                  ET
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-500 bg-clip-text text-transparent tracking-tight">
                  Expense Tracker
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary-500/30"
              >
                ET
              </motion.div>
            )}
          </AnimatePresence>
          <IconButton
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="ghost"
            className="text-foreground/60 hover:text-foreground hover:bg-foreground/5"
          >
            <Menu className="h-5 w-5" />
          </IconButton>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors duration-300 group outline-none"
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  {/* Sliding capsule indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-gradient-to-r from-primary-500/15 to-primary-600/10 border border-primary-500/25 rounded-xl z-0 shadow-[0_0_20px_rgba(99,102,241,0.12)]"
                    />
                  )}
                  <div className="relative z-10 flex items-center justify-center">
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-300",
                      isActive ? "text-white" : "text-foreground/50 group-hover:text-foreground"
                    )} />
                    {item.path === '/notifications' && unreadCount > 0 && !sidebarOpen && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-gradient-to-r from-rose-500 to-red-600 rounded-full border border-card" />
                    )}
                  </div>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        className={cn(
                          "z-10 transition-colors duration-300 text-sm flex-1 flex items-center justify-between",
                          isActive ? "text-primary-600 dark:text-white font-semibold" : "text-foreground/60 group-hover:text-foreground"
                        )}
                      >
                        <span>{item.label}</span>
                        {item.path === '/notifications' && unreadCount > 0 && (
                          <span className="ml-2 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                            {unreadCount}
                          </span>
                        )}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Settings and Sign Out */}
        <div className="p-4 border-t border-foreground/5 bg-foreground/[0.01] flex-shrink-0">
          <NavLink
            to="/settings"
            className="relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors duration-300 group outline-none"
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-primary-500/10 border border-primary-500/20 rounded-xl z-0"
                  />
                )}
                <Settings className={cn(
                  "h-5 w-5 flex-shrink-0 z-10 transition-colors duration-300",
                  isActive ? "text-primary-600 dark:text-primary-400" : "text-foreground/50 group-hover:text-foreground"
                )} />
                {sidebarOpen && (
                  <span className={cn(
                    "z-10 transition-colors duration-300",
                    isActive ? "text-primary-600 dark:text-white font-semibold" : "text-foreground/60 group-hover:text-foreground"
                  )}>
                    Settings
                  </span>
                )}
              </>
            )}
          </NavLink>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground w-full mt-2 transition-all duration-300 group outline-none"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-foreground/50 group-hover:text-red-500 transition-colors duration-300" />
            {sidebarOpen && <span className="group-hover:text-foreground">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card/85 backdrop-blur-xl border-b border-foreground/10 dark:border-white/5 flex items-center justify-between px-4 z-30 select-none">
        <IconButton onClick={() => setMobileMenuOpen(true)} className="text-foreground/80">
          <Menu className="h-5 w-5" />
        </IconButton>
        <span className="text-md font-bold bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-500 bg-clip-text text-transparent">
          Expense Tracker
        </span>
        <div className="flex items-center gap-2">
          <IconButton 
            onClick={toggleDarkMode}
            className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 p-2 rounded-xl"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </IconButton>
          <Link to="/notifications" className="relative">
            <IconButton className="text-foreground/80 p-2">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-rose-500 to-red-600 rounded-full text-[9px] font-black text-white flex items-center justify-center border border-card shadow-sm">
                  {unreadCount}
                </span>
              )}
            </IconButton>
          </Link>
          <Link to="/settings" className="h-8 w-8 block rounded-xl bg-gradient-to-tr from-primary-500 to-secondary-500 p-[1.5px] shadow-[0_0_10px_rgba(99,102,241,0.2)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300 cursor-pointer">
            <div className="h-full w-full rounded-[9px] bg-card flex items-center justify-center text-foreground font-extrabold text-xs border border-foreground/10">
              {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
            </div>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-72 bg-card/95 backdrop-blur-2xl border-r border-foreground/10 z-50 flex flex-col select-none"
            >
              <div className="h-16 flex items-center justify-between px-5 border-b border-foreground/5">
                <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-secondary-500 bg-clip-text text-transparent">
                  Expense Tracker
                </span>
                <IconButton
                  onClick={() => setMobileMenuOpen(false)}
                  variant="ghost"
                  className="text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                >
                  <X className="h-5 w-5" />
                </IconButton>
              </div>
              <nav className="p-4 space-y-2 flex-grow overflow-y-auto">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }: { isActive: boolean }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
                        isActive
                          ? 'bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                          : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-foreground/5 bg-foreground/[0.01]">
                <NavLink
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }: { isActive: boolean }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300',
                      isActive
                        ? 'bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-white'
                        : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground'
                    )
                  }
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </NavLink>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/60 hover:bg-foreground/5 hover:text-foreground w-full mt-2 transition-all duration-300"
                >
                  <LogOut className="h-5 w-5 text-foreground/60 hover:text-red-500 transition-colors" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Pane */}
      <main
        className={cn(
          'transition-all duration-300 flex-1 relative z-10 min-h-screen flex flex-col',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-20',
          'pt-16 lg:pt-0'
        )}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 bg-card/75 dark:bg-background/45 backdrop-blur-xl border-b border-foreground/10 dark:border-white/5 select-none">
          <div className="w-full max-w-[1440px] mx-auto h-full flex items-center justify-between px-6 lg:px-8">
            <div className="flex-1 max-w-lg">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 group-hover:text-foreground/65 transition-colors" />
                <input
                  type="text"
                  placeholder="Search expenses, budgets..."
                  className="w-full max-w-sm rounded-xl border border-foreground/10 dark:border-white/5 bg-background pl-11 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/50 transition-all duration-300"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <IconButton 
                onClick={toggleDarkMode}
                className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 p-2 rounded-xl"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </IconButton>

              <Link to="/notifications" className="relative">
                <IconButton className="text-foreground/60 hover:bg-foreground/5 p-2 rounded-xl">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-rose-500 to-red-600 rounded-full text-[9px] font-black text-white flex items-center justify-center border-2 border-card shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </IconButton>
              </Link>

              <div className="h-8 w-px bg-foreground/10" />

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="font-semibold text-sm text-foreground">
                    {profile?.full_name || profile?.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground/60 tracking-wider uppercase">
                    Personal Account
                  </span>
                </div>
                <Link to="/settings" className="h-9 w-9 block rounded-xl bg-gradient-to-tr from-primary-500 to-secondary-500 p-[1.5px] shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-300 cursor-pointer">
                  <div className="h-full w-full rounded-[10px] bg-card flex items-center justify-center text-foreground font-extrabold text-sm border border-foreground/10">
                    {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Area Wrapper */}
        <div className="p-6 lg:p-8 flex-1 flex flex-col relative z-10 max-w-[1440px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
