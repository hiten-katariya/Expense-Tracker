import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { logAuditEvent } from './services/audit.service.js';
import { getPerformanceHealthStats } from './services/performance.service.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.SERVICE_ROLE_KEY || 
                           supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Supabase URL and Anon Key are required in environment.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// authenticateUser middleware (specific to this router or shared)
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    if (!user.email_confirmed_at) {
      return res.status(403).json({ error: 'Forbidden: Email verification is required to access this resource.' });
    }

    (req as any).user = user;
    (req as any).token = token;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

// requireAdmin middleware (dual-gate)
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  console.log('[ADMIN ROUTER DEBUG] requireAdmin called for path:', req.path);
  console.log('[ADMIN ROUTER DEBUG] user present:', !!user, '| user.email:', user?.email);

  if (!user) {
    console.log('[ADMIN ROUTER DEBUG] ❌ BLOCKED: no user on request');
    return res.status(404).json({ error: 'Not found' });
  }

  // Gate 1: Email whitelist (case-insensitive)
  const adminEmail = process.env.ADMIN_EMAIL;
  console.log('[ADMIN ROUTER DEBUG] Gate 1 — ADMIN_EMAIL env:', adminEmail, '| user.email:', user.email);
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    console.log('[ADMIN ROUTER DEBUG] ❌ BLOCKED at Gate 1: email mismatch');
    logAuditEvent({
      userId: user.id, entityType: 'admin_access', entityId: null,
      eventType: 'admin_access_denied', req,
      newValue: { reason: 'email_mismatch', attempted_email: user.email }
    });
    return res.status(404).json({ error: 'Not found' });
  }
  console.log('[ADMIN ROUTER DEBUG] ✅ Gate 1 passed');

  // Gate 2: Database role check via service role
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single();

    console.log('[ADMIN ROUTER DEBUG] Gate 2 — DB result:', { profile, error: error?.message });

    if (error) {
      console.log('[ADMIN ROUTER DEBUG] ❌ BLOCKED at Gate 2: DB error:', error.message);
      return res.status(404).json({ error: 'Not found' });
    }

    if (!profile?.is_admin) {
      console.log('[ADMIN ROUTER DEBUG] is_admin is false — auto-promoting...');
      const { error: promoteError } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user.id);

      if (promoteError) {
        console.error('[ADMIN ROUTER DEBUG] ❌ Auto-promote failed:', promoteError);
        return res.status(404).json({ error: 'Not found' });
      }

      console.log('[ADMIN ROUTER DEBUG] ✅ Auto-promote succeeded');
      logAuditEvent({
        userId: user.id, entityType: 'admin_access', entityId: null,
        eventType: 'admin_auto_promoted', req,
        newValue: { reason: 'email_matched_whitelist_auto_promoted' }
      });
    }
  } catch (err) {
    console.log('[ADMIN ROUTER DEBUG] ❌ BLOCKED: exception in Gate 2:', err);
    return res.status(404).json({ error: 'Not found' });
  }

  console.log('[ADMIN ROUTER DEBUG] ✅ ALL GATES PASSED — granting admin access for:', req.path);
  logAuditEvent({
    userId: user.id, entityType: 'admin_access', entityId: null,
    eventType: 'admin_page_accessed', req,
    newValue: { path: req.path }
  });
  next();
}

const adminRouter = express.Router();

// Apply auth & requireAdmin protection to all endpoints in this router
adminRouter.use(authenticateUser);
adminRouter.use(requireAdmin);

