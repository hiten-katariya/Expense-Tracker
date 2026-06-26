import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { 
  useNotifications, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead, 
  useDeleteNotification, 
  useBulkDeleteNotifications 
} from '@/hooks/useQueries';
import { TextReveal } from '@/components/ui/cascade-text';
import { Card, CardContent } from '@/components/Card';
import { Button, IconButton } from '@/components/Button';
import { Select } from '@/components/Input';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { 
  Bell, 
  Target, 
  AlertTriangle, 
  Activity, 
  Calendar, 
  Check, 
  Trash2, 
  Clock, 
  Search, 
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Users
} from 'lucide-react';
import { NotificationSkeleton } from '@/components/Skeleton';
import type { Notification } from '@/types';

const ITEMS_PER_PAGE = 20;

export function NotificationsPage() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const addNotification = useUIStore((s) => s.addNotification);

  // Queries and mutations
  const { data: notifications, isLoading } = useNotifications(userId);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const bulkDelete = useBulkDeleteNotifications();

  // Component states
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Mark all as read handler
  const handleMarkAllRead = async () => {
    if (!userId) return;
    try {
      await markAllRead.mutateAsync({ userId });
      addNotification({ type: 'success', title: 'Success', message: 'All notifications marked as read.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to mark all as read.' });
    }
  };

  // Mark single as read
  const handleMarkRead = async (id: string) => {
    if (!userId) return;
    try {
      await markRead.mutateAsync({ id, userId });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to mark notification as read.' });
    }
  };

  // Delete single notification
  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!window.confirm('Delete this notification?')) return;
    try {
      await deleteNotification.mutateAsync({ id, userId });
      setSelectedIds(prev => prev.filter(item => item !== id));
      addNotification({ type: 'success', title: 'Deleted', message: 'Notification removed.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete notification.' });
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!userId || selectedIds.length === 0) return;
    if (!window.confirm(`Delete the ${selectedIds.length} selected notifications?`)) return;
    try {
      await bulkDelete.mutateAsync({ ids: selectedIds, userId });
      setSelectedIds([]);
      addNotification({ type: 'success', title: 'Deleted', message: 'Selected notifications removed.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete selected notifications.' });
    }
  };

  const handleBulkMarkRead = async () => {
    if (!userId || selectedIds.length === 0) return;
    try {
      // Mark each of selected unread notifications as read
      const unreadSelected = notifications?.filter(n => selectedIds.includes(n.id) && !n.is_read) || [];
      await Promise.all(unreadSelected.map(n => markRead.mutateAsync({ id: n.id, userId })));
      setSelectedIds([]);
      addNotification({ type: 'success', title: 'Success', message: 'Selected notifications marked as read.' });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to update selected notifications.' });
    }
  };

  // Toggle single selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select all visible notifications on current page
  const handleToggleSelectAll = (visibleItems: Notification[]) => {
    const visibleIds = visibleItems.map(item => item.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  // Filter and Search logic
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    return notifications.filter(n => {
      // Filter by Tab
      if (activeTab === 'unread' && n.is_read) return false;
      if (activeTab === 'read' && !n.is_read) return false;

      // Filter by Type
      if (selectedType !== 'all' && n.type !== selectedType) return false;

      // Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(query);
        const matchesBody = n.message.toLowerCase().includes(query);
        return matchesTitle || matchesBody;
      }

      return true;
    });
  }, [notifications, activeTab, selectedType, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotifications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredNotifications, currentPage]);

  // Adjust page number if filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedType, searchQuery]);

  // Helpers for relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Helpers for type indicators
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'budget':
        return {
          icon: Target,
          bg: 'bg-red-500/10 text-red-500 border-red-500/20',
          label: 'Budget Alert',
          priority: 'high'
        };
      case 'anomaly':
        return {
          icon: AlertTriangle,
          bg: 'bg-rose-500/15 text-rose-500 border-rose-500/20',
          label: 'Anomaly Alert',
          priority: 'critical'
        };
      case 'summary':
        return {
          icon: Activity,
          bg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
          label: 'Summary Details',
          priority: 'medium'
        };
      case 'reminder':
        return {
          icon: Clock,
          bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          label: 'Expense Reminder',
          priority: 'medium'
        };
      case 'verification':
        return {
          icon: ShieldAlert,
          bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          label: 'Security Verification',
          priority: 'high'
        };
      case 'family_invite':
        return {
          icon: Users,
          bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
          label: 'Family Activity',
          priority: 'medium'
        };
      default:
        return {
          icon: Bell,
          bg: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
          label: 'General Notice',
          priority: 'low'
        };
    }
  };

  const notificationTypes = [
    { value: 'all', label: 'All Categories' },
    { value: 'budget', label: 'Budget Alerts' },
    { value: 'anomaly', label: 'Anomaly Alerts' },
    { value: 'summary', label: 'System Summaries' },
    { value: 'reminder', label: 'Expense Reminders' },
    { value: 'verification', label: 'Verification Alerts' },
    { value: 'family_invite', label: 'Family Invites' }
  ];

  const totalUnreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <TextReveal
            text="Notifications"
            subtitle="Manage your alerts, reminders, and category budget summaries"
            textSize="text-2xl"
          />
        </div>
        {totalUnreadCount > 0 && (
          <Button 
            variant="secondary" 
            leftIcon={<CheckCheck className="h-4 w-4" />} 
            onClick={handleMarkAllRead}
            className="self-start sm:self-auto"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs & Filters Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex bg-foreground/5 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300",
                  activeTab === 'all'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center gap-1.5",
                  activeTab === 'unread'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                Unread
                {totalUnreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('read')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300",
                  activeTab === 'read'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                Read
              </button>
            </div>

            {/* Inputs */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-foreground/10 bg-background pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <Select
                options={notificationTypes}
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full sm:w-48 py-2 px-3 text-xs"
              />
            </div>
          </div>

          {/* Bulk Action Controls */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-primary-500/5 border border-primary-500/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden"
              >
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                  {selectedIds.length} items selected
                </span>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    leftIcon={<Check className="h-3.5 w-3.5" />} 
                    onClick={handleBulkMarkRead}
                  >
                    Mark read
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />} 
                    onClick={handleBulkDelete}
                  >
                    Delete selected
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Notifications List Container */}
      <Card>
        {isLoading ? (
          <div className="p-4 divide-y divide-foreground/5 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="flex flex-col">
            {/* Header select-all bar */}
            <div className="flex items-center gap-4 px-6 py-3 border-b border-foreground/5 bg-foreground/[0.01]">
              <input
                type="checkbox"
                checked={paginatedItems.every(item => selectedIds.includes(item.id))}
                onChange={() => handleToggleSelectAll(paginatedItems)}
                className="h-4 w-4 rounded border-slate-200 dark:border-white/10 bg-white dark:bg-bg-deep/40 text-primary-500 focus:ring-primary-500/20"
              />
              <span className="text-xs font-semibold text-foreground/50 select-none">
                Select Page ({paginatedItems.length} items)
              </span>
            </div>

            {/* List */}
            <div className="divide-y divide-foreground/5">
              <AnimatePresence initial={false}>
                {paginatedItems.map((n) => {
                  const config = getTypeConfig(n.type);
                  const Icon = config.icon;
                  const isSelected = selectedIds.includes(n.id);

                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
                      className={cn(
                        "flex items-start gap-4 p-5 transition-colors duration-200 relative group",
                        !n.is_read && "bg-primary-500/[0.01] dark:bg-primary-500/[0.005]"
                      )}
                    >
                      {/* Checkbox select */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(n.id)}
                        className="h-4 w-4 rounded border-slate-200 dark:border-white/10 bg-white dark:bg-bg-deep/40 text-primary-500 focus:ring-primary-500/20 mt-1 shrink-0"
                      />

                      {/* Icon */}
                      <div className={cn("h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm", config.bg)}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h4 className={cn("text-sm font-semibold truncate", !n.is_read ? "text-foreground font-extrabold" : "text-foreground/75")}>
                            {n.title}
                          </h4>
                          
                          {/* Priority badge */}
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider border",
                            config.priority === 'critical' && "bg-red-500/10 text-red-500 border-red-500/20",
                            config.priority === 'high' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                            config.priority === 'medium' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                            config.priority === 'low' && "bg-slate-500/10 text-slate-500 border-slate-500/20"
                          )}>
                            {config.priority}
                          </span>

                          {!n.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                          )}
                        </div>
                        <p className="text-xs text-foreground/60 leading-relaxed break-words">{n.message}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-foreground/45 pt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatRelativeTime(n.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!n.is_read && (
                          <IconButton
                            size="sm"
                            title="Mark as read"
                            onClick={() => handleMarkRead(n.id)}
                            className="text-primary-500 hover:bg-primary-500/10"
                          >
                            <Check className="h-4 w-4" />
                          </IconButton>
                        )}
                        <IconButton
                          size="sm"
                          variant="danger"
                          title="Delete notification"
                          onClick={() => handleDelete(n.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/5 bg-foreground/[0.01]">
                <p className="text-xs text-foreground/50">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredNotifications.length)} of {filteredNotifications.length} notifications
                </p>
                <div className="flex items-center gap-2">
                  <IconButton
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </IconButton>
                  <span className="text-xs font-semibold text-foreground/75">
                    Page {currentPage} of {totalPages}
                  </span>
                  <IconButton
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 max-w-sm mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto text-foreground/30 animate-pulse">
              <Bell className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">All caught up!</p>
              <p className="text-xs text-foreground/45 mt-1 leading-relaxed">
                {searchQuery || selectedType !== 'all' 
                  ? 'No notifications match your active search terms or category filters.'
                  : 'You have no notifications or alerts at this time. We will notify you when things happen!'}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
