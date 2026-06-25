import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { runGeminiPrompt } from './gemini.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface BudgetRecommendation {
  categoryId: string;
  categoryName: string;
  currentLimit: number;
  averageSpend: number;
  recommendedLimit: number;
  reason: string;
}

/**
 * Generates budget limit recommendations based on historical spending averages
 */
export async function getBudgetRecommendations(
  supabaseClient: any,
  userId: string,
  workspaceId?: string | null
): Promise<BudgetRecommendation[]> {
  try {
    // 1. Fetch user's categories and current limits
    const { data: categories = [] } = await supabaseClient
      .from('categories')
      .select('id, name, monthly_limit')
      .eq('created_by', userId);

    if (!categories || categories.length === 0) {
      return [];
    }

    // 2. Fetch expenses from the last 90 days to calculate averages
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let expensesQuery = supabaseClient
      .from('expenses')
      .select('amount, category_id, expense_date')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('expense_date', ninetyDaysAgo.toISOString().split('T')[0]);

    if (workspaceId) expensesQuery = expensesQuery.eq('workspace_id', workspaceId);

    const { data: expenses = [] } = await expensesQuery;

    // 3. Compute 3-month averages per category
    const categoryMetrics: Record<string, { name: string; currentLimit: number; total: number }> = {};
    
    categories.forEach((cat) => {
      categoryMetrics[cat.id] = {
        name: cat.name,
        currentLimit: cat.monthly_limit || 0,
        total: 0,
      };
    });

    expenses?.forEach((exp) => {
      if (exp.category_id && categoryMetrics[exp.category_id]) {
        categoryMetrics[exp.category_id].total += Number(exp.amount);
      }
    });

    // Format analysis request for Gemini
    const categoriesArray = Object.entries(categoryMetrics).map(([id, metrics]) => {
      const avgMonthly = Math.round(metrics.total / 3);
      return {
        id,
        name: metrics.name,
        currentLimit: metrics.currentLimit,
        averageMonthlySpend: avgMonthly,
      };
    });

    if (categoriesArray.length === 0) return [];

    const prompt = `
You are an expert personal financial planner. Review the user's current categories, monthly spending limits, and their actual average monthly spending over the last 90 days. Recommend adjusted monthly limits.

Input Data:
${JSON.stringify(categoriesArray, null, 2)}

Rules for Recommendation:
1. If average spend is close to or exceeds the current limit, suggest raising it slightly to prevent constant alert fatigue, or suggest keeping it same with a note on discipline.
2. If average spend is far below the current limit (e.g. limit is ₹10,000 but they spend ₹2,000), suggest lowering it to set a more realistic budget target.
3. If no limit exists, suggest a starting limit based on average spend.
4. Output your response EXACTLY as a JSON array of recommendation objects, where each object contains:
   - "categoryId": string
   - "categoryName": string
   - "currentLimit": number
   - "averageSpend": number
   - "recommendedLimit": number
   - "reason": string (1-sentence reasoning)

Do not include markdown tags (like \`\`\`json) or extra text. Output only the pure JSON array.
`;

    const rawResult = await runGeminiPrompt(prompt);
    
    // Sanitize JSON
    let cleanJson = rawResult.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const recommendations = JSON.parse(cleanJson);
    return recommendations;
  } catch (error) {
    console.error('Error in getBudgetRecommendations:', error);
    return [];
  }
}
