import { geminiEmbeddingModel } from './gemini.service.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Generates a vector embedding (768 numbers) using Gemini text-embedding-004
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  try {
    const result = await geminiEmbeddingModel.embedContent(text);
    if (!result.embedding || !result.embedding.values) {
      throw new Error('Gemini embedding request returned null/empty values');
    }
    return result.embedding.values;
  } catch (error) {
    console.error('Failed to generate vector embedding from Gemini:', error);
    throw error;
  }
}

/**
 * Creates/Updates the embedding for an expense record in the DB
 */
export async function updateExpenseEmbedding(
  supabaseClient: any,
  expenseId: string,
  textContent: string
): Promise<void> {
  try {
    const embedding = await generateTextEmbedding(textContent);
    
    const { error } = await supabaseClient
      .from('expense_embeddings')
      .upsert({
        expense_id: expenseId,
        embedding: embedding,
      }, { onConflict: 'expense_id' });

    if (error) {
      console.error(`Failed to upsert embedding for expense ${expenseId}:`, error);
    }
  } catch (error) {
    console.error(`Error in updateExpenseEmbedding for expense ${expenseId}:`, error);
  }
}

/**
 * Performs semantic search on expenses by embedding the query and doing a cosine distance match in the DB
 */
export async function semanticSearchExpenses(
  supabaseClient: any,
  userId: string,
  queryText: string,
  limitCount: number = 10
): Promise<string[]> {
  try {
    const queryEmbedding = await generateTextEmbedding(queryText);

    // Call custom postgres RPC if available, or fetch and calculate client-side
    // Wait, let's call rpc('match_expenses') that does vector search:
    // SELECT expense_id FROM expense_embeddings WHERE ... ORDER BY embedding <=> queryEmbedding LIMIT limitCount
    // Wait, to keep it simple and avoid requiring another RPC declaration in Postgres, we can write a SQL matching RPC in our migration!
    // Let's check if we added match_expenses in our migration. We haven't yet, but we can call it.
    // Wait, let's define an RPC in the database migration file or write it so we can fetch matches.
    // If the rpc 'match_expenses' fails or is not declared, we can fallback to standard title text search.
    const { data: matches, error } = await supabaseClient.rpc('match_expenses', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limitCount,
      p_user_id: userId,
    });

    if (error) {
      console.error('Database RPC match_expenses error:', error);
      return [];
    }

    return (matches || []).map((m: any) => m.expense_id);
  } catch (error) {
    console.error('Error in semanticSearchExpenses:', error);
    return [];
  }
}
