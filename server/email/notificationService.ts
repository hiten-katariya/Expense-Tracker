import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { TEMPLATE_PREFERENCE_MAP, queueEmail } from './emailQueue.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.SERVICE_ROLE_KEY || 
                           supabaseAnonKey;

// We use service role client to perform administrative lookups across users
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Interface representing a recipient profiles look-up
 */
interface RecipientInfo {
  id: string;
  email: string;
  fullName: string;
}

/**
 * Triggers a notification event, routing it to both in-app notifications and the email queue.
 */
export async function triggerNotificationEvent(
  eventType: string,
  actorId: string | null,
  payload: any
): Promise<boolean> {
  console.log('Processing Event...');

  try {
    const recipients = await resolveRecipients(eventType, actorId, payload);
    if (recipients.length === 0) {
      console.log('Event Completed.');
      return true;
    }

    const actorName = await getActorName(actorId);

    for (const recipient of recipients) {
      // 1. Create In-App Notification
      if (shouldCreateInAppNotification(eventType)) {
        console.log('Creating Notification...');
        await createInAppNotification(recipient.id, eventType, actorName, payload);
      }

      // 2. Queue Email Notification
      const templateName = mapEventToTemplate(eventType, recipient.id === actorId);
      if (templateName) {
        // Query email preferences for this recipient directly
        const prefKey = getPreferenceCategory(templateName);
        let emailPreference = true;

        if (prefKey !== 'security_emails' && recipient.id && recipient.id !== '00000000-0000-0000-0000-000000000000') {
          const { data: prefs, error: prefError } = await supabaseAdmin
            .from('email_preferences')
            .select('*')
            .eq('user_id', recipient.id)
            .maybeSingle();

          if (prefError) {
            console.error(`[Notification Service] Failed to retrieve preferences for ${recipient.id}:`, prefError);
          }

          if (prefs && prefs[prefKey] === false) {
            emailPreference = false;
          }
        }

        console.log(`Email Preference = ${emailPreference}`);

        if (emailPreference) {
          console.log('Queueing Email...');
          const emailSubject = getEmailSubject(templateName, payload);
          const emailPayload = buildEmailPayload(templateName, actorName, payload);

          // Queue the email via the queueEmail helper
          const queued = await queueEmail(
            supabaseAdmin,
            recipient.id === '00000000-0000-0000-0000-000000000000' ? null : recipient.id,
            recipient.email,
            templateName,
            emailSubject,
            emailPayload
          );

          if (queued) {
            console.log('Email Queued Successfully.');
          } else {
            console.error('[Notification Service] Failed to queue email through queueEmail helper.');
          }
        }
      }
    }

    console.log('Event Completed.');
    return true;
  } catch (error) {
    console.error(`[Notification Service] Error processing event "${eventType}":`, error);
    return false;
  }
}

/**
 * Resolves the profiles of all users who should receive notifications for this event.
 */
