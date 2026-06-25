import { isValidEmail, isRateLimited } from './email.utils.js';

// Map template names to their corresponding database columns in public.email_preferences
export const TEMPLATE_PREFERENCE_MAP: Record<string, string> = {
  'Welcome': 'marketing_emails',
  'Welcome Email': 'marketing_emails',
  'Registration Successful': 'marketing_emails',
  'Verify Email': 'security_emails',
  'Password Reset': 'security_emails',
  'Password Changed': 'security_emails',
  'Login From New Device': 'security_emails',
  'Login Alert': 'security_emails',
  'Receipt Processed': 'ai_emails',
  'AI Receipt Processed': 'ai_emails',
  'Budget Created': 'budget_emails',
  'Budget Updated': 'budget_emails',
  'Budget Deleted': 'budget_emails',
  'Budget Threshold 50%': 'budget_emails',
  'Budget Threshold 75%': 'budget_emails',
  'Budget Threshold 90%': 'budget_emails',
  'Budget Exceeded': 'budget_emails',
  'Budget Reset': 'budget_emails',
  'Monthly Financial Summary': 'monthly_reports',
  'Monthly Financial Report': 'monthly_reports',
  'Weekly Spending Report': 'weekly_reports',
  'Weekly Financial Report': 'weekly_reports',
  'AI Monthly Insights': 'ai_emails',
  'AI Monthly Insights Ready': 'ai_emails',
  'Anomaly Detection': 'ai_emails',
  'AI Spending Anomaly': 'ai_emails',
  'AI Savings Opportunity': 'ai_emails',
  'Recurring Expense Reminder': 'budget_emails',
  'Subscription Renewal Reminder': 'budget_emails',
  'Recurring Expense Created': 'budget_emails',
  'Recurring Expense Executed': 'budget_emails',
  'Recurring Expense Failed': 'budget_emails',
  'Family Invite': 'family_emails',
  'Family Invitation': 'family_emails',
  'Family Invitation Accepted': 'family_emails',
  'Family Invitation Declined': 'family_emails',
  'Added To Family': 'family_emails',
  'Removed From Family': 'family_emails',
  'Ownership Transferred': 'family_emails',
  'Family Budget Created': 'family_emails',
  'Family Budget Updated': 'family_emails',
  'Family Budget Deleted': 'family_emails',
  'Family Monthly Summary': 'family_emails',
  'Family Expense Created': 'family_emails',
  'Family Expense Updated': 'family_emails',
  'Family Expense Deleted': 'family_emails',
  'Family Expense Restored': 'family_emails',
  'Family Created': 'family_emails',
  'Family Member Joined': 'family_emails',
  'Family Member Removed': 'family_emails',
  'Family Ownership Transferred': 'family_emails',
  'Family Deleted': 'family_emails',
  'Workspace Invitation': 'workspace_emails',
  'Workspace Invitation Accepted': 'workspace_emails',
  'Workspace Invitation Declined': 'workspace_emails',
  'Workspace Member Added': 'workspace_emails',
  'Workspace Member Removed': 'workspace_emails',
  'CSV Export Ready': 'security_emails',
  'PDF Export Ready': 'security_emails',
  'AI Categorization Finished': 'ai_emails',
  'Merchant Learning Updated': 'ai_emails',
  'Expense Confirmation': 'budget_emails',
  'Expense Created': 'budget_emails',
  'Expense Updated': 'budget_emails',
  'Expense Deleted': 'budget_emails',
  'Expense Restored': 'budget_emails',
  'Expense Permanently Deleted': 'budget_emails',
  'CSV Import Completed': 'security_emails',
  'CSV Import Failed': 'security_emails',
  'Yearly Financial Summary': 'monthly_reports',
  'Notification Digest': 'marketing_emails',
  'Account Deleted': 'security_emails',
  'Account Recovery': 'security_emails',
  'Security Alert': 'security_emails',
  'Two Factor Enabled': 'security_emails',
  'Two Factor Disabled': 'security_emails',
  'Subscription Activated': 'marketing_emails',
  'Subscription Renewed': 'marketing_emails',
  'Subscription Cancelled': 'marketing_emails',
  'Trial Ending': 'marketing_emails',
  'General System Notification': 'marketing_emails'
};

/**
 * Enqueues a notification email inside the database logs after checking validation,
 * rate limiting, and user preference opt-outs.
 */
export async function queueEmail(
  supabaseClient: any,
  userId: string | null,
  recipient: string,
  templateName: string,
  subject: string,
  payload: any
): Promise<boolean> {
  const cleanRecipient = recipient.trim().toLowerCase();

  // 1. Syntax validation
  if (!isValidEmail(cleanRecipient)) {
    console.warn(`[Email Queue] Skipped: Invalid recipient syntax: "${recipient}"`);
    return false;
  }

  try {
    // 2. Anti-spam Rate Limiting
    const rateLimited = await isRateLimited(supabaseClient, cleanRecipient);
    if (rateLimited) {
      console.warn(`[Email Queue] Rate limit exceeded for recipient: "${cleanRecipient}"`);
      await supabaseClient.from('email_logs').insert({
        user_id: userId,
        recipient: cleanRecipient,
        template_name: templateName,
        subject,
        status: 'failed',
        error_message: 'Anti-spam rate limit exceeded (max 5 emails per 5 minutes)',
        payload,
      });
      return false;
    }

    // 3. User preference check
    const prefKey = TEMPLATE_PREFERENCE_MAP[templateName] || 'marketing_emails';
    
    // Security emails cannot be opted out of
    if (prefKey !== 'security_emails' && userId) {
      const { data: prefs, error: prefError } = await supabaseClient
        .from('email_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (prefError) {
        console.error(`[Email Queue] Failed to retrieve email preferences for user ${userId}:`, prefError);
      }

      // If preferences exist and the target channel is disabled, skip sending
      if (prefs && prefs[prefKey] === false) {
        console.log(`[Email Queue] Skipping email "${templateName}" to ${cleanRecipient} because user has opted out of "${prefKey}".`);
        
        await supabaseClient.from('email_logs').insert({
          user_id: userId,
          recipient: cleanRecipient,
          template_name: templateName,
          subject,
          status: 'skipped',
          error_message: `User opted out of ${prefKey} notifications`,
          payload,
        });
        
        return true; // Return true as we successfully handled preference respect
      }
    }

    // 4. Log as queued in database
    const { data: insertData, error: insertError } = await supabaseClient.from('email_logs').insert({
      user_id: userId,
      recipient: cleanRecipient,
      template_name: templateName,
      subject,
      status: 'queued',
      payload,
    }).select();

    console.log('[Email Queue] Insert Data:', insertData);
    console.log('[Email Queue] Insert Error:', insertError);

    if (insertError) {
      console.error('[Email Queue] Failed to insert email queue log:', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Email Queue] Exception occurred in queueEmail:', error);
    return false;
  }
}
