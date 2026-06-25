import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { triggerNotificationEvent } from '../email/notificationService.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Utility to find userId associated with an email to fetch their preferences
 */
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
      
    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const userId = await getUserIdByEmail(email);
  return await triggerNotificationEvent('verify_email', userId, { email, token });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const userId = await getUserIdByEmail(email);
  return await triggerNotificationEvent('welcome', userId, { email, name });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const userId = await getUserIdByEmail(email);
  return await triggerNotificationEvent('password_reset', userId, { email, token });
}

export async function sendBudgetAlertEmail(email: string, budgetName: string, limit: number, current: number) {
  const userId = await getUserIdByEmail(email);
  const percent = Math.round((current / limit) * 100);
  return await triggerNotificationEvent('budget_exceeded', userId, {
    email,
    budgetName,
    limit,
    current,
    threshold: percent
  });
}

export async function sendMonthlyReportEmail(email: string, month: string, summary: { totalSpent: number; savings: number }) {
  const userId = await getUserIdByEmail(email);
  return await triggerNotificationEvent('monthly_report_ready', userId, {
    email,
    month,
    totalSpent: summary.totalSpent,
    savings: summary.savings
  });
}

export async function sendFamilyInviteEmail(email: string, inviterName: string, familyName: string, inviteUrl: string) {
  const userId = await getUserIdByEmail(email);
  return await triggerNotificationEvent('family_invite_created', userId, {
    inviteeEmail: email,
    inviterName,
    familyName,
    inviteUrl
  });
}

export async function sendFamilyMonthlyReportEmail(
  email: string,
  familyName: string,
  month: string,
  summary: {
    totalSpent: number;
    highestSpender: string;
    topCategory: string;
    budgetUtilization: number;
    momChange: number;
    budgetLimit: number;
  }
) {
  const userId = await getUserIdByEmail(email);
  return await triggerNotificationEvent('family_monthly_summary', userId, {
    email,
    familyName,
    month,
    ...summary
  });
}