async function resolveRecipients(
  eventType: string,
  actorId: string | null,
  payload: any
): Promise<RecipientInfo[]> {
  const recipients: RecipientInfo[] = [];

  // Helper to fetch profile by ID
  const fetchProfile = async (id: string): Promise<RecipientInfo | null> => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, email: data.email, fullName: data.full_name || '' };
  };

  // Helper to fetch family members (owner, admins, and members)
  const fetchFamilyMembers = async (familyId: string): Promise<RecipientInfo[]> => {
    const { data, error } = await supabaseAdmin
      .from('family_members')
      .select('profile_id, profiles(id, email, full_name)')
      .eq('family_id', familyId);
    
    if (error || !data) return [];
    
    return data
      .filter((m: any) => m.profiles)
      .map((m: any) => ({
        id: m.profiles.id,
        email: m.profiles.email,
        fullName: m.profiles.full_name || ''
      }));
  };

  // Helper to fetch workspace members
  const fetchWorkspaceMembers = async (workspaceId: string): Promise<RecipientInfo[]> => {
    const { data, error } = await supabaseAdmin
      .from('workspace_members')
      .select('profile_id, profiles(id, email, full_name)')
      .eq('workspace_id', workspaceId);
    
    if (error || !data) return [];
    
    return data
      .filter((m: any) => m.profiles)
      .map((m: any) => ({
        id: m.profiles.id,
        email: m.profiles.email,
        fullName: m.profiles.full_name || ''
      }));
  };

  const oldRec = payload?.old_record;
  const newRec = payload?.new_record;
  const activeRecord = newRec || oldRec;

  // 1. Budget Events
  if (eventType.startsWith('budget_')) {
    const scope = activeRecord?.scope || 'personal';
    if (scope === 'family' && activeRecord?.family_id) {
      return await fetchFamilyMembers(activeRecord.family_id);
    } else if (actorId) {
      const p = await fetchProfile(actorId);
      if (p) recipients.push(p);
    }
  }
  // 2. Expense Events
  else if (eventType.startsWith('expense_')) {
    const scope = activeRecord?.expense_scope || 'personal';
    if (scope === 'family' && activeRecord?.family_id) {
      return await fetchFamilyMembers(activeRecord.family_id);
    } else if (actorId) {
      // Personal expenses do not send emails automatically, but we can resolve the actor to create in-app alerts if needed
      const p = await fetchProfile(actorId);
      if (p) recipients.push(p);
    }
  }
  // 3. Family Core Events (invite, accept, etc.)
  else if (eventType.startsWith('family_')) {
    const familyId = payload?.familyId || activeRecord?.family_id;
    if (eventType === 'family_invite_created' && payload?.inviteeEmail) {
      // Find profile by email for the invitee
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', payload.inviteeEmail.trim().toLowerCase())
        .maybeSingle();
      
      if (data) {
        recipients.push({ id: data.id, email: data.email, fullName: data.full_name || '' });
      } else {
        // Invite recipient has no profile yet; queue by email address directly using a placeholder ID
        recipients.push({ id: '00000000-0000-0000-0000-000000000000', email: payload.inviteeEmail, fullName: '' });
      }
    } else if (familyId) {
      return await fetchFamilyMembers(familyId);
    } else if (actorId) {
      const p = await fetchProfile(actorId);
      if (p) recipients.push(p);
    }
  }
  // 4. Workspace Core Events
  else if (eventType.startsWith('workspace_')) {
    const workspaceId = payload?.workspaceId;
    if (workspaceId) {
      return await fetchWorkspaceMembers(workspaceId);
    } else if (actorId) {
      const p = await fetchProfile(actorId);
      if (p) recipients.push(p);
    }
  }
  // 5. Account / Direct User Events (always routes to actorId)
  else if (actorId) {
    const p = await fetchProfile(actorId);
    if (p) recipients.push(p);
  }

  return recipients;
}

/**
 * Returns the name of the user who performed the action.
 */
async function getActorName(actorId: string | null): Promise<string> {
  if (!actorId) return 'Someone';
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('id', actorId)
    .maybeSingle();
  
  return data?.full_name || data?.email || 'A user';
}

/**
 * Returns whether the event should generate an in-app notification table row.
 */
function shouldCreateInAppNotification(eventType: string): boolean {
  // Direct authentication actions (like verify email token, password resets) do not need in-app alerts
  const silenceList = ['verify_email', 'password_reset', 'welcome', 'registration_successful'];
  return !silenceList.includes(eventType);
}

/**
 * Inserts an in-app notification record into public.notifications
 */
