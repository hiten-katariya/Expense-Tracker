import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { runGeminiPrompt } from './gemini.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  message: string;
}

/**
 * Fetches recent database context for the user to guide the AI assistant
 */
/**
 * Fetches recent database context for the user to guide the AI assistant
 */
async function fetchUserContextForChat(supabaseClient: any, userId: string): Promise<string> {
  try {
    // 1. Fetch user's active categories
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id, name, monthly_limit');

    // 2. Fetch user's recent expenses (last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: expenses } = await supabaseClient
      .from('expenses')
      .select('expense_date, title, amount, currency_code, payment_method, category:categories(name)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .gte('expense_date', sixtyDaysAgo.toISOString().split('T')[0])
      .order('expense_date', { ascending: false });

    // 3. Fetch user's active budgets
    const { data: budgets } = await supabaseClient
      .from('budgets')
      .select('amount, starts_on, ends_on, category:categories(name)')
      .eq('created_by', userId);

    // Format context strings
    const categoriesStr = categories
      ? categories.map((c: any) => `- ${c.name} (Limit: ${c.monthly_limit || 'None'})`).join('\n')
      : 'None';

    const expensesStr = expenses
      ? expenses
          .map(
            (e: any) =>
              `- ${e.expense_date}: ${e.title} - ₹${e.amount} (${e.category?.name || 'Uncategorized'}) via ${e.payment_method}`
          )
          .join('\n')
      : 'No recent expenses found.';

    const budgetsStr = budgets
      ? budgets.map((b: any) => `- Budget for ${b.category?.name || 'Overall'}: ₹${b.amount}`).join('\n')
      : 'No budgets defined.';

    return `
User Financial Context:
-----------------------
Categories:
${categoriesStr}

Budgets:
${budgetsStr}

Recent Transactions (last 60 days):
${expensesStr}
`;
  } catch (error) {
    console.error('Failed to load user financial context:', error);
    return 'No financial data context could be loaded.';
  }
}

/**
 * Handles AI chat queries using user context and chat history
 */
export async function getAIChatResponse(
  supabaseClient: any,
  userId: string,
  userMessage: string,
  history: ChatMessage[] = []
): Promise<string> {
  // 1. Fetch context
  const context = await fetchUserContextForChat(supabaseClient, userId);

  // 2. Format chat history
  const formattedHistory = history
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.message}`)
    .join('\n');

  // 3. Build prompt
  const prompt = `
You are "Antigravity AI", a premium, friendly personal finance assistant integrated inside the Expense Tracker application.
Your goal is to answer the user's questions about their expenses, budgets, reports, trends, merchants, and categories using ONLY their provided data.

${context}

Rules:
1. Speak professionally, concisely, and supportively.
2. Only reference facts present in the financial data above.
3. If the user asks about something not present, explain that you don't have access to that information.
4. Keep answers short and visual (use bullet points or lists for amounts).
5. Address the user directly.

Conversation History:
${formattedHistory}
User: ${userMessage}
Assistant:`;

  try {
    const aiResponse = await runGeminiPrompt(prompt);
    
    // Save to DB chat history
    await supabaseClient.from('ai_chat_history').insert([
      { user_id: userId, role: 'user', message: userMessage },
      { user_id: userId, role: 'assistant', message: aiResponse },
    ]);

    return aiResponse;
  } catch (error) {
    console.error('Error in getAIChatResponse:', error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.";
  }
}
