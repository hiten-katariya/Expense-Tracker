import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export interface TemplateContent {
  subject: string;
  contentHtml: string;
  category: string;
}

/**
 * Escapes special characters to prevent HTML/Script injection (XSS).
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  const val = String(str);
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and escapes URLs to ensure only http/https protocols or relative routes are allowed, preventing javascript: injection.
 */
export function validateAndEscapeUrl(url: string | undefined): string {
  if (!url) return escapeHtml(APP_URL);
  const cleanUrl = String(url).trim();
  if (/^(https?:\/\/)/i.test(cleanUrl)) {
    return escapeHtml(cleanUrl);
  }
  if (cleanUrl.startsWith('/')) {
    return escapeHtml(`${APP_URL}${cleanUrl}`);
  }
  return escapeHtml(APP_URL);
}

/**
 * Returns rendering of an HTML email template with matching layout
 */
export function getTemplateContent(templateName: string, data: any): TemplateContent {
  let contentHtml = '';
  let subject = '';
  let category = 'security_emails'; // Default category

  // Standardize template name lookup
  const name = templateName.trim();

  switch (name) {
    case 'Welcome':
    case 'Welcome Email':
      subject = 'Welcome to Expenso! 🚀';
      category = 'marketing_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Welcome, ${escapeHtml(data.name || 'Financial Wizard')}!</h2>
        <p>Your email has been verified successfully. We are excited to help you take control of your financial health.</p>
        <p>Here are a few things you can do to get started right now:</p>
        <div class="accent-box">
          <ul style="padding-left: 20px; margin: 0;">
            <li>Set up your monthly budgets to track spending limits</li>
            <li>Create customized expense categories for clear analytics</li>
            <li>Invite family members to coordinate budgets together</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="${APP_URL}/dashboard" class="button">Go to Dashboard</a>
        </div>
      `;
      break;

    case 'Registration Successful':
      subject = 'Account Registration Successful! 🎉';
      category = 'marketing_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Registration Completed</h2>
        <p>Your Expenso account has been registered successfully. Welcome aboard!</p>
        <p>You can now log in and customize your default tracking currency and visual workspaces.</p>
        <div style="text-align: center;">
          <a href="${APP_URL}/login" class="button">Log In to Your Account</a>
        </div>
      `;
      break;

    case 'Verify Email':
      subject = 'Verify your Expenso account';
      category = 'security_emails';
      const verifyUrl = validateAndEscapeUrl(data.token ? `/verify-email?token=${data.token}` : undefined);
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Verify Your Account</h2>
        <p>Thank you for signing up! Please verify your email address to activate your account and start managing your expenses.</p>
        <div style="text-align: center;">
          <a href="${verifyUrl}" class="button">Verify Email Address</a>
        </div>
        <p>Or copy and paste this verification URL in your browser:</p>
        <p style="word-break: break-all; font-size: 13px; color: #64748b;">${verifyUrl}</p>
        <p style="margin-bottom: 0;">Note: This link will expire in <span class="highlight">24 hours</span>.</p>
      `;
      break;

    case 'Password Reset':
      subject = 'Reset your Expenso password';
      category = 'security_emails';
      const resetUrl = validateAndEscapeUrl(data.token ? `/reset-password?token=${data.token}` : undefined);
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Reset Your Password</h2>
        <p>You requested a password reset for your Expenso account. Click the button below to update your password credentials:</p>
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        <p>If you did not request this password reset, you can safely ignore this email. Your credentials remain safe.</p>
      `;
      break;

    case 'Password Changed':
      subject = 'Security Alert: Password updated successfully';
      category = 'security_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Password Updated</h2>
        <p>This is a confirmation that the password for your account was recently updated successfully.</p>
        <div class="alert-box">
          <strong>If this was not you:</strong> Please reset your password immediately and contact support to lock your account.
        </div>
      `;
      break;

    case 'Login From New Device':
    case 'Login Alert':
      subject = 'Security Alert: New login detected';
      category = 'security_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">New Device Login Warning</h2>
        <p>A new login was recorded for your account from a new browser or device.</p>
        <div class="accent-box">
          <strong>Device Details:</strong><br>
          • Browser/OS: ${escapeHtml(data.device || 'Unknown')}<br>
          • IP Address: ${escapeHtml(data.ip || 'Unknown')}<br>
          • Date/Time: ${escapeHtml(new Date().toLocaleString())}<br>
        </div>
        <p>If this was you, no action is needed. If you do not recognize this session, please secure your account immediately.</p>
      `;
      break;

    case 'Budget Created':
      subject = `Budget Alert: limit set for ${escapeHtml(data.categoryName || 'Category')}`;
      category = 'budget_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Budget Limit Registered</h2>
        <p>A new spending budget limit has been successfully established.</p>
        <div class="accent-box">
          <strong>Category Name:</strong> ${escapeHtml(data.categoryName || 'Overall')}<br>
          <strong>Monthly Limit:</strong> ₹${escapeHtml(data.limit || '0')}<br>
          <strong>Start Date:</strong> ${escapeHtml(data.startsOn || 'Now')}
        </div>
      `;
      break;

    case 'Budget Updated':
      subject = `Budget Alert: limit modified for ${escapeHtml(data.categoryName || 'Category')}`;
      category = 'budget_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Budget Limit Modified</h2>
        <p>Your spending budget has been adjusted.</p>
        <div class="table-container">
          <table class="table">
            <tr><td><strong>Category</strong></td><td>${escapeHtml(data.categoryName || 'Overall')}</td></tr>
            <tr><td><strong>Old Limit</strong></td><td>₹${escapeHtml(data.oldLimit || '0')}</td></tr>
            <tr><td><strong>New Limit</strong></td><td>₹${escapeHtml(data.newLimit || '0')}</td></tr>
          </table>
        </div>
      `;
      break;

    case 'Budget Deleted':
      subject = `Budget Alert: limit removed for ${escapeHtml(data.categoryName || 'Category')}`;
      category = 'budget_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ef4444; font-size: 20px; font-weight: 700;">Budget Removed</h2>
        <p>The spending budget for <strong>${escapeHtml(data.categoryName || 'Category')}</strong> has been deleted.</p>
      `;
      break;

    case 'Budget Threshold 50%':
    case 'Budget Threshold 75%':
    case 'Budget Threshold 90%':
    case 'Budget Exceeded':
      const pct = data.threshold || 100;
      subject = `⚠️ Budget Warning: ${escapeHtml(data.budgetName || 'Category')} is at ${escapeHtml(pct)}% of limit`;
      category = 'budget_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ef4444; font-size: 20px; font-weight: 700;">Budget Limit Warning</h2>
        <p>You have reached <span class="highlight" style="color:#ef4444;">${escapeHtml(pct)}%</span> of your budget limit for <strong>${escapeHtml(data.budgetName || 'Category')}</strong>.</p>
        <div class="alert-box">
          <strong>Budget Limit:</strong> ₹${escapeHtml(data.limit || '0')}<br>
          <strong>Current Spending:</strong> ₹${escapeHtml(data.current || '0')}<br>
          <strong>Status:</strong> ${pct >= 100 ? 'Budget fully exceeded!' : 'Approaching budget ceiling.'}
        </div>
      `;
      break;

    case 'Expense Created':
    case 'Expense Confirmation':
      subject = `Expense Recorded: ${escapeHtml(data.title || 'New Expense')}`;
      category = 'expense_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #10b981; font-size: 20px; font-weight: 700;">Expense Logged Successfully</h2>
        <p>A new transaction has been registered under your account tracking.</p>
        <div class="table-container">
          <table class="table">
            <tr><td><strong>Title</strong></td><td>${escapeHtml(data.title || 'New Expense')}</td></tr>
            <tr><td><strong>Amount</strong></td><td class="highlight">₹${escapeHtml(data.amount || '0.00')}</td></tr>
            <tr><td><strong>Category</strong></td><td>${escapeHtml(data.categoryName || 'Uncategorized')}</td></tr>
            <tr><td><strong>Date</strong></td><td>${escapeHtml(data.date || 'N/A')}</td></tr>
            <tr><td><strong>Notes</strong></td><td>${escapeHtml(data.notes || 'N/A')}</td></tr>
          </table>
        </div>
      `;
      break;

    case 'Expense Updated':
      subject = `Expense Updated: ${escapeHtml(data.title || 'Expense')}`;
      category = 'expense_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #6366f1; font-size: 20px; font-weight: 700;">Expense Updated</h2>
        <p>Your transaction has been updated successfully.</p>
        <div class="table-container">
          <table class="table">
            <tr><td><strong>Current Title</strong></td><td>${escapeHtml(data.title || 'Expense')}</td></tr>
            <tr><td><strong>Current Amount</strong></td><td class="highlight">₹${escapeHtml(data.amount || '0.00')}</td></tr>
            <tr><td><strong>Category</strong></td><td>${escapeHtml(data.categoryName || 'Uncategorized')}</td></tr>
            ${data.oldAmount ? `<tr><td><strong>Previous Amount</strong></td><td>₹${escapeHtml(data.oldAmount)}</td></tr>` : ''}
            ${data.oldTitle ? `<tr><td><strong>Previous Title</strong></td><td>${escapeHtml(data.oldTitle)}</td></tr>` : ''}
          </table>
        </div>
      `;
      break;

    case 'Expense Deleted':
    case 'Expense Permanently Deleted':
      subject = `Expense Removed: ${escapeHtml(data.title || 'Expense')}`;
      category = 'expense_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ef4444; font-size: 20px; font-weight: 700;">Expense Removed</h2>
        <p>The following transaction was deleted from your account records:</p>
        <div class="accent-box" style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; color: #fca5a5;">
          • Title: <strong>${escapeHtml(data.title || 'Expense')}</strong><br>
          • Amount: <strong>₹${escapeHtml(data.amount || '0.00')}</strong><br>
          • Category: <strong>${escapeHtml(data.categoryName || 'Uncategorized')}</strong>
        </div>
      `;
      break;

    case 'Expense Restored':
      subject = `Expense Restored: ${escapeHtml(data.title || 'Expense')}`;
      category = 'expense_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #10b981; font-size: 20px; font-weight: 700;">Expense Restored</h2>
        <p>The following transaction was successfully recovered and added back to your active list:</p>
        <div class="accent-box">
          • Title: <strong>${escapeHtml(data.title || 'Expense')}</strong><br>
          • Amount: <strong>₹${escapeHtml(data.amount || '0.00')}</strong><br>
          • Category: <strong>${escapeHtml(data.categoryName || 'Uncategorized')}</strong>
        </div>
      `;
      break;

    case 'Family Invite':
    case 'Family Invitation':
      subject = `Invitation to join Family Hub from ${escapeHtml(data.inviterName || 'Owner')}`;
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Join Family Hub</h2>
        <p>You have been invited by <span class="highlight">${escapeHtml(data.inviterName || 'A member')}</span> to join their family group <strong>${escapeHtml(data.familyName || 'Family Account')}</strong>.</p>
        <div style="text-align: center;">
          <a href="${validateAndEscapeUrl(data.inviteUrl)}" class="button">Accept Invitation</a>
        </div>
      `;
      break;

    case 'Family Invitation Accepted':
    case 'Family Member Joined':
      subject = `Family Invite Accepted: ${escapeHtml(data.inviteeName || 'Member')} has joined! 🎉`;
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">New Member Joined Group</h2>
        <p>${escapeHtml(data.inviteeName || 'A user')} has accepted the invitation and joined the family group: <strong>${escapeHtml(data.familyName || 'Family Account')}</strong>.</p>
      `;
      break;

    case 'Family Invitation Declined':
      subject = `Family Invite Declined by ${escapeHtml(data.inviteeName || 'Invitee')}`;
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Invitation Declined</h2>
        <p>${escapeHtml(data.inviteeName || 'Invitee')} declined the invitation to join your family group: <strong>${escapeHtml(data.familyName || 'Family')}</strong>.</p>
      `;
      break;

    case 'Family Member Removed':
    case 'Removed From Family':
      subject = 'Notice: Account removed from family group';
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Removed from Family Hub</h2>
        <p>You have been removed from the family group: <strong>${escapeHtml(data.familyName || 'Family')}</strong> by the administrator.</p>
      `;
      break;

    case 'Family Ownership Transferred':
    case 'Ownership Transferred':
      subject = 'Notice: Family Hub ownership transferred to you';
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Ownership Role Transferred</h2>
        <p>You have been promoted to the Owner role for family hub: <strong>${escapeHtml(data.familyName || 'Family')}</strong>.</p>
      `;
      break;

    case 'Family Budget Created':
      subject = `Family Budget Alert: Shared budget limit set for ${escapeHtml(data.categoryName || 'Category')}`;
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Shared Family Budget Limit</h2>
        <p>A new shared budget has been created for the family group.</p>
        <div class="accent-box">
          • Budget Limit: <strong>₹${escapeHtml(data.limit || '0')}</strong><br>
          • Category: <strong>${escapeHtml(data.categoryName || 'Overall')}</strong>
        </div>
      `;
      break;

    case 'Family Budget Updated':
      subject = `Family Budget Alert: Shared budget adjusted for ${escapeHtml(data.categoryName || 'Category')}`;
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Shared Family Budget Modified</h2>
        <p>A shared family budget has been updated:</p>
        <div class="table-container">
          <table class="table">
            <tr><td>Category</td><td>${escapeHtml(data.categoryName || 'Overall')}</td></tr>
            <tr><td>Old Limit</td><td>₹${escapeHtml(data.oldLimit || '0')}</td></tr>
            <tr><td>New Limit</td><td>₹${escapeHtml(data.newLimit || '0')}</td></tr>
          </table>
        </div>
      `;
      break;

    case 'Family Budget Deleted':
      subject = `Family Budget Alert: Shared budget deleted for ${escapeHtml(data.categoryName || 'Category')}`;
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ef4444; font-size: 20px; font-weight: 700;">Shared Family Budget Deleted</h2>
        <p>The shared family budget limit for <strong>${escapeHtml(data.categoryName || 'Category')}</strong> has been removed.</p>
      `;
      break;

    case 'Family Expense Created':
      subject = `Family Expense: New record in Family Hub`;
      category = 'family_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Family Transaction Logged</h2>
        <p>A new shared expense was logged in your family tracker:</p>
        <div class="table-container">
          <table class="table">
            <tr><td>Title</td><td>${escapeHtml(data.title || 'New Expense')}</td></tr>
            <tr><td>Amount</td><td style="color:#ef4444;">₹${escapeHtml(data.amount || '0')}</td></tr>
            <tr><td>Added By</td><td>${escapeHtml(data.addedBy || 'Member')}</td></tr>
          </table>
        </div>
      `;
      break;

    case 'Workspace Invitation':
      subject = `Workspace Invitation: Join ${escapeHtml(data.workspaceName || 'Workspace')}`;
      category = 'workspace_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Workspace Invite</h2>
        <p>You have been invited to join the workspace: <strong>${escapeHtml(data.workspaceName || 'Workspace')}</strong>.</p>
        <div style="text-align: center;">
          <a href="${validateAndEscapeUrl(data.inviteUrl)}" class="button">Accept Invitation</a>
        </div>
      `;
      break;

    case 'Workspace Member Removed':
      subject = `Workspace: Member Removed from ${escapeHtml(data.workspaceName || 'Workspace')}`;
      category = 'workspace_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Member Removed Notice</h2>
        <p>${escapeHtml(data.memberName || 'A member')} was removed from workspace: <strong>${escapeHtml(data.workspaceName || 'Workspace')}</strong>.</p>
      `;
      break;

    case 'AI Receipt Processed':
    case 'Receipt Processed':
      subject = `Receipt Scan Complete: ${escapeHtml(data.merchant || 'Processed')}`;
      category = 'ai_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Receipt OCR Scanned</h2>
        <p>Our AI has finished scanning and cleaning up your receipt details.</p>
        <div class="table-container">
          <table class="table">
            <tr><td><strong>Merchant</strong></td><td>${escapeHtml(data.merchant || 'N/A')}</td></tr>
            <tr><td><strong>Total Amount</strong></td><td>₹${escapeHtml(data.amount || '0.00')}</td></tr>
            <tr><td><strong>Date</strong></td><td>${escapeHtml(data.date || 'N/A')}</td></tr>
          </table>
        </div>
      `;
      break;

    case 'AI Spending Anomaly':
    case 'Anomaly Detection':
      subject = '🚨 Unusual spending anomaly detected!';
      category = 'ai_emails';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ef4444; font-size: 20px; font-weight: 700;">Unusual Transaction Spike Flagged</h2>
        <p>We detected an outlier transaction that differs from your typical pattern.</p>
        <div class="alert-box">
          • Amount: <strong>₹${escapeHtml(data.amount || '0')}</strong><br>
          • Explanation: <strong>${escapeHtml(data.explanation || 'N/A')}</strong>
        </div>
      `;
      break;

    case 'Monthly Financial Report':
    case 'Monthly Financial Summary':
      subject = `Monthly Financial Report for ${escapeHtml(data.month || 'Month')}`;
      category = 'monthly_reports';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Monthly Summary Report</h2>
        <p>Here is your financial performance digest for the past month:</p>
        <div class="table-container">
          <table class="table">
            <tr><td>Total Spent</td><td style="color: #ef4444;">₹${escapeHtml(data.totalSpent || '0')}</td></tr>
            <tr><td>Savings Saved</td><td style="color: #10b981;">₹${escapeHtml(data.savings || '0')}</td></tr>
          </table>
        </div>
      `;
      break;

    case 'Weekly Financial Report':
    case 'Weekly Spending Report':
      subject = 'Weekly spending digest';
      category = 'weekly_reports';
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Weekly Spending Summary</h2>
        <p>Here is your weekly summary checklist:</p>
        <div class="accent-box">
          • Total spent this week: <strong>₹${escapeHtml(data.totalSpent || '0')}</strong>
        </div>
      `;
      break;

    case 'CSV Export Ready':
      subject = 'Your CSV expense export is ready! 📁';
      category = 'security_emails';
      const csvUrl = validateAndEscapeUrl(data.downloadUrl);
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">CSV Export Complete</h2>
        <p>Your requested CSV spreadsheet export has been generated successfully.</p>
        <div style="text-align: center;">
          <a href="${csvUrl}" class="button">Download CSV Report</a>
        </div>
      `;
      break;

    case 'PDF Export Ready':
    case 'PDF Report Ready':
      subject = 'Your PDF financial report is ready! 📄';
      category = 'security_emails';
      const pdfUrl = validateAndEscapeUrl(data.downloadUrl);
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">PDF Report Complete</h2>
        <p>Your requested financial analytics PDF report has been compiled and is ready for download.</p>
        <div style="text-align: center;">
          <a href="${pdfUrl}" class="button">Download PDF Report</a>
        </div>
      `;
      break;

    default:
      // Branded generic fallback for unhandled template names
      category = 'security_emails'; // Fallback to security (never opt out)
      subject = escapeHtml(data.subject || `${templateName} Alert`);
      contentHtml = `
        <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${escapeHtml(templateName)}</h2>
        <p>${escapeHtml(data.message || 'You have received a system alert from Expenso.')}</p>
        ${data.details ? `<div class="accent-box">${escapeHtml(data.details)}</div>` : ''}
      `;
  }

  return { subject, contentHtml, category };
}