async function createInAppNotification(
  userId: string,
  eventType: string,
  actorName: string,
  payload: any
): Promise<void> {
  if (userId === '00000000-0000-0000-0000-000000000000') return; // Do not write in-app alert for unregistered emails

  const oldRec = payload?.old_record;
  const newRec = payload?.new_record;
  const activeRecord = newRec || oldRec;

  let title = 'System Update';
  let message = 'An event was recorded in Expenso.';
  let type = 'general';

  // Customize budget alerts
  if (eventType === 'budget_created') {
    title = 'Budget Created';
    message = `A new budget has been established for ${activeRecord?.name || 'Category'}. Limit: ₹${activeRecord?.amount || '0'}.`;
    type = 'budget';
  } else if (eventType === 'budget_updated') {
    title = 'Budget Adjusted';
    message = `Budget limit for ${activeRecord?.name || 'Category'} has been updated to ₹${activeRecord?.amount || '0'}.`;
    type = 'budget';
  } else if (eventType === 'budget_deleted') {
    title = 'Budget Removed';
    message = `The budget limit for ${activeRecord?.name || 'Category'} has been deleted.`;
    type = 'budget';
  }
  // Customize family alerts
  else if (eventType === 'family_invite_created') {
    title = 'Family Invite';
    message = `You have been invited to join the family group: ${payload?.familyName || 'Family Tracker'} by ${actorName}.`;
    type = 'family_invite';
  } else if (eventType === 'family_invite_accepted') {
    title = 'Member Joined Family';
    message = `${actorName} accepted the family invitation and joined the group.`;
    type = 'family';
  } else if (eventType === 'family_invite_declined') {
    title = 'Family Invite Declined';
    message = `${actorName} declined the invitation to join your family.`;
    type = 'family';
  } else if (eventType === 'family_expense_created') {
    title = 'Family Expense Added';
    message = `${actorName} added a new shared family expense: "${activeRecord?.title}" (₹${activeRecord?.amount}).`;
    type = 'family';
  }
  // Customize AI alerts
  else if (eventType === 'ai_spending_anomaly') {
    title = 'Spending Anomaly Detected';
    message = `Unusual transaction spike flagged: ${payload?.explanation || 'Outlier spending detected.'}`;
    type = 'ai';
  }

  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    family_id: activeRecord?.family_id || payload?.familyId || null,
    workspace_id: activeRecord?.workspace_id || payload?.workspaceId || null,
    entity_type: activeRecord ? eventType.split('_')[0] : null,
    entity_id: activeRecord?.id || null,
    is_read: false
  });

  if (error) {
    console.error(`[Notification Service] Failed to create in-app notification for ${userId}:`, error.message);
  }
}

/**
 * Maps an internal database event type to the templates registered in email.templates.ts
 */
function mapEventToTemplate(eventType: string, isActor: boolean): string | null {
  switch (eventType) {
    // Account Core
    case 'welcome': return 'Welcome';
    case 'registration_successful': return 'Registration Successful';
    case 'verify_email': return 'Verify Email';
    case 'password_reset': return 'Password Reset';
    case 'password_changed': return 'Password Changed';
    case 'login_new_device': return 'Login From New Device';
    case 'security_alert': return 'Security Alert';
    case 'account_deleted': return 'Account Deleted';
    case 'account_recovery': return 'Account Recovery';

    // Budgets
    case 'budget_created': return isActor ? 'Budget Created' : 'Family Budget Created';
    case 'budget_updated': return isActor ? 'Budget Updated' : 'Family Budget Updated';
    case 'budget_deleted': return isActor ? 'Budget Deleted' : 'Family Budget Deleted';
    case 'budget_threshold_50': return 'Budget Threshold 50%';
    case 'budget_threshold_75': return 'Budget Threshold 75%';
    case 'budget_threshold_90': return 'Budget Threshold 90%';
    case 'budget_exceeded': return 'Budget Exceeded';
    case 'budget_reset': return 'Budget Reset';

    // Expenses
    case 'expense_created': return isActor ? 'Expense Confirmation' : 'Family Expense Created';
    case 'expense_updated': return isActor ? 'Expense Updated' : 'Family Expense Updated';
    case 'expense_deleted': return isActor ? 'Expense Deleted' : 'Family Expense Deleted';
    case 'expense_restored': return isActor ? 'Expense Restored' : 'Family Expense Restored';

    // Family invites & membership
    case 'family_invite_created': return 'Family Invitation';
    case 'family_invite_accepted': return 'Family Invitation Accepted';
    case 'family_invite_declined': return 'Family Invitation Declined';
    case 'family_member_joined': return 'Family Member Joined';
    case 'family_member_removed': return 'Family Member Removed';
    case 'family_ownership_transferred': return 'Family Ownership Transferred';
    case 'family_deleted': return 'Family Deleted';
    case 'family_monthly_summary': return 'Family Monthly Summary';

    // Workspaces
    case 'workspace_invite': return 'Workspace Invitation';
    case 'workspace_invite_accepted': return 'Workspace Invitation Accepted';
    case 'workspace_invite_declined': return 'Workspace Invitation Declined';
    case 'workspace_member_removed': return 'Workspace Member Removed';

    // AI
    case 'ai_receipt_processed': return 'AI Receipt Processed';
    case 'ai_category_suggested': return 'AI Category Suggested';
    case 'ai_category_accepted': return 'AI Category Accepted';
    case 'ai_monthly_insights': return 'AI Monthly Insights Ready';
    case 'ai_spending_anomaly': return 'AI Spending Anomaly';
    case 'ai_savings_opportunity': return 'AI Savings Opportunity';

    // Reports & Exports
    case 'weekly_report_ready': return 'Weekly Financial Report';
    case 'monthly_report_ready': return 'Monthly Financial Report';
    case 'yearly_report_ready': return 'Yearly Financial Summary';
    case 'csv_export_ready': return 'CSV Export Ready';
    case 'pdf_export_ready': return 'PDF Export Ready';
    case 'notification_digest': return 'Notification Digest';

    // Subscriptions
    case 'subscription_activated': return 'Subscription Activated';
    case 'subscription_renewed': return 'Subscription Renewed';
    case 'subscription_cancelled': return 'Subscription Cancelled';
    case 'trial_ending': return 'Trial Ending';

    default: return null;
  }
}

