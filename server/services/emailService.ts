import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local at the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const resendApiKey = process.env.RESEND_API_KEY;
const appUrl = process.env.APP_URL || 'http://localhost:5173';

if (!resendApiKey) {
  console.warn('⚠️ Warning: RESEND_API_KEY is not defined in environment variables.');
}

const resend = new Resend(resendApiKey);

// Resend free tier/onboarding domain is onboarding@resend.dev
const FROM_EMAIL = 'onboarding@resend.dev';

// Standard template wrapper to keep email designs premium and consistent
function getEmailLayout(title: string, contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            padding: 32px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .body {
            padding: 40px 32px;
            line-height: 1.6;
          }
          .footer {
            background-color: #f8fafc;
            padding: 24px 32px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: #ffffff !important;
            padding: 14px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 24px 0;
            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1);
          }
          .alert-box {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .accent {
            color: #4f46e5;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Expense Tracker</h1>
          </div>
          <div class="body">
            ${contentHtml}
          </div>
          <div class="footer">
            &copy; 2026 Expense Tracker. All rights reserved.<br>
            If you have any questions, contact our support team.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  
  const html = getEmailLayout(
    'Verify Your Account',
    `
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Verify Your Expense Tracker Account</h2>
      <p>Thank you for signing up! Please verify your email address to activate your account and start tracking your finances.</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="button">Verify Email</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; font-size: 13px; color: #64748b;">${verifyUrl}</p>
      <p style="margin-bottom: 0;">This verification link will expire in <span class="accent">24 hours</span>.</p>
    `
  );

  console.log(`[Email Service] Sending verification email to ${email}...`);
  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify Your Expense Tracker Account',
      html,
    });
    console.log('[Email Service] Resend API Success response:', response);
    return response;
  } catch (error) {
    console.error('[Email Service] Failed to send verification email:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  const html = getEmailLayout(
    'Welcome!',
    `
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Welcome, ${name}!</h2>
      <p>Your email has been verified successfully. We are excited to help you take control of your financial health.</p>
      <p>Here are a few things you can do to get started:</p>
      <ul style="padding-left: 20px; margin: 16px 0;">
        <li>Set up your monthly budgets</li>
        <li>Create expense categories</li>
        <li>Invite family members to collaborate</li>
      </ul>
      <div style="text-align: center;">
        <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
      </div>
    `
  );

  console.log(`[Email Service] Sending welcome email to ${email}...`);
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Expense Tracker!',
      html,
    });
  } catch (error) {
    console.error('[Email Service] Failed to send welcome email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const html = getEmailLayout(
    'Reset Password',
    `
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Reset Your Password</h2>
      <p>You requested a password reset for your Expense Tracker account. Click the button below to set a new password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <p>If you did not request this reset, you can safely ignore this email.</p>
    `
  );

  console.log(`[Email Service] Sending password reset email to ${email}...`);
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset Your Expense Tracker Password',
      html,
    });
  } catch (error) {
    console.error('[Email Service] Failed to send password reset email:', error);
    throw error;
  }
}

export async function sendBudgetAlertEmail(email: string, budgetName: string, limit: number, current: number) {
  const percent = Math.round((current / limit) * 100);
  const html = getEmailLayout(
    'Budget Alert',
    `
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #ef4444;">Budget Alert!</h2>
      <p>You have exceeded or are close to exceeding your budget for <span class="accent">${budgetName}</span>.</p>
      <div class="alert-box">
        <strong>Status:</strong> Exceeded ${percent}% of limit<br>
        <strong>Budget Limit:</strong> ${limit}<br>
        <strong>Current Spend:</strong> ${current}
      </div>
      <p>Please review your transactions on the dashboard to adjust your spending.</p>
      <div style="text-align: center;">
        <a href="${appUrl}/budgets" class="button">Manage Budgets</a>
      </div>
    `
  );

  console.log(`[Email Service] Sending budget alert to ${email}...`);
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Budget Alert: ${budgetName} limit exceeded`,
      html,
    });
  } catch (error) {
    console.error('[Email Service] Failed to send budget alert email:', error);
    throw error;
  }
}

export async function sendMonthlyReportEmail(email: string, month: string, summary: { totalSpent: number; savings: number }) {
  const html = getEmailLayout(
    'Monthly Report',
    `
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Your Monthly Financial Summary</h2>
      <p>Here is your financial overview for the month of <span class="accent">${month}</span>:</p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Total Spent</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #ef4444; font-weight: bold;">$${summary.totalSpent}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Savings</td>
            <td style="padding: 8px 0; text-align: right; color: #10b981; font-weight: bold;">$${summary.savings}</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center;">
        <a href="${appUrl}/reports" class="button">View Full Report</a>
      </div>
    `
  );

  console.log(`[Email Service] Sending monthly report to ${email}...`);
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your Expense Report for ${month}`,
      html,
    });
  } catch (error) {
    console.error('[Email Service] Failed to send monthly report email:', error);
    throw error;
  }
}

export async function sendFamilyInviteEmail(email: string, inviterName: string, familyName: string, inviteUrl: string) {
  const html = getEmailLayout(
    'Family Invitation',
    `
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Join Family Hub</h2>
      <p><span class="accent">${inviterName}</span> has invited you to join the family account <span class="accent">${familyName}</span> to co-manage expenses and budgets.</p>
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </div>
      <p>Or copy this link to join:</p>
      <p style="word-break: break-all; font-size: 13px; color: #64748b;">${inviteUrl}</p>
    `
  );

  console.log(`[Email Service] Sending family invite email to ${email}...`);
  try {
    return await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Invitation to join ${familyName} on Expense Tracker`,
      html,
    });
  } catch (error) {
    console.error('[Email Service] Failed to send family invite email:', error);
    throw error;
  }
}
