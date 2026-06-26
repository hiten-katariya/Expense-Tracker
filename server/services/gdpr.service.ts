import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { ZipArchive } from 'archiver';
import type { Response } from 'express';
import Papa from 'papaparse';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.SERVICE_ROLE_KEY || 
                           supabaseAnonKey;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Verifies user credentials for deletion confirmation
 */
export async function verifyUserPassword(email: string, password: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      return false;
    }
    return true;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Formats data helper for CSV (handles empty/null gracefully)
 */
function unparseData(data: any): string {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return '';
  }
  const cleanData = Array.isArray(data) ? data : [data];
  return Papa.unparse(cleanData);
}

/**
 * Generates structured GDPR Export in JSON and CSV format within a ZIP archive
 */
export async function generateGdprExport(userId: string, res: Response): Promise<void> {
  const archive = new ZipArchive({ zlib: { level: 9 } });

  // Handle archive errors
  archive.on('error', (err) => {
    throw err;
  });

  // Pipe archive directly to Express response stream
  archive.pipe(res);

  // Helper helper to fetch table data
  const fetchTable = async (table: string, filterField: string, val: string) => {
    const { data } = await supabaseAdmin.from(table).select('*').eq(filterField, val);
    return data || [];
  };

  try {
    // 1. Fetch Profile
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle();
    const profileData = profile || {};
    archive.append(JSON.stringify(profileData, null, 2), { name: 'profile.json' });
    archive.append(unparseData(profileData), { name: 'profile.csv' });

    // 2. Fetch Expenses
    const expenses = await fetchTable('expenses', 'user_id', userId);
    archive.append(JSON.stringify(expenses, null, 2), { name: 'expenses.json' });
    archive.append(unparseData(expenses), { name: 'expenses.csv' });

    // 3. Fetch Budgets
    const budgets = await fetchTable('budgets', 'created_by', userId);
    archive.append(JSON.stringify(budgets, null, 2), { name: 'budgets.json' });
    archive.append(unparseData(budgets), { name: 'budgets.csv' });

    // 4. Fetch Families user belongs to
    const { data: memberships } = await supabaseAdmin.from('family_members').select('family_id').eq('profile_id', userId);
    let families: any[] = [];
    if (memberships && memberships.length > 0) {
      const familyIds = memberships.map(m => m.family_id);
      const { data: famData } = await supabaseAdmin.from('families').select('*').in('id', familyIds);
      families = famData || [];
    }
    archive.append(JSON.stringify(families, null, 2), { name: 'families.json' });
    archive.append(unparseData(families), { name: 'families.csv' });

    // 5. Fetch Workspaces user belongs to
    const { data: workspaceMemberships } = await supabaseAdmin.from('workspace_members').select('workspace_id').eq('profile_id', userId);
    let workspaces: any[] = [];
    if (workspaceMemberships && workspaceMemberships.length > 0) {
      const wsIds = workspaceMemberships.map(w => w.workspace_id);
      const { data: wsData } = await supabaseAdmin.from('workspaces').select('*').in('id', wsIds);
      workspaces = wsData || [];
    }
    archive.append(JSON.stringify(workspaces, null, 2), { name: 'workspaces.json' });
    archive.append(unparseData(workspaces), { name: 'workspaces.csv' });

    // 6. Fetch Notifications
    const notifications = await fetchTable('notifications', 'user_id', userId);
    archive.append(JSON.stringify(notifications, null, 2), { name: 'notifications.json' });
    archive.append(unparseData(notifications), { name: 'notifications.csv' });

    // 7. Fetch Audit Logs
    const auditLogs = await fetchTable('audit_logs', 'user_id', userId);
    archive.append(JSON.stringify(auditLogs, null, 2), { name: 'audit_logs.json' });
    archive.append(unparseData(auditLogs), { name: 'audit_logs.csv' });

    // 8. Fetch AI Chat History & AI Categorizations
    const chatHistory = await fetchTable('ai_chat_history', 'user_id', userId);
    const categorizations = await fetchTable('ai_categorizations', 'user_id', userId);
    const aiHistory = { chatHistory, categorizations };
    archive.append(JSON.stringify(aiHistory, null, 2), { name: 'ai_history.json' });
    archive.append(unparseData([...chatHistory, ...categorizations]), { name: 'ai_history.csv' });

    // 9. Fetch Email Logs
    const emailLogs = await fetchTable('email_logs', 'user_id', userId);
    archive.append(JSON.stringify(emailLogs, null, 2), { name: 'email_logs.json' });
    archive.append(unparseData(emailLogs), { name: 'email_logs.csv' });

    // 10. Fetch Receipts OCR Cache
    const receipts = await fetchTable('receipt_ocr_cache', 'user_id', userId);
    archive.append(JSON.stringify(receipts, null, 2), { name: 'receipts.json' });
    archive.append(unparseData(receipts), { name: 'receipts.csv' });

    // Finalize the archive file
    await archive.finalize();
  } catch (err) {
    console.error('Error compiling GDPR zip export:', err);
    throw err;
  }
}

/**
 * Initiates GDPR soft deletion by setting scheduled delete time
 */
