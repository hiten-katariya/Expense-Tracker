import { getTemplateContent } from './email.templates.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/**
 * Standard dark-mode compatible responsive HTML wrapper matching Expenso branding.
 */
function getEmailLayout(title: string, contentHtml: string, unsubToken?: string): string {
  const unsubscribeSection = unsubToken
    ? `<p style="margin-top: 24px; font-size: 11px; color: #94a3b8;">
        Don't want these emails? 
        <a href="${APP_URL}/unsubscribe?token=${unsubToken}" style="color: #6366f1; text-decoration: underline;">Unsubscribe here</a>.
       </p>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0f19;
            color: #f1f5f9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #111827;
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
          }
          .header {
            background: linear-gradient(135deg, #6366f1, #a855f7);
            padding: 40px 32px;
            text-align: center;
            color: #ffffff;
            position: relative;
          }
          .header h1 {
            margin: 0;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.15);
          }
          .body {
            padding: 40px 32px;
            line-height: 1.6;
            color: #cbd5e1;
            font-size: 15px;
          }
          .body p {
            margin-top: 0;
            margin-bottom: 16px;
          }
          .footer {
            background-color: #0f172a;
            padding: 32px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: #ffffff !important;
            padding: 14px 28px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            margin: 24px 0;
            box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
          }
          .alert-box {
            background: rgba(239, 68, 68, 0.08);
            border-left: 4px solid #ef4444;
            padding: 20px;
            margin: 24px 0;
            border-radius: 8px;
            color: #fca5a5;
          }
          .accent-box {
            background: rgba(99, 102, 241, 0.08);
            border-left: 4px solid #6366f1;
            padding: 20px;
            margin: 24px 0;
            border-radius: 8px;
            color: #c7d2fe;
          }
          .table-container {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            overflow: hidden;
            margin: 24px 0;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
          }
          .table th {
            background: rgba(255, 255, 255, 0.04);
            color: #f1f5f9;
            text-align: left;
            padding: 12px 16px;
            font-size: 13px;
            font-weight: 600;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .table td {
            padding: 12px 16px;
            font-size: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            color: #94a3b8;
          }
          .table tr:last-child td {
            border-bottom: none;
          }
          .highlight {
            color: #a855f7;
            font-weight: 600;
          }
          .social-links {
            margin-top: 16px;
            margin-bottom: 16px;
          }
          .social-link {
            color: #6366f1;
            text-decoration: none;
            margin: 0 8px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Expenso</h1>
          </div>
          <div class="body">
            ${contentHtml}
          </div>
          <div class="footer">
            <div class="social-links">
              <a href="#" class="social-link">Twitter</a>
              <a href="#" class="social-link">GitHub</a>
              <a href="#" class="social-link">Support</a>
            </div>
            &copy; 2026 Expenso. All rights reserved.<br>
            For support, contact support@expenso.dev
            ${unsubscribeSection}
          </div>
        </div>
      </body>
    </html>
  `;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  category: string;
}

export function renderEmailTemplate(
  templateName: string,
  data: any,
  unsubToken?: string
): RenderedTemplate {
  const content = getTemplateContent(templateName, data);
  const html = getEmailLayout(content.subject, content.contentHtml, unsubToken);
  return {
    subject: content.subject,
    html,
    category: content.category
  };
}
