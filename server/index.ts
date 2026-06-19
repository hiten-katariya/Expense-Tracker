import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBudgetAlertEmail,
  sendMonthlyReportEmail,
  sendFamilyInviteEmail,
} from './services/emailService.js';

// Load environment variables from the root .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Supabase URL and Anon Key are required in environment.');
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// --- AUTH / EMAIL VERIFICATION ROUTES ---

// Endpoint to send the email verification token
app.post('/api/auth/send-verification-email', async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ error: 'Email and token are required' });
  }

  try {
    await sendVerificationEmail(email, token);
    return res.status(200).json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error in send-verification-email endpoint:', error);
    return res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Endpoint to verify the token (calls the DB function verify_user_email)
app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    // Call DB verify RPC function
    const { data: verified, error } = await supabase.rpc('verify_user_email', {
      token_value: token,
    });

    if (error) {
      console.error('Database RPC error verifying email:', error);
      return res.status(500).json({ error: 'Failed to query verification database' });
    }

    if (!verified) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    return res.status(200).json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    console.error('Error in verify-email endpoint:', error);
    return res.status(500).json({ error: 'Internal server error verifying token' });
  }
});

// --- MOCK/TEST EMAIL TRIGGER ENDPOINTS ---

app.post('/api/test/welcome-email', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Email and name are required' });

  try {
    await sendWelcomeEmail(email, name);
    return res.status(200).json({ message: 'Welcome email sent' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

app.post('/api/test/budget-alert', async (req, res) => {
  const { email, budgetName, limit, current } = req.body;
  if (!email || !budgetName || !limit || !current) {
    return res.status(400).json({ error: 'Missing budget alert parameters' });
  }

  try {
    await sendBudgetAlertEmail(email, budgetName, limit, current);
    return res.status(200).json({ message: 'Budget alert email sent' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to send budget alert email' });
  }
});

app.post('/api/test/monthly-report', async (req, res) => {
  const { email, month, totalSpent, savings } = req.body;
  if (!email || !month || totalSpent === undefined || savings === undefined) {
    return res.status(400).json({ error: 'Missing monthly report parameters' });
  }

  try {
    await sendMonthlyReportEmail(email, month, { totalSpent, savings });
    return res.status(200).json({ message: 'Monthly report email sent' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to send monthly report email' });
  }
});

app.post('/api/test/family-invite', async (req, res) => {
  const { email, inviterName, familyName, inviteUrl } = req.body;
  if (!email || !inviterName || !familyName || !inviteUrl) {
    return res.status(400).json({ error: 'Missing family invite parameters' });
  }

  try {
    await sendFamilyInviteEmail(email, inviterName, familyName, inviteUrl);
    return res.status(200).json({ message: 'Family invite email sent' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to send family invite email' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Express server running on port ${port}`);
});
