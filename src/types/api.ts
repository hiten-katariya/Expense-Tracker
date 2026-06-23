import { z } from 'zod';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const PaginationSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
export type PaginationParams = z.infer<typeof PaginationSchema>;

// Shared Base Model Types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface Expense extends BaseEntity {
  userId: string;
  familyId?: string;
  amount: number;
  categoryId: string;
  date: string;
  description: string;
  receiptUrl?: string;
  isRecurring: boolean;
}

export interface Category extends BaseEntity {
  userId: string;
  name: string;
  color: string;
  icon: string;
  type: 'income' | 'expense';
}

export interface Budget extends BaseEntity {
  userId: string;
  categoryId?: string;
  name: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
}

export interface Family extends BaseEntity {
  name: string;
  ownerId: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user?: User;
}

export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: 'alert' | 'info' | 'invite';
  linkUrl?: string;
}