export async function scheduleGdprSoftDelete(userId: string, reason?: string, deletedBy?: string): Promise<boolean> {
  const deleteDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days delay
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        scheduled_delete_at: deleteDate,
        delete_requested_at: new Date().toISOString(),
        delete_reason: reason || null,
        deleted_by: deletedBy || userId
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to schedule soft delete:', err);
    return false;
  }
}

/**
 * Performs cascade delete and anonymizes audit logs
 */
export async function performGdprCascadeDelete(userId: string): Promise<boolean> {
  console.log(`Executing GDPR permanent cascade delete for user: ${userId}`);

  try {
    // 1. Anonymize user's audit logs to preserve business activity trail without PII
    const { error: anonError } = await supabaseAdmin
      .from('audit_logs')
      .update({
        user_id: null,
        ip_address: '0.0.0.0',
        user_agent: 'Anonymized',
        old_value: null,
        new_value: null
      })
      .eq('user_id', userId);

    if (anonError) {
      console.error('Error anonymizing audit logs:', anonError);
    }

    // 2. Cascade delete database tables
    // Budgets
    await supabaseAdmin.from('budgets').delete().eq('created_by', userId);
    
    // Expenses (and family deleted expenses)
    await supabaseAdmin.from('expenses').delete().eq('user_id', userId);
    await supabaseAdmin.from('family_deleted_expenses').delete().eq('user_id', userId);

    // AI tables
    await supabaseAdmin.from('ai_chat_history').delete().eq('user_id', userId);
    await supabaseAdmin.from('ai_categorizations').delete().eq('user_id', userId);
    await supabaseAdmin.from('ai_chat_conversations').delete().eq('user_id', userId);
    await supabaseAdmin.from('ai_monthly_insights').delete().eq('user_id', userId);
    await supabaseAdmin.from('expense_embeddings').delete().eq('user_id', userId);
    await supabaseAdmin.from('merchant_aliases').delete().eq('user_id', userId);
    await supabaseAdmin.from('expense_predictions').delete().eq('user_id', userId);
    await supabaseAdmin.from('ai_feedback').delete().eq('user_id', userId);
    await supabaseAdmin.from('ai_usage_logs').delete().eq('user_id', userId);
    await supabaseAdmin.from('ai_rate_limits').delete().eq('user_id', userId);

    // Notifications & Email logs
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId);
    await supabaseAdmin.from('email_logs').delete().eq('user_id', userId);
    await supabaseAdmin.from('email_preferences').delete().eq('user_id', userId);

    // Receipts
    await supabaseAdmin.from('receipt_ocr_cache').delete().eq('user_id', userId);

    // Families (Delete families they own. Other memberships are cleaned by CASCADE/family_members delete)
    const { data: ownedFamilies } = await supabaseAdmin.from('families').select('id').eq('owner_id', userId);
    if (ownedFamilies && ownedFamilies.length > 0) {
      const famIds = ownedFamilies.map(f => f.id);
      await supabaseAdmin.from('families').delete().in('id', famIds);
    }
    await supabaseAdmin.from('family_members').delete().eq('profile_id', userId);
    await supabaseAdmin.from('family_invites').delete().eq('created_by', userId);
    await supabaseAdmin.from('family_activity_logs').delete().eq('actor_id', userId);

    // Workspaces (Delete workspaces they own)
    const { data: ownedWorkspaces } = await supabaseAdmin.from('workspaces').select('id').eq('owner_id', userId);
    if (ownedWorkspaces && ownedWorkspaces.length > 0) {
      const wsIds = ownedWorkspaces.map(w => w.id);
      await supabaseAdmin.from('workspaces').delete().in('id', wsIds);
    }
    await supabaseAdmin.from('workspace_members').delete().eq('profile_id', userId);

    // 3. Delete Profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 4. Delete Auth user from auth.users (via admin client)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('Auth user delete warning:', authDeleteError.message);
    }

    console.log(`GDPR permanent cascade delete completed for user: ${userId}`);
    return true;
  } catch (err) {
    console.error('GDPR cascade deletion failure:', err);
    return false;
  }
}

/**
 * Cron task function to process expired soft deletes
 */
export async function runGdprDeletionSweep(): Promise<void> {
  try {
    const { data: expiredProfiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .lte('scheduled_delete_at', new Date().toISOString());

    if (error) throw error;

    if (expiredProfiles && expiredProfiles.length > 0) {
      console.log(`Found ${expiredProfiles.length} expired GDPR soft-deleted profiles. Commencing deletion sweep...`);
      for (const p of expiredProfiles) {
        await performGdprCascadeDelete(p.id);
      }
    }
  } catch (err) {
    console.error('GDPR deletion sweep failed:', err);
  }
}

/**
 * Cron task function to purge audit logs older than 24 months
 */
export async function runAuditLogsRetentionSweep(): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 24); // 24 months ago
  try {
    console.log(`[RETENTION] Initiating audit log purge sweep for logs older than: ${cutoffDate.toISOString()}`);
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .delete()
      .lte('created_at', cutoffDate.toISOString());

    if (error) throw error;
    console.log('[RETENTION] Audit log purge sweep completed successfully.');
  } catch (err) {
    console.error('Audit log retention sweep failed:', err);
  }
}