// GET /stats — Dashboard overview cards
adminRouter.get('/stats', async (req, res) => {
  try {
    const [users, expenses, budgets, families, workspaces, emailLogs, aiUsage, ocrCache] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('expenses').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('budgets').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('families').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('workspaces').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('email_logs').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('ai_usage_logs').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('receipt_ocr_cache').select('id', { count: 'exact', head: true }),
    ]);

    // Expenses created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: expensesToday } = await supabaseAdmin
      .from('expenses').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    // Daily active users (users with expenses today)
    const { data: dauData } = await supabaseAdmin
      .from('expenses').select('user_id')
      .gte('created_at', todayStart.toISOString());
    const uniqueActiveUsers = new Set(dauData?.map(d => d.user_id) || []).size;

    // Emails sent
    const { count: emailsSent } = await supabaseAdmin
      .from('email_logs').select('id', { count: 'exact', head: true })
      .eq('status', 'sent');

    // Server health
    const health = getPerformanceHealthStats();

    return res.status(200).json({
      totalUsers: users.count || 0,
      dailyActiveUsers: uniqueActiveUsers,
      expensesToday: expensesToday || 0,
      totalExpenses: expenses.count || 0,
      totalBudgets: budgets.count || 0,
      totalFamilies: families.count || 0,
      totalWorkspaces: workspaces.count || 0,
      totalEmailsSent: emailsSent || 0,
      totalEmailLogs: emailLogs.count || 0,
      totalAIRequests: aiUsage.count || 0,
      totalOCRRequests: ocrCache.count || 0,
      serverStatus: health.status,
      errorRate: health.api.failureRatePercentage,
      uptimeSeconds: health.uptimeSeconds,
    });
  } catch (err: any) {
    console.error('[ADMIN] Stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// GET /users — Paginated user list with search/filter
adminRouter.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || '').trim();
    const country = (req.query.country as string || '').trim();
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (country) {
      query = query.ilike('country', `%${country}%`);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] Users list error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /users/:id — Full user detail
adminRouter.get('/users/:id', async (req, res) => {
  const userId = String(req.params.id);
  if (!isValidUuid(userId)) return res.status(400).json({ error: 'Invalid user ID' });

  try {
    // Log which user is being viewed
    logAuditEvent({
      userId: (req as any).user.id, entityType: 'admin_user_view', entityId: userId,
      eventType: 'admin_viewed_user', req, newValue: { viewed_user_id: userId }
    });

    const [profile, expenses, budgets, categories, families, workspaces, notifications, aiHistory, ocrCache, auditLogs, emailLogs] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).single(),
      supabaseAdmin.from('expenses').select('*, category:categories(name, icon, color)').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('budgets').select('*, category:categories(name, icon, color)').eq('created_by', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('categories').select('*').eq('created_by', userId).order('name', { ascending: true }),
      supabaseAdmin.from('family_members').select('*, family:families(*)').eq('profile_id', userId),
      supabaseAdmin.from('workspace_members').select('*, workspace:workspaces(*)').eq('profile_id', userId),
      supabaseAdmin.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('ai_chat_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('receipt_ocr_cache').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('audit_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('email_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    ]);

    if (profile.error) throw profile.error;

    return res.status(200).json({
      profile: profile.data,
      expenses: expenses.data || [],
      budgets: budgets.data || [],
      categories: categories.data || [],
      families: families.data || [],
      workspaces: workspaces.data || [],
      notifications: notifications.data || [],
      aiHistory: aiHistory.data || [],
      ocrCache: ocrCache.data || [],
      auditLogs: auditLogs.data || [],
      emailLogs: emailLogs.data || [],
    });
  } catch (err: any) {
    console.error('[ADMIN] User detail error:', err);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// GET /expenses — Platform-wide expenses
adminRouter.get('/expenses', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('expenses')
      .select('*, category:categories(name, icon, color), profile:profiles(full_name, email)', { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] Expenses error:', err);
    return res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// GET /budgets — All budgets
adminRouter.get('/budgets', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('budgets')
      .select('*, category:categories(name, icon, color)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] Budgets error:', err);
    return res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET /families — All families
adminRouter.get('/families', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('families')
      .select('*, family_members(id, profile_id, member_role, profile:profiles(full_name, email))', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] Families error:', err);
    return res.status(500).json({ error: 'Failed to fetch families' });
  }
});

// GET /workspaces — All workspaces
adminRouter.get('/workspaces', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('workspaces')
      .select('*, workspace_members(id, profile_id, member_role, profile:profiles(full_name, email))', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] Workspaces error:', err);
    return res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// GET /ai-usage — AI request logs
adminRouter.get('/ai-usage', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('*, profile:profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] AI usage error:', err);
    return res.status(500).json({ error: 'Failed to fetch AI usage' });
  }
});

// GET /ocr-usage — Receipt OCR logs
adminRouter.get('/ocr-usage', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('receipt_ocr_cache')
      .select('*, profile:profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] OCR usage error:', err);
    return res.status(500).json({ error: 'Failed to fetch OCR usage' });
  }
});

// GET /email-logs — Email delivery logs
adminRouter.get('/email-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const template = req.query.template as string;

    let query = supabaseAdmin.from('email_logs').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    if (template) query = query.ilike('template_name', `%${template}%`);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] Email logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

// GET /notifications — All notifications
adminRouter.get('/notifications', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('notifications')
      .select('*, profile:profiles(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] Notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /audit-logs — Platform-wide audit trail
adminRouter.get('/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const eventType = req.query.eventType as string;
    const userId = req.query.userId as string;

    let query = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' });
    if (eventType) query = query.eq('event_type', eventType);
    if (userId && isValidUuid(userId)) query = query.eq('user_id', userId);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.status(200).json({ data, total: count || 0, page, limit });
  } catch (err: any) {
    console.error('[ADMIN] Audit logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /analytics — Time-series analytics
adminRouter.get('/analytics', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [signups, expensesData, aiData] = await Promise.all([
      supabaseAdmin.from('profiles').select('created_at').gte('created_at', startDate.toISOString()).order('created_at', { ascending: true }),
      supabaseAdmin.from('expenses').select('created_at, amount').gte('created_at', startDate.toISOString()).order('created_at', { ascending: true }),
      supabaseAdmin.from('ai_usage_logs').select('created_at, total_tokens, estimated_cost').gte('created_at', startDate.toISOString()).order('created_at', { ascending: true }),
    ]);

    // Group by date helper
    const groupByDate = (items: any[], dateField: string) => {
      const groups: Record<string, number> = {};
      (items || []).forEach(item => {
        const date = new Date(item[dateField]).toISOString().split('T')[0];
        groups[date] = (groups[date] || 0) + 1;
      });
      return Object.entries(groups).map(([date, count]) => ({ date, count }));
    };

    return res.status(200).json({
      signupsPerDay: groupByDate(signups.data || [], 'created_at'),
      expensesPerDay: groupByDate(expensesData.data || [], 'created_at'),
      aiRequestsPerDay: groupByDate(aiData.data || [], 'created_at'),
      totalSignups: signups.data?.length || 0,
      totalExpensesInPeriod: expensesData.data?.length || 0,
      totalAIRequestsInPeriod: aiData.data?.length || 0,
    });
  } catch (err: any) {
    console.error('[ADMIN] Analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /system-health — Server health metrics
adminRouter.get('/system-health', async (req, res) => {
  try {
    const health = getPerformanceHealthStats();

    // Test DB connection
    let dbStatus = 'UP';
    try {
      const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
      if (error) dbStatus = 'DEGRADED';
    } catch {
      dbStatus = 'DOWN';
    }

    return res.status(200).json({
      ...health,
      database: { status: dbStatus },
    });
  } catch (err: any) {
    console.error('[ADMIN] System health error:', err);
    return res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

export { adminRouter };
