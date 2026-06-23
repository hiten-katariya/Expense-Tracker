export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  currency_code: string;
  role: 'admin' | 'member' | 'viewer';
  mfa_enabled: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  phone_number?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  preferred_currency?: string;
  email_verified?: boolean;
  profile_completed?: boolean;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  default_currency_code: string;
  is_personal: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  profile_id: string;
  member_role: 'admin' | 'member' | 'viewer';
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Category {
  id: string;
  workspace_id: string;
  created_by: string | null;
  parent_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  monthly_limit: number | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export interface Expense {
  id: string;
  workspace_id: string;
  family_id: string | null;
  user_id: string;
  category_id: string | null;
  expense_scope: 'personal' | 'family';
  title: string;
  notes: string | null;
  amount: number;
  currency_code: string;
  amount_in_base_currency: number | null;
  expense_date: string;
  payment_method: 'cash' | 'card' | 'upi' | 'netbanking' | 'other';
  tags: string[];
  receipt_url: string | null;
  ai_category_suggestion: string | null;
  ai_confidence: number | null;
  is_recurring: boolean;
  recurring_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  is_flagged: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  import_source: 'manual' | 'csv' | 'ai' | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  profile?: Profile;
}

export interface Family {
  id: string;
  owner_id: string;
  name: string;
  monthly_budget: number | null;
  currency_code: string;
  invite_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  profile_id: string;
  member_role: 'admin' | 'member';
  display_name: string | null;
  joined_at: string;
  created_at: string;
  profile?: Profile;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  invited_email: string;
  invited_by: string;
  invite_token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  workspace_id: string;
  category_id: string | null;
  family_id: string | null;
  created_by: string | null;
  budget_type: 'monthly' | 'yearly';
  amount: number;
  currency_code: string;
  starts_on: string;
  ends_on: string | null;
  alert_50_sent_at: string | null;
  alert_80_sent_at: string | null;
  alert_100_sent_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  name?: string | null;
  notes?: string | null;
  alerts?: boolean;
  scope?: 'personal' | 'family';
}

export interface Notification {
  id: string;
  workspace_id: string | null;
  user_id: string;
  type: 'budget' | 'anomaly' | 'summary' | 'reminder' | 'verification' | 'family_invite';
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  family_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface MonthlySummary {
  total_spent: number;
  budget_remaining: number | null;
  category_breakdown: CategoryBreakdown[];
  daily_average: number;
  projected_total: number;
  month_over_month_delta: number | null;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  total: number;
  percentage: number;
  count: number;
}

export interface ExpenseFilters {
  category_id?: string;
  date_from?: string;
  date_to?: string;
  payment_method?: string;
  amount_min?: number;
  amount_max?: number;
  tags?: string[];
  search?: string;
  expense_scope?: 'personal' | 'family';
  is_recurring?: boolean;
  import_source?: 'manual' | 'csv' | 'ai';
  has_notes?: boolean;
  has_ai_categorized?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: ExpenseFilters;
  createdAt: string;
}

export interface ImportedRow {
  _rowIndex: number;
  title: string;
  amount: number;
  expense_date: string;
  category_id?: string | null;
  payment_method?: string;
  notes?: string | null;
  tags?: string[];
  _valid: boolean;
  _errors: string[];
  _duplicateScore: number;
  _skip: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#E74C3C' },
  { name: 'Transport', icon: '🚗', color: '#3498DB' },
  { name: 'Housing', icon: '🏠', color: '#9B59B6' },
  { name: 'Health', icon: '💊', color: '#27AE60' },
  { name: 'Entertainment', icon: '🎬', color: '#E67E22' },
  { name: 'Shopping', icon: '🛒', color: '#1ABC9C' },
  { name: 'Education', icon: '📚', color: '#34495E' },
  { name: 'Utilities', icon: '💡', color: '#F39C12' },
  { name: 'Others', icon: '📦', color: '#95A5A6' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'netbanking', label: 'Net Banking', icon: '🏦' },
  { value: 'other', label: 'Other', icon: '📝' },
] as const;

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
] as const;
