import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { runGeminiPrompt } from './gemini.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface InsightsResult {
  summary: string;
  savings_opportunities: Array<{ title: string; description: string; expected_saving: number }>;
  category_trends: Array<{ category: string; trend: 'up' | 'down' | 'stable'; explanation: string }>;
}

/**
 * Generates and caches AI monthly insights for a user
 */
export async function generateMonthlyInsights(
  supabaseClient: any,
  userId: string,
  month: number,
  year: number,
  workspaceId?: string | null,
  familyId?: string | null
): Promise<InsightsResult> {
  try {
    // 1. Check if insights for this month/year are already cached in DB
    let query = supabaseClient
      .from('ai_monthly_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year);

    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    if (familyId) query = query.eq('family_id', familyId);

    const { data: cached } = await query.maybeSingle();
    if (cached) {
      return {
        summary: cached.summary,
        savings_opportunities: cached.savings_opportunities,
        category_trends: cached.category_trends,
      };
    }

    // 2. Cache miss: Fetch expenses for this month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    let expensesQuery = supabaseClient
      .from('expenses')
      .select('expense_date, title, amount, category:categories(name)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (workspaceId) expensesQuery = expensesQuery.eq('workspace_id', workspaceId);
    if (familyId) expensesQuery = expensesQuery.eq('family_id', familyId);

    const { data: expenses = [] } = await expensesQuery;

    if (!expenses || expenses.length === 0) {
      return {
        summary: 'No expenses recorded for this period. Try adding expenses to unlock AI insights!',
        savings_opportunities: [],
        category_trends: [],
      };
    }

    // Format expenses for Gemini
    const listStr = expenses
      .map((e: any) => `- ${e.expense_date}: ${e.title} (Category: ${e.category?.name || 'Other'}) - ₹${e.amount}`)
      .join('\n');

    const prompt = `
You are a Staff Financial Analyst. Analyze the following list of user expenses for the month of ${month}/${year} and generate financial insights.

Expenses List:
${listStr}

Tasks:
1. Provide a concise, high-level summary of the spending habits this month.
2. Identify 2-3 specific savings opportunities (what can the user cut back on, estimated savings).
3. Analyze category trends (e.g. is Food spend going up compared to average, Utilities are high, etc.).
4. Format your output EXACTLY as a JSON object with these keys:
   - "summary": string (a paragraph of summary text)
   - "savings_opportunities": array of objects, where each object has:
     - "title": string
     - "description": string
     - "expected_saving": number (estimated amount in rupees)
   - "category_trends": array of objects, where each object has:
     - "category": string
     - "trend": string (must be either "up", "down", or "stable")
     - "explanation": string

Do not include markdown tags (like \`\`\`json) or extra text. Output only the pure JSON string.
`;

    const rawResult = await runGeminiPrompt(prompt);
    
    // Sanitize JSON
    let cleanJson = rawResult.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);
    
    // Save to database
    await supabaseClient.from('ai_monthly_insights').insert({
      user_id: userId,
      workspace_id: workspaceId || null,
      family_id: familyId || null,
      month,
      year,
      summary: parsed.summary,
      savings_opportunities: parsed.savings_opportunities || [],
      category_trends: parsed.category_trends || [],
    });

    return {
      summary: parsed.summary,
      savings_opportunities: parsed.savings_opportunities || [],
      category_trends: parsed.category_trends || [],
    };
  } catch (error) {
    console.error('Error generating monthly insights:', error);
    return {
      summary: 'Unable to analyze spending habits at this time. Please try again later.',
      savings_opportunities: [],
      category_trends: [],
    };
  }
}
