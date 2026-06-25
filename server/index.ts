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
  sendFamilyMonthlyReportEmail,
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

// --- AUTHENTICATION & USER-SCOPED CLIENT HELPERS ---

const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    (req as any).user = user;
    (req as any).token = token;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

const getUserSupabase = (req: express.Request) => {
  const token = (req as any).token;
  return createClient(supabaseUrl || '', supabaseAnonKey || '', {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

// --- FAMILY HUB ENDPOINTS ---

// Create Family
app.post('/api/families', authenticateUser, async (req, res) => {
  const { name, monthly_budget, currency_code } = req.body;
  const user = (req as any).user;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Family name is required' });
  }

  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const userSupabase = getUserSupabase(req);

  try {
    // Verify that the user is not already a member of another family
    const { data: existingMembership, error: checkError } = await userSupabase
      .from('family_members')
      .select('family_id')
      .eq('profile_id', user.id);

    if (checkError) {
      console.error('Error checking existing membership:', checkError);
      return res.status(500).json({ error: checkError.message });
    }

    if (existingMembership && existingMembership.length > 0) {
      return res.status(400).json({ error: 'You are already a member of another family group. Leave or disband that family first.' });
    }

    const { data, error } = await userSupabase
      .from('families')
      .insert({
        name: name.trim(),
        owner_id: user.id,
        invite_code: inviteCode,
        monthly_budget: monthly_budget || null,
        currency_code: currency_code || 'INR'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating family:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ data });
  } catch (err) {
    console.error('Create family error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite Member to Family
app.post('/api/families/invite', authenticateUser, async (req, res) => {
  const { familyId, email } = req.body;
  const user = (req as any).user;

  if (!familyId || !email) {
    return res.status(400).json({ error: 'Family ID and Email are required' });
  }

  const userSupabase = getUserSupabase(req);

  try {
    // 1. Verify that the inviter is the owner or admin of the family
    const { data: member, error: memberErr } = await userSupabase
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('profile_id', user.id)
      .single();

    if (memberErr || !member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Only family owners and admins can invite members.' });
    }

    // 2. Create the invite row
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days expiry
    const { data: invite, error: inviteErr } = await userSupabase
      .from('family_invites')
      .insert({
        family_id: familyId,
        email: email.trim().toLowerCase(),
        expires_at: expiresAt,
        created_by: user.id,
        status: 'pending'
      })
      .select('*, family:families(*)')
      .single();

    if (inviteErr) {
      console.error('Error creating invite row:', inviteErr);
      if (inviteErr.code === '23505') {
        return res.status(400).json({ error: 'A pending invitation already exists for this email.' });
      }
      return res.status(500).json({ error: inviteErr.message });
    }

    // 3. Send email invite via Resend
    const { data: inviterProfile } = await userSupabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.full_name || user.email || 'A family member';
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/family/invites?token=${invite.invite_token}`;
    
    await sendFamilyInviteEmail(email, inviterName, invite.family.name, inviteUrl);

    return res.status(200).json({ message: 'Invitation sent successfully', data: invite });
  } catch (err) {
    console.error('Invite member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept Invitation
app.post('/api/families/invites/:token/accept', authenticateUser, async (req, res) => {
  const { token } = req.params;
  const user = (req as any).user;
  const userSupabase = getUserSupabase(req);

  try {
    // 1. Fetch invite
    const { data: invite, error: inviteErr } = await userSupabase
      .from('family_invites')
      .select('*, family:families(*)')
      .eq('invite_token', token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has already been ${invite.status}` });
    }

    if (new Date(invite.expires_at) < new Date()) {
      await userSupabase.from('family_invites').update({ status: 'expired' }).eq('id', invite.id);
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return res.status(403).json({ error: 'This invitation was sent to a different email address' });
    }

    // Verify that the user is not already a member of another family
    const { data: existingMembership, error: checkError } = await userSupabase
      .from('family_members')
      .select('family_id')
      .eq('profile_id', user.id);

    if (checkError) {
      console.error('Error checking existing membership:', checkError);
      return res.status(500).json({ error: checkError.message });
    }

    if (existingMembership && existingMembership.length > 0) {
      return res.status(400).json({ error: 'You are already a member of another family group. Leave or disband that family first.' });
    }

    // 2. Insert member
    const { data: member, error: memberErr } = await userSupabase
      .from('family_members')
      .insert({
        family_id: invite.family_id,
        profile_id: user.id,
        role: 'member',
        member_role: 'member'
      })
      .select()
      .single();

    if (memberErr) {
      console.error('Error inserting family member:', memberErr);
      if (memberErr.code === '23505') {
        return res.status(400).json({ error: 'You are already a member of this family.' });
      }
      return res.status(500).json({ error: memberErr.message });
    }

    // 3. Mark invite as accepted
    await userSupabase
      .from('family_invites')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', invite.id);

    // 4. Log activity
    await userSupabase
      .from('family_activity_logs')
      .insert({
        family_id: invite.family_id,
        actor_id: user.id,
        action: 'member_joined',
        entity_type: 'profile',
        entity_id: user.id
      });

    // 5. Notify existing family members
    try {
      const { data: joiningProfile } = await userSupabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const nameToUse = joiningProfile?.full_name || joiningProfile?.email || 'A new member';

      const { data: otherMembers } = await userSupabase
        .from('family_members')
        .select('profile_id')
        .eq('family_id', invite.family_id)
        .neq('profile_id', user.id);

      if (otherMembers && otherMembers.length > 0) {
        const notifications = otherMembers.map(m => ({
          user_id: m.profile_id,
          family_id: invite.family_id,
          type: 'family_invite',
          title: 'New Member Joined',
          message: `${nameToUse} has joined the family group.`,
          is_read: false,
          scope: 'family'
        }));

        await userSupabase.from('notifications').insert(notifications);
      }
    } catch (notifErr) {
      console.error('Failed to notify existing members on accept:', notifErr);
    }

    return res.status(200).json({ message: 'Invitation accepted successfully', data: member });
  } catch (err) {
    console.error('Accept invite error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline Invitation
app.post('/api/families/invites/:token/decline', authenticateUser, async (req, res) => {
  const { token } = req.params;
  const user = (req as any).user;
  const userSupabase = getUserSupabase(req);

  try {
    // 1. Fetch invite
    const { data: invite, error: inviteErr } = await userSupabase
      .from('family_invites')
      .select('*')
      .eq('invite_token', token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: `Invitation is already ${invite.status}` });
    }

    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return res.status(403).json({ error: 'Unauthorized to decline this invitation' });
    }

    // 2. Update status to declined
    await userSupabase
      .from('family_invites')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', invite.id);

    // 3. Log activity
    await userSupabase
      .from('family_activity_logs')
      .insert({
        family_id: invite.family_id,
        actor_id: user.id,
        action: 'invite_declined',
        entity_type: 'profile',
        entity_id: user.id
      });

    return res.status(200).json({ message: 'Invitation declined' });
  } catch (err) {
    console.error('Decline invite error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Join Family by Invite Code
app.post('/api/families/join-by-code', authenticateUser, async (req, res) => {
  const { inviteCode } = req.body;
  const user = (req as any).user;
  const userSupabase = getUserSupabase(req);

  if (!inviteCode || inviteCode.trim() === '') {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  try {
    // 1. Call DB join function
    const { data: familyId, error: rpcError } = await userSupabase.rpc('join_family_by_code', {
      p_invite_code: inviteCode.trim().toUpperCase()
    });

    if (rpcError) {
      console.error('Error in join_family_by_code RPC:', rpcError);
      return res.status(400).json({ error: rpcError.message });
    }

    // 2. Fetch joining user's profile details to construct notification message
    const { data: joiningProfile } = await userSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const nameToUse = joiningProfile?.full_name || joiningProfile?.email || 'A new member';

    // 3. Fetch all other members of the family to notify them
    const { data: otherMembers } = await userSupabase
      .from('family_members')
      .select('profile_id')
      .eq('family_id', familyId)
      .neq('profile_id', user.id);

    if (otherMembers && otherMembers.length > 0) {
      const notifications = otherMembers.map(m => ({
        user_id: m.profile_id,
        family_id: familyId,
        type: 'family_invite',
        title: 'New Member Joined',
        message: `${nameToUse} has joined the family group.`,
        is_read: false,
        scope: 'family'
      }));

      await userSupabase.from('notifications').insert(notifications);
    }

    return res.status(200).json({ message: 'Joined family group successfully', data: { familyId } });
  } catch (err) {
    console.error('Join family error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Family Details
app.get('/api/families/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const userSupabase = getUserSupabase(req);

  try {
    const { data, error } = await userSupabase
      .from('families')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching family details:', error);
      return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Fetch family error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Family Members
app.get('/api/families/:id/members', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const userSupabase = getUserSupabase(req);

  try {
    const { data, error } = await userSupabase
      .from('family_members')
      .select('*, profile:profiles(*)')
      .eq('family_id', id);

    if (error) {
      console.error('Error fetching family members:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Fetch family members error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove Member from Family
app.delete('/api/families/:familyId/members/:memberId', authenticateUser, async (req, res) => {
  const { familyId, memberId } = req.params;
  const userSupabase = getUserSupabase(req);

  try {
    const { error } = await userSupabase
      .from('family_members')
      .delete()
      .eq('family_id', familyId)
      .eq('profile_id', memberId);

    if (error) {
      console.error('Error removing family member:', error);
      return res.status(500).json({ error: error.message });
    }

    await userSupabase
      .from('family_activity_logs')
      .insert({
        family_id: familyId,
        actor_id: (req as any).user.id,
        action: 'member_removed',
        entity_type: 'profile',
        entity_id: memberId
      });

    return res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave Family
app.post('/api/families/:id/leave', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  const userSupabase = getUserSupabase(req);

  try {
    // 1. Verify owner check
    const { data: member, error: memberErr } = await userSupabase
      .from('family_members')
      .select('*')
      .eq('family_id', id)
      .eq('profile_id', user.id)
      .single();

    if (memberErr || !member) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'The family owner cannot leave the family. You must transfer ownership first.' });
    }

    // 2. Delete member row
    const { error: deleteErr } = await userSupabase
      .from('family_members')
      .delete()
      .eq('family_id', id)
      .eq('profile_id', user.id);

    if (deleteErr) {
      console.error('Error leaving family:', deleteErr);
      return res.status(500).json({ error: deleteErr.message });
    }

    await userSupabase
      .from('family_activity_logs')
      .insert({
        family_id: id,
        actor_id: user.id,
        action: 'member_left',
        entity_type: 'profile',
        entity_id: user.id
      });

    return res.status(200).json({ message: 'Left family successfully' });
  } catch (err) {
    console.error('Leave family error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Monthly Summary Report (Owners/Admins only)
app.post('/api/families/:id/monthly-summary/send', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  const userSupabase = getUserSupabase(req);

  try {
    // 1. Verify caller role
    const { data: caller, error: callerErr } = await userSupabase
      .from('family_members')
      .select('*, family:families(*)')
      .eq('family_id', id)
      .eq('profile_id', user.id)
      .single();

    if (callerErr || !caller || !['owner', 'admin'].includes(caller.role)) {
      return res.status(403).json({ error: 'Only family owners and admins can send monthly reports.' });
    }

    const familyName = caller.family.name;

    // 2. Gather monthly figures
    const year = new Date().getFullYear();
    const monthIndex = new Date().getMonth();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = `${monthNames[monthIndex]} ${year}`;

    const dateFrom = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const dateTo = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${new Date(year, monthIndex + 1, 0).getDate()}`;

    // Current Month Expenses
    const { data: expenses, error: expErr } = await userSupabase
      .from('expenses')
      .select('*, category:categories(*), profile:profiles(*)')
      .eq('family_id', id)
      .eq('expense_scope', 'family')
      .eq('is_deleted', false)
      .gte('expense_date', dateFrom)
      .lte('expense_date', dateTo);

    if (expErr) throw expErr;

    // Prior Month Expenses
    const prevYear = monthIndex === 0 ? year - 1 : year;
    const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
    const prevDateFrom = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-01`;
    const prevDateTo = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${new Date(prevYear, prevMonthIndex + 1, 0).getDate()}`;

    const { data: prevExpenses } = await userSupabase
      .from('expenses')
      .select('amount')
      .eq('family_id', id)
      .eq('expense_scope', 'family')
      .eq('is_deleted', false)
      .gte('expense_date', prevDateFrom)
      .lte('expense_date', prevDateTo);

    // 3. Process Calculations
    const totalSpent = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const prevTotalSpent = prevExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const momChange = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

    // Highest Spender
    const spenderMap: { [uid: string]: { name: string; amount: number } } = {};
    expenses?.forEach((e) => {
      const uid = e.user_id;
      const name = e.profile?.full_name || e.profile?.email || 'Unknown Member';
      if (!spenderMap[uid]) spenderMap[uid] = { name, amount: 0 };
      spenderMap[uid].amount += e.amount;
    });

    let highestSpender = 'No transactions';
    let highestSpenderAmount = 0;
    Object.values(spenderMap).forEach((s) => {
      if (s.amount > highestSpenderAmount) {
        highestSpender = s.name;
        highestSpenderAmount = s.amount;
      }
    });

    // Top Category
    const categoryMap: { [name: string]: number } = {};
    expenses?.forEach((e) => {
      const catName = e.category?.name || 'Uncategorized';
      categoryMap[catName] = (categoryMap[catName] || 0) + e.amount;
    });

    let topCategory = 'No transactions';
    let topCategoryAmount = 0;
    Object.entries(categoryMap).forEach(([name, amt]) => {
      if (amt > topCategoryAmount) {
        topCategory = name;
        topCategoryAmount = amt;
      }
    });

    // Budget Limit
    const { data: budget } = await userSupabase
      .from('budgets')
      .select('amount')
      .eq('family_id', id)
      .eq('scope', 'family')
      .is('category_id', null)
      .maybeSingle();

    const budgetLimit = budget?.amount || 0;
    const utilization = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;

    // 4. Send styled email reports to all family members
    const { data: membersList } = await userSupabase
      .from('family_members')
      .select('*, profile:profiles(*)')
      .eq('family_id', id);

    if (membersList && membersList.length > 0) {
      for (const m of membersList) {
        const memberEmail = m.profile?.email;
        if (memberEmail) {
          try {
            await sendFamilyMonthlyReportEmail(memberEmail, familyName, monthName, {
              totalSpent,
              highestSpender,
              topCategory,
              budgetUtilization: utilization,
              momChange,
              budgetLimit
            });
          } catch (emailErr) {
            console.error(`Failed to send monthly report email to ${memberEmail}:`, emailErr);
          }
        }
      }
    }

    // 5. Create in-app notifications for all members
    const notificationInserts = (membersList || []).map((m) => ({
      family_id: id,
      user_id: m.profile_id,
      scope: 'family',
      type: 'summary',
      title: 'Family Monthly Summary Sent',
      message: `The family monthly report for ${monthName} has been generated. Total spent: ₹${totalSpent.toLocaleString('en-IN')}.`,
      is_read: false
    }));

    if (notificationInserts.length > 0) {
      await userSupabase.from('notifications').insert(notificationInserts);
    }

    // 6. Log activity
    await userSupabase
      .from('family_activity_logs')
      .insert({
        family_id: id,
        actor_id: user.id,
        action: 'monthly_report_sent',
        entity_type: 'family',
        entity_id: id,
        metadata: {
          month: monthName,
          total_spent: totalSpent,
          highest_spender: highestSpender,
          top_category: topCategory
        }
      });

    return res.status(200).json({ message: 'Monthly report calculated, emails sent and notifications broadcasted.' });
  } catch (err) {
    console.error('Send monthly report error:', err);
    return res.status(500).json({ error: 'Internal server error calculating monthly summary' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Express server running on port ${port}`);
});