/**
 * Resolves the email subject header for the template.
 */
function getEmailSubject(templateName: string, payload: any): string {
  const activeRecord = payload?.new_record || payload?.old_record;
  const name = activeRecord?.name || 'Category';

  switch (templateName) {
    case 'Welcome': return 'Welcome to Expenso! 🚀';
    case 'Verify Email': return 'Verify your Expenso account';
    case 'Password Reset': return 'Reset your Expenso password';
    case 'Password Changed': return 'Security Alert: Password updated successfully';
    case 'Login From New Device': return 'Security Alert: New login detected';
    case 'Budget Created': return `Budget Alert: limit set for ${name}`;
    case 'Budget Updated': return `Budget Alert: limit modified for ${name}`;
    case 'Budget Deleted': return `Budget Alert: limit removed for ${name}`;
    case 'Family Budget Created': return `Family Budget: Shared limit set for ${name}`;
    case 'Family Budget Updated': return `Family Budget: Shared limit adjusted for ${name}`;
    case 'Family Budget Deleted': return `Family Budget: Shared limit deleted for ${name}`;
    case 'Family Invitation': return `Invitation to join Family Hub`;
    case 'Family Invitation Accepted': return 'Family Invite Accepted! 🎉';
    case 'AI Spending Anomaly': return '🚨 Unusual spending anomaly detected!';
    case 'General System Notification': return payload?.subject || 'Expenso Alert';
    default: return `Expenso Notification: ${templateName}`;
  }
}

/**
 * Builds the template data payload.
 */
function buildEmailPayload(templateName: string, actorName: string, payload: any): any {
  const oldRec = payload?.old_record;
  const newRec = payload?.new_record;
  const activeRecord = newRec || oldRec;

  const basePayload = {
    actorName,
    ...payload
  };

  // Add mapped fields for budgets
  if (templateName.includes('Budget')) {
    return {
      ...basePayload,
      categoryName: activeRecord?.name || 'Overall',
      limit: activeRecord?.amount || 0,
      startsOn: activeRecord?.starts_on || '',
      oldLimit: oldRec?.amount || 0,
      newLimit: newRec?.amount || 0
    };
  }

  // Add mapped fields for expenses
  if (templateName.includes('Expense')) {
    return {
      ...basePayload,
      title: activeRecord?.title || 'Expense',
      amount: activeRecord?.amount || 0,
      date: activeRecord?.expense_date || '',
      notes: activeRecord?.notes || '',
      oldAmount: oldRec?.amount || 0,
      oldTitle: oldRec?.title || ''
    };
  }

  return basePayload;
}

/**
 * Maps a template name to its corresponding column in the public.email_preferences table.
 */
function getPreferenceCategory(templateName: string): string {
  const mapped = TEMPLATE_PREFERENCE_MAP[templateName];
  if (mapped) return mapped;
  
  const name = templateName.toLowerCase();
  if (name.includes('family')) return 'family_emails';
  if (name.includes('workspace')) return 'workspace_emails';
  if (name.includes('budget')) return 'budget_emails';
  if (name.includes('expense')) return 'budget_emails';
  if (name.includes('ai')) return 'ai_emails';
  if (name.includes('weekly')) return 'weekly_reports';
  if (name.includes('monthly')) return 'monthly_reports';
  if (name.includes('yearly')) return 'monthly_reports';
  if (name.includes('security') || name.includes('password') || name.includes('verify') || name.includes('login')) return 'security_emails';
  
  return 'marketing_emails';
}
