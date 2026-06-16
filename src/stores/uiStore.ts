import { create } from 'zustand';
import type { ExpenseFilters, SortConfig } from '@/types';

interface UIState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  addExpenseDrawerOpen: boolean;
  expenseToEdit: string | null;
  settingsOpen: boolean;
  darkMode: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>;

  filters: ExpenseFilters;
  sortConfig: SortConfig;
  currentPage: number;

  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setAddExpenseDrawerOpen: (open: boolean) => void;
  setExpenseToEdit: (id: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  setFilters: (filters: ExpenseFilters) => void;
  resetFilters: () => void;
  setSortConfig: (config: SortConfig) => void;
  setCurrentPage: (page: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileMenuOpen: false,
  addExpenseDrawerOpen: false,
  expenseToEdit: null,
  settingsOpen: false,
  darkMode: false,
  notifications: [],
  filters: {},
  sortConfig: { field: 'expense_date', direction: 'desc' },
  currentPage: 1,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setAddExpenseDrawerOpen: (open) => set({ addExpenseDrawerOpen: open }),
  setExpenseToEdit: (id) => set({ expenseToEdit: id }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode;
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { darkMode: newDarkMode };
  }),

  addNotification: (notification) => set((state) => ({
    notifications: [
      ...state.notifications,
      { ...notification, id: Date.now().toString() }
    ]
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),

  setFilters: (filters) => set({ filters, currentPage: 1 }),
  resetFilters: () => set({ filters: {}, currentPage: 1 }),
  setSortConfig: (config) => set({ sortConfig: config }),
  setCurrentPage: (page) => set({ currentPage: page }),
}));
