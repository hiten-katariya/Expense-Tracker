import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { runGeminiPrompt } from './gemini.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AnomalyCheckResult {
  isAnomaly: boolean;
  reason: string | null;
  score: number; // 0 to 100
}

/**
 * Checks a new transaction for anomalies using statistical rules, then explains them via Gemini.
 */
export async function detectExpenseAnomaly(
  supabaseClient: any,
  userId: string,
  amount: number,
  categoryName: string,
  merchant: string,
  paymentMethod: string,
  workspaceId?: string | null
): Promise<AnomalyCheckResult> {
  try {
    // 1. Fetch user's category-specific historical expenses to calculate mean and standard deviation
    let query = supabaseClient
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (workspaceId) query = query.eq('workspace_id', workspaceId);

    const { data: history = [] } = await query;
    if (!history || history.length < 5) {
      // Not enough data points to establish a statistical model
      return { isAnomaly: false, reason: null, score: 0 };
    }

    const amounts = history.map((e) => Number(e.amount));
    const count = amounts.length;
    const mean = amounts.reduce((sum, val) => sum + val, 0) / count;
    
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    // Rule-based anomaly threshold: standard deviation multiplier (e.g. 2.5)
    // Or if the amount is simply 5x larger than the average
    const zScore = stdDev > 0 ? (amount - mean) / stdDev : 0;
    const ruleFlagged = zScore > 2.5 || (mean > 0 && amount > mean * 5);

    if (!ruleFlagged) {
      return { isAnomaly: false, reason: null, score: Math.min(Math.round(zScore * 20), 40) };
    }

    // 2. If rule-flagged, use Gemini to explain the anomaly and write a helpful summary
    const prompt = `
You are a Financial Risk Auditor. A new transaction has triggered a budget warning because it is statistically much larger than the user's typical transactions.

Transaction Details:
- Amount: ₹${amount}
- Category: ${categoryName}
- Merchant: ${merchant || 'N/A'}
- Payment Method: ${paymentMethod}

Historical Reference Metrics:
- User's average transaction size: ₹${Math.round(mean)}
- Standard Deviation: ₹${Math.round(stdDev)}
- Z-Score of this transaction: ${zScore.toFixed(2)}

Task:
Write a brief, helpful explanation of why this transaction is marked as an anomaly (e.g., "This transaction is 5 times higher than your average spend on ${categoryName}"). Also, provide 1 actionable warning or question the user can ask themselves about this.

Output your response EXACTLY as a JSON object with these keys:
- "is_anomaly": boolean (should be true)
- "explanation": string (1-2 sentences explaining why and giving a warning tip)
- "severity_score": number (integer between 50 and 100 representing how severe the spike is)

Do not include markdown tags or extra text. Output only the pure JSON string.
`;

    const rawResult = await runGeminiPrompt(prompt);
    
    // Sanitize JSON
    let cleanJson = rawResult.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson);

    return {
      isAnomaly: parsed.is_anomaly || true,
      reason: parsed.explanation || `This expense of ₹${amount} is significantly higher than your typical average of ₹${Math.round(mean)}.`,
      score: typeof parsed.severity_score === 'number' ? parsed.severity_score : 80,
    };
  } catch (error) {
    console.error('Error in detectExpenseAnomaly:', error);
    return { isAnomaly: false, reason: null, score: 0 };
  }
}
